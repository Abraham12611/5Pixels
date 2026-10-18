-- #183 — convert the prompt guard on create_generation to an explicit,
-- disabled-by-default DB rollout gate that ordinary database roles cannot
-- influence.
--
-- #176's review added two fail-closed guards to the five-arg
-- create_generation: multi-image rejected until #179 wires the provider
-- pipeline, and custom prompts rejected until #183's application-side
-- validation/normalization/moderation/composition landed. This migration
-- keeps BOTH guards but makes the prompt guard conditional on a protected
-- release_gates row so production stays locked until approval:
--
--   * Default:  release_gates('preset_user_prompt').enabled = FALSE ->
--     guard ACTIVE. Direct-RPC prompt submissions are still rejected,
--     matching the app-level PRESET_USER_PROMPT_ENABLED release flag.
--   * Opt-in:   a privileged writer (migration / owner-level role) sets
--     the row to TRUE. RLS has no policies and all privileges are revoked
--     from PUBLIC/anon/authenticated, so no request-scoped role can read
--     or flip it — enablement is a deploy-level action, not a runtime
--     toggle a session can SET.
--
-- The rest of the function is byte-identical to the committed #176
-- definition (20261028000001): role-bound quote params, credit
-- reservation, idempotency, ownership checks, and the multi-image guard
-- are all preserved.

-- Protected rollout-gate table. No policies + revoked grants: writes (and
-- reads) are impossible for every request-scoped role. Only a migration
-- or owner-level SQL can enable a gate.
CREATE TABLE IF NOT EXISTS public.release_gates (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.release_gates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.release_gates FROM PUBLIC, anon, authenticated;

INSERT INTO public.release_gates (key, enabled)
VALUES ('preset_user_prompt', FALSE)
ON CONFLICT (key) DO NOTHING;

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

    SELECT a.owner_user_id, a.bucket INTO v_source_owner, v_source_bucket
    FROM public.assets a
    WHERE a.id = v_asset_id;
    IF v_source_owner IS NULL
       OR v_source_owner <> v_user_id
       OR v_source_bucket <> 'user-assets' THEN
      RAISE EXCEPTION 'Invalid source asset' USING ERRCODE = 'P0001';
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

  -- Fail-closed guards (#176 review): requests that are contractually
  -- valid but functionally incomplete are rejected BEFORE any generation
  -- row or credit reservation is created — including for direct RPC
  -- callers that bypass the application layer. The multi-image raise is
  -- owned by #179; the prompt raise is now gated by #183 (below).
  IF v_input_count > 1 THEN
    RAISE EXCEPTION 'Multi-image generation is not yet enabled'
      USING ERRCODE = 'P0001';
  END IF;
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
