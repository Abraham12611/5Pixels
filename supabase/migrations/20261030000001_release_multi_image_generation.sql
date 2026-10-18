-- #179 — release the multi-image fail-closed guard inside create_generation
-- now that the application pipeline validates, moderates, signs and
-- transmits every requested user image in its declared order/role.
--
-- This migration is deliberately narrow:
--
--   * The #183/#189 custom-prompt protection is PRESERVED: the guarded
--     release_gates('preset_user_prompt') check, the protected table, and
--     every piece of prompt validation remain byte-identical to the
--     merged #189 definition (20261029000001).
--   * Only the temporary `Multi-image generation is not yet enabled` raise
--     is removed. Ordered input/role quote binding, ownership, duplicate,
--     count, version-pin, idempotency, atomic credit reservation and
--     refund/failure behavior are unchanged.
--   * A NEW input-side gate replaces the guard as the durable protection:
--     every input asset must carry moderation_status = 'approved' — the
--     verified record of a completed image review — before a generation
--     row or credit reservation can exist. The application screens each
--     pending image through the image classifier and stamps the verdict
--     before quoting; text moderation can never attest to image content.
--   * prevent_asset_moderation_escalation() makes that approval record
--     trustworthy: request-scoped roles (anon/authenticated/anything
--     unexpected) cannot set moderation_status or moderation_object_version
--     on INSERT and cannot change either on UPDATE. Only the service role
--     (app-side verdicts), admins, and privileged/migration contexts
--     (auth.role() NULL off-PostgREST) may — an explicit allowlist, never
--     a "not authenticated" test.
--   * The approval is bound to the exact object that was screened:
--     assets.moderation_object_version records storage.objects.version at
--     approval time, prevent_approved_asset_content_overwrite makes the
--     bytes behind an 'approved' asset immutable for EVERY role, and
--     create_generation re-verifies the stored version against the live
--     object — a swapped file can never ride a stale approval.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS moderation_object_version TEXT;

-- Review-record writer allowlist: service role (app moderation verdicts),
-- admins, and non-PostgREST privileged contexts (auth.role() is NULL for
-- migrations/owner SQL). 'authenticated', 'anon', and any future or
-- unexpected role fall through to enforcement — never treated as trusted.
CREATE OR REPLACE FUNCTION public.prevent_asset_moderation_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.is_admin()
     OR auth.role() IS NULL
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.moderation_status, 'pending') <> 'pending'
       OR NEW.moderation_object_version IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot set asset moderation status'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     OR NEW.moderation_object_version IS DISTINCT FROM OLD.moderation_object_version THEN
    RAISE EXCEPTION 'Cannot change asset moderation status'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_asset_moderation_escalation ON public.assets;
CREATE TRIGGER prevent_asset_moderation_escalation
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_asset_moderation_escalation();

-- Content immutability for approved inputs: storage.objects.version bumps
-- on every content overwrite (downloads only touch last_accessed_at — they
-- do not fire this). If a user-assets object backs an 'approved' asset
-- row, replacing or re-inserting its bytes is refused outright — for every
-- role, service included — so the bytes the classifier approved are the
-- bytes the provider later fetches. Pending assets can still be
-- overwritten, preserving signed-upload retries to the same path.
CREATE OR REPLACE FUNCTION public.prevent_approved_asset_content_overwrite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (TG_OP = 'INSERT'
        AND EXISTS (
          SELECT 1 FROM public.assets a
          WHERE a.bucket = NEW.bucket_id
            AND a.storage_key = NEW.name
            AND a.moderation_status = 'approved'))
     OR (TG_OP = 'UPDATE'
        AND NEW.version IS DISTINCT FROM OLD.version
        AND EXISTS (
          SELECT 1 FROM public.assets a
          WHERE a.bucket = OLD.bucket_id
            AND a.storage_key = OLD.name
            AND a.moderation_status = 'approved')) THEN
    RAISE EXCEPTION 'Approved image content is immutable'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_approved_asset_content_overwrite ON storage.objects;
CREATE TRIGGER prevent_approved_asset_content_overwrite
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_approved_asset_content_overwrite();

-- Service-only read of the live object version behind an asset row. The
-- app brackets each image screen with before/after reads of this value (a
-- mid-screen overwrite moves the version and discards the verdict) and
-- stamps it as moderation_object_version on approval.
CREATE OR REPLACE FUNCTION public.asset_object_version(
  p_bucket TEXT,
  p_name TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.version
  FROM storage.objects o
  WHERE o.bucket_id = p_bucket AND o.name = p_name;
$$;

REVOKE ALL ON FUNCTION public.asset_object_version(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.asset_object_version(TEXT, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.create_generation(
  p_quote_id UUID,
  p_input_assets JSONB,
  p_options JSONB,
  p_user_prompt TEXT,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  generation_id UUID,
  status TEXT,
  processing_token TEXT,
  balance_after NUMERIC(12,4),
  credit_cost NUMERIC(12,4),
  provider_endpoint TEXT,
  output_width INT,
  output_height INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quote RECORD;
  v_existing_id UUID;
  v_existing_status TEXT;
  v_existing_cost NUMERIC(12,4);
  v_source_owner UUID;
  v_source_bucket TEXT;
  v_source_key TEXT;
  v_source_moderation TEXT;
  v_source_version TEXT;
  v_available NUMERIC(12,4);
  v_token TEXT;
  v_token_hash TEXT;
  v_validation_error TEXT;
  v_generation_id UUID;
  v_cap RECORD;
  v_elem RECORD;
  v_asset_id UUID;
  v_role TEXT;
  v_input_ids UUID[] := '{}';
  v_input_roles TEXT[] := '{}';
  v_input_count INT;
  v_prompt_text TEXT;
  v_prompt_sha TEXT;
  v_quoted_ids UUID[];
  v_quoted_roles TEXT[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Invalid idempotency key' USING ERRCODE = 'P0001';
  END IF;

  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'object' OR pg_column_size(p_options) > 16384 THEN
    RAISE EXCEPTION 'Invalid generation options' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0));

  -- Idempotency: return the existing generation without charging again.
  SELECT g.id, g.status, g.credit_cost
    INTO v_existing_id, v_existing_status, v_existing_cost
  FROM public.generations g
  WHERE g.user_id = v_user_id AND g.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    generation_id := v_existing_id;
    status := v_existing_status;
    processing_token := NULL;
    balance_after := (
      SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
      FROM public.credit_ledger
      WHERE user_id = v_user_id
    );
    credit_cost := COALESCE(v_existing_cost, 0);
    provider_endpoint := NULL;
    output_width := NULL;
    output_height := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Load and lock the quote. It must belong to the caller, be fresh, and be
  -- unconsumed — a quote is single-use and short-lived by design.
  SELECT * INTO v_quote
  FROM public.generation_quotes q
  WHERE q.id = p_quote_id
    AND q.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid generation quote' USING ERRCODE = 'P0001';
  END IF;
  IF v_quote.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Quote already used' USING ERRCODE = 'P0001';
  END IF;
  IF v_quote.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Quote expired' USING ERRCODE = 'P0001';
  END IF;

  -- The options submitted now must be the options that were priced.
  IF v_quote.options_fingerprint <>
     encode(extensions.digest(p_options::text::bytea, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'Quote does not match request' USING ERRCODE = 'P0001';
  END IF;

  -- --- Input set -----------------------------------------------------------
  -- Ordered [{"asset_id": uuid, "role": text?}]; every asset must be owned by
  -- the caller and live in user-assets, identical to the legacy single-asset
  -- check. Duplicate asset ids are rejected.
  IF p_input_assets IS NULL
     OR jsonb_typeof(p_input_assets) <> 'array' THEN
    RAISE EXCEPTION 'Invalid generation inputs' USING ERRCODE = 'P0001';
  END IF;
  v_input_count := jsonb_array_length(p_input_assets);
  IF v_input_count < 1 OR v_input_count > 8 THEN
    RAISE EXCEPTION 'Invalid generation inputs' USING ERRCODE = 'P0001';
  END IF;

  FOR v_elem IN
    SELECT e.value, e.ordinality
    FROM jsonb_array_elements(p_input_assets) WITH ORDINALITY AS e(value, ordinality)
  LOOP
    IF jsonb_typeof(v_elem.value) <> 'object'
       OR v_elem.value->>'asset_id' IS NULL
       OR v_elem.value->>'asset_id' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RAISE EXCEPTION 'Invalid generation inputs' USING ERRCODE = 'P0001';
    END IF;
    v_asset_id := (v_elem.value->>'asset_id')::UUID;
    v_role := v_elem.value->>'role';
    IF v_role IS NOT NULL AND v_role !~ '^[a-z0-9_]{1,32}$' THEN
      RAISE EXCEPTION 'Invalid input role' USING ERRCODE = 'P0001';
    END IF;
    IF v_asset_id = ANY(v_input_ids) THEN
      RAISE EXCEPTION 'Duplicate input asset' USING ERRCODE = 'P0001';
    END IF;

    SELECT a.owner_user_id, a.bucket, a.storage_key,
           a.moderation_status, a.moderation_object_version
      INTO v_source_owner, v_source_bucket, v_source_key,
           v_source_moderation, v_source_version
    FROM public.assets a
    WHERE a.id = v_asset_id;
    IF v_source_owner IS NULL
       OR v_source_owner <> v_user_id
       OR v_source_bucket <> 'user-assets' THEN
      RAISE EXCEPTION 'Invalid source asset' USING ERRCODE = 'P0001';
    END IF;
    -- Verified image approval (#179): 'approved' is the durable record of a
    -- completed image-classifier review, writable only by the service role,
    -- admins, or migrations (prevent_asset_moderation_escalation). A
    -- pending, flagged, rejected or otherwise unreviewed image can never
    -- reach quoting/transmission through this function — the app screens
    -- and stamps the verdict first, and a direct-RPC caller cannot mint an
    -- approval.
    IF v_source_moderation IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'Source image has not passed content review'
        USING ERRCODE = 'P0001';
    END IF;
    -- Content binding (#179): the approval was stamped against an exact
    -- storage.objects.version; the live object must still be that version
    -- (prevent_approved_asset_content_overwrite makes post-approval
    -- replacement impossible, so a mismatch means tampered/incomplete
    -- bookkeeping — fail closed).
    IF v_source_version IS NULL OR NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = v_source_bucket
        AND o.name = v_source_key
        AND o.version = v_source_version
    ) THEN
      RAISE EXCEPTION 'Source image has not passed content review'
        USING ERRCODE = 'P0001';
    END IF;

    v_input_ids := v_input_ids || v_asset_id;
    v_input_roles := v_input_roles || v_role;
  END LOOP;

  -- Capability is pinned on the quoted product version.
  SELECT v.input_mode, v.input_min_images, v.input_max_images,
         v.input_image_roles, v.prompt_override_enabled, v.prompt_max_chars
    INTO v_cap
  FROM public.product_versions v
  WHERE v.id = v_quote.product_version_id;

  IF v_input_count < COALESCE(v_cap.input_min_images, 1)
     OR v_input_count > COALESCE(v_cap.input_max_images, 1) THEN
    RAISE EXCEPTION 'Input image count is not allowed for this preset'
      USING ERRCODE = 'P0001';
  END IF;

  -- Roles must be declared by the pinned version; non-optional declared roles
  -- must all be supplied.
  IF EXISTS (
    SELECT 1 FROM unnest(v_input_roles) AS r(role)
    WHERE r.role IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_cap.input_image_roles, '[]'::JSONB)) AS ro
        WHERE ro->>'name' = r.role
      )
  ) THEN
    RAISE EXCEPTION 'Input role is not declared by this preset'
      USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(v_cap.input_image_roles, '[]'::JSONB)) AS ro
    WHERE COALESCE((ro->>'optional')::BOOLEAN, FALSE) = FALSE
      AND NOT (ro->>'name' = ANY (v_input_roles))
  ) THEN
    RAISE EXCEPTION 'A required image slot is missing' USING ERRCODE = 'P0001';
  END IF;

  -- User prompt: normalized (trimmed) text is what the quote hashes and what
  -- is stored. Rejected outright unless the pinned version opted in.
  v_prompt_text := NULLIF(btrim(p_user_prompt), '');
  v_prompt_sha := CASE WHEN v_prompt_text IS NULL THEN NULL
    ELSE encode(extensions.digest(v_prompt_text::bytea, 'sha256'), 'hex') END;

  IF v_prompt_sha IS NOT NULL AND (
    NOT COALESCE(v_cap.prompt_override_enabled, FALSE)
    OR length(v_prompt_text) > COALESCE(v_cap.prompt_max_chars, 0)
  ) THEN
    RAISE EXCEPTION 'Custom prompts are not enabled for this preset'
      USING ERRCODE = 'P0001';
  END IF;

  -- Quote binding for new-style quotes: the exact ordered input ids and the
  -- prompt hash were priced into the quote; substitution or replay with
  -- different inputs/prompt fails. Legacy quotes (created before
  -- input_asset_ids existed) keep the original single-asset contract.
  IF v_quote.params ? 'input_asset_ids' THEN
    SELECT array_agg(t.v::UUID ORDER BY t.ord) INTO v_quoted_ids
    FROM jsonb_array_elements_text(v_quote.params->'input_asset_ids')
      WITH ORDINALITY AS t(v, ord);
    IF v_quoted_ids IS DISTINCT FROM v_input_ids THEN
      RAISE EXCEPTION 'Quote does not match request' USING ERRCODE = 'P0001';
    END IF;
    -- Ordered role assignments are part of the quoted request: the same
    -- asset ids with swapped roles (subject ↔ reference) produce a
    -- materially different generation, so they must reprice.
    IF jsonb_typeof(v_quote.params->'input_roles') = 'array' THEN
      SELECT array_agg(t.v ORDER BY t.ord) INTO v_quoted_roles
      FROM jsonb_array_elements_text(v_quote.params->'input_roles')
        WITH ORDINALITY AS t(v, ord);
      IF v_quoted_roles IS DISTINCT FROM v_input_roles THEN
        RAISE EXCEPTION 'Quote does not match request' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    IF (v_quote.params->>'prompt_hash') IS DISTINCT FROM v_prompt_sha THEN
      RAISE EXCEPTION 'Quote does not match request' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_input_count <> 1 OR v_prompt_sha IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid generation inputs' USING ERRCODE = 'P0001';
  END IF;

  -- #179 released the temporary multi-image raise that stood here once the
  -- application pipeline validated, moderated and transmitted the full
  -- ordered input set; the input-approval check above is the durable gate.
  -- DB rollout gate (#183): the prompt guard stays ON by default until
  -- Bachs/merchant approval, the #172 policy update, and the owner release
  -- decision land. The gate row in public.release_gates is writable only
  -- by a privileged/migration-level role — request-scoped roles (anon,
  -- authenticated) hold no privileges on the table, and a missing row
  -- fails closed.
  IF v_prompt_sha IS NOT NULL
     AND NOT COALESCE(
       (SELECT rg.enabled
          FROM public.release_gates rg
         WHERE rg.key = 'preset_user_prompt'),
       FALSE
     ) THEN
    RAISE EXCEPTION 'Custom prompts are not yet enabled'
      USING ERRCODE = 'P0001';
  END IF;

  -- Validate options against active product_fields.
  v_validation_error := public.validate_generation_options(v_quote.product_id, p_options);
  IF v_validation_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_validation_error USING ERRCODE = 'P0001';
  END IF;

  -- Availability = full ledger sum (reservations are negative holds).
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4) INTO v_available
  FROM public.credit_ledger
  WHERE user_id = v_user_id;

  IF v_available < v_quote.reserve_credits THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'P0001';
  END IF;

  -- One-time processing token returned only on creation.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token::bytea, 'sha256'), 'hex');

  INSERT INTO public.generations (
    user_id,
    product_id,
    product_version_id,
    source_asset_id,
    status,
    requested_options,
    compiled_request_fingerprint,
    idempotency_key,
    processing_token_hash,
    credit_cost,
    actual_credit_cost,
    quote_id,
    quote_expected_cost_usd,
    quote_max_cost_usd,
    provider_cost_usd,
    user_prompt,
    user_prompt_sha256
  )
  VALUES (
    v_user_id,
    v_quote.product_id,
    v_quote.product_version_id,
    v_input_ids[1],
    'created',
    p_options,
    encode(extensions.digest(p_options::text::bytea, 'sha256'), 'hex'),
    p_idempotency_key,
    v_token_hash,
    v_quote.reserve_credits,
    NULL,
    v_quote.id,
    v_quote.expected_cost_usd,
    v_quote.maximum_cost_usd,
    v_quote.expected_cost_usd,
    v_prompt_text,
    v_prompt_sha
  )
  RETURNING id INTO v_generation_id;

  -- Immutable ordered input mapping (integrity trigger validates version pin
  -- and declared roles).
  INSERT INTO public.generation_input_assets (
    generation_id, ordinal, asset_id, role, product_version_id
  )
  SELECT
    v_generation_id,
    t.ord,
    t.asset,
    t.role,
    v_quote.product_version_id
  FROM unnest(v_input_ids, v_input_roles) WITH ORDINALITY AS t(asset, role, ord);

  IF v_quote.reserve_credits > 0 THEN
    INSERT INTO public.credit_ledger (
      user_id,
      entry_type,
      amount,
      generation_id,
      idempotency_key,
      metadata
    ) VALUES (
      v_user_id,
      'reservation',
      -v_quote.reserve_credits,
      v_generation_id,
      'reserve:' || p_idempotency_key,
      jsonb_build_object(
        'quote_id', v_quote.id,
        'product_id', v_quote.product_id,
        'product_version_id', v_quote.product_version_id,
        'provider_endpoint', v_quote.endpoint_id,
        'pricing_snapshot_id', v_quote.pricing_snapshot_id,
        'policy_version', v_quote.policy_version,
        'expected_cost_usd', v_quote.expected_cost_usd,
        'maximum_cost_usd', v_quote.maximum_cost_usd,
        'input_count', v_input_count
      )
    );
  END IF;

  UPDATE public.generation_quotes
  SET consumed_at = NOW(), generation_id = v_generation_id
  WHERE id = v_quote.id;

  UPDATE public.provider_endpoint_state
  SET last_seen_at = NOW()
  WHERE provider = v_quote.provider AND endpoint_id = v_quote.endpoint_id;

  generation_id := v_generation_id;
  status := 'created';
  processing_token := v_token;
  balance_after := (
    SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
    FROM public.credit_ledger
    WHERE user_id = v_user_id
  );
  credit_cost := v_quote.reserve_credits;
  provider_endpoint := v_quote.endpoint_id;
  output_width := (v_quote.params->>'width')::INT;
  output_height := (v_quote.params->>'height')::INT;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation(UUID, JSONB, JSONB, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_generation(UUID, JSONB, JSONB, TEXT, TEXT)
  TO authenticated;
