-- ============================================================================
-- Preset Factory write-approval intents (#271, epic #270) — coordinator rev3.
--
-- A dedicated, tamper-resistant store for owner approvals of MCP-origin
-- writes. Previously Engineer B staged approvals as rows in
-- admin_audit_logs — that table is admin-mutable (FOR ALL is_admin()),
-- its consume update was not atomic with the write, and it doubles as the
-- audit trail. This migration replaces that with an isolated store whose
-- only mutations are atomic SECURITY DEFINER transitions.
--
-- Boundary decision (coordinated on #272): a Supabase OAuth-server-issued
-- access token carries a `client_id` claim; ordinary web/session tokens do
-- not. admin_create_preset_draft therefore requires an approved write
-- intent whenever the calling JWT is OAuth-issued — i.e. every connector
-- write — while the web admin path (no client_id claim) is unchanged and
-- ordinary admin creation is not affected. Categories are NOT DB-gated:
-- the existing categories_admin FOR ALL is_admin() policy already permits
-- direct inserts by any admin, so gating our path would not actually
-- restrict OAuth writes there; category approval stays a tool-level gate
-- (same intent store, consumed by B's adapter).
--
-- Repo-only per the manual-testing policy — not applied to hosted Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Intent store
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.preset_factory_write_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The admin who staged the request AND the only identity allowed to
  -- approve or consume it.
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id),
  operation TEXT NOT NULL CHECK (
    operation IN ('create_draft_batch', 'create_categories')
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'consumed', 'cancelled', 'expired')
  ),
  -- Canonical digest of the whole staged payload, computed inside
  -- admin_stage_write_intent — shown to the approver for cross-checking.
  payload_digest TEXT NOT NULL,
  -- Per-write-unit fingerprints, also SQL-computed at stage time. For
  -- create_draft_batch each element is the same canonical SHA-256
  -- admin_create_preset_draft derives from its five jsonb arguments, so an
  -- approved fingerprint can only ever be claimed by that exact payload.
  item_fingerprints TEXT[] NOT NULL DEFAULT '{}',
  consumed_fingerprints TEXT[] NOT NULL DEFAULT '{}',
  -- Owner-facing summary DERIVED at stage time from p_items (safe
  -- identity/settings projection only) — the approver sees a projection
  -- of the exact payload the fingerprints cover, never a caller-written
  -- description, and private recipe text is never stored here.
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- OAuth client that staged the intent. admin_consume_write_intent
  -- binds it: an intent staged under one client_id can only be consumed
  -- by a token carrying the same claim.
  client_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_write_intents_admin_status
  ON public.preset_factory_write_intents(admin_user_id, status);

ALTER TABLE public.preset_factory_write_intents ENABLE ROW LEVEL SECURITY;

-- Caller-bound read only: an admin sees their own intents (needed by the
-- MCP adapter to return the approval URL and by the approval page to
-- render the staged preview). ALL writes go through the definer RPCs —
-- there is deliberately no insert/update/delete policy for any role.
CREATE POLICY "preset_factory_write_intents_owner_select"
  ON public.preset_factory_write_intents
  FOR SELECT USING (
    admin_user_id = auth.uid()
    AND (public.is_admin() OR public.is_owner())
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.preset_factory_write_intents FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Stage — record a pending intent (OAuth callers allowed; that is the
--    whole point of the connector flow).
-- ---------------------------------------------------------------------------

-- p_items: one canonical payload object per write unit (1..25, ≤256 KiB).
-- For create_draft_batch each element is {product, metadata, version,
-- fields, asset_links} — the same flattened objects the service passes as
-- the draft RPC's five jsonb arguments, fingerprinted here with the
-- identical canonical SHA-256 expression. For create_categories each
-- element is {name, slug, description, sort_order}.
--
-- The owner-visible preview is DERIVED HERE from p_items — a caller can
-- never describe one payload and stage another. Fingerprints and digest
-- are likewise computed in SQL, never taken from the caller.
CREATE OR REPLACE FUNCTION public.admin_stage_write_intent(
  p_operation TEXT,
  p_items JSONB,
  p_ttl_seconds INT DEFAULT 900
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_id UUID;
  v_expires TIMESTAMPTZ;
  v_fingerprints TEXT[];
  v_digest TEXT;
  v_preview JSONB;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;
  IF p_operation NOT IN ('create_draft_batch', 'create_categories') THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: unknown approval operation %', p_operation;
  END IF;
  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: intent must cover at least one item';
  END IF;
  -- Same ceiling as a batch write, and a hard byte cap so a direct-RPC
  -- caller cannot store unbounded intents.
  IF jsonb_array_length(p_items) > 25 THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: intent may cover at most 25 items';
  END IF;
  IF octet_length(p_items::text) > 262144 THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: staged payload exceeds the 256 KiB limit';
  END IF;

  IF p_operation = 'create_draft_batch' THEN
    -- Identical to v_fingerprint in admin_create_preset_draft: SHA-256
    -- over the five jsonb arguments' normalized text, chr(31)-separated.
    SELECT array_agg(
      encode(extensions.digest(
        concat_ws(chr(31),
          (e->'product')::text,
          COALESCE(e->'metadata', '{}'::jsonb)::text,
          (e->'version')::text,
          COALESCE(e->'fields', '[]'::jsonb)::text,
          COALESCE(e->'asset_links', '[]'::jsonb)::text
        )::bytea, 'sha256'), 'hex')
      ORDER BY ord
    ) INTO v_fingerprints
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, ord);

    -- Safe identity/settings projection only — recipe fields
    -- (private_instruction_template, private_negative_instruction,
    -- model_config, field copy, asset payloads) are never selected.
    SELECT jsonb_build_object(
      'operation', p_operation,
      'total_items', count(*),
      'items', jsonb_agg(
        jsonb_build_object(
          'slug', e->'product'->>'slug',
          'name', e->'product'->>'name',
          'type', e->'product'->>'type',
          'short_description', e->'product'->>'short_description',
          'category_id', e->'product'->>'category_id',
          'parent_preset_id', e->'product'->>'parent_preset_id',
          'variant_display_name', e->'product'->>'variant_display_name',
          'visibility', COALESCE(e->'product'->>'visibility', 'public'),
          'standalone_discoverable',
            COALESCE((e->'product'->>'standalone_discoverable')::BOOLEAN, FALSE),
          'featured_rank', NULLIF(e->'product'->>'featured_rank', '')::INT,
          'style_archetype',
            e->'metadata'->'filter_config'->>'style_archetype',
          'identity_preservation',
            e->'metadata'->'filter_config'->>'identity_preservation',
          'layout_template',
            e->'metadata'->'poster_config'->>'layout_template',
          'provider', e->'version'->'provider_strategy'->>'primary_provider',
          'model', e->'version'->'provider_strategy'->>'primary_model',
          'input_mode', e->'version'->>'input_mode',
          'input_image_range', concat_ws('–',
            e->'version'->>'input_min_images',
            e->'version'->>'input_max_images'),
          'safety', jsonb_build_object(
            'allowed_nsfw', e->'version'->'safety_config'->'allowed_nsfw',
            'block_public_figures',
              e->'version'->'safety_config'->'block_public_figures',
            'block_minors', e->'version'->'safety_config'->'block_minors',
            'policy_version', e->'version'->'safety_config'->>'policy_version'
          ),
          'post_process', jsonb_build_object(
            'format', e->'version'->'post_process_config'->>'format',
            'quality', e->'version'->'post_process_config'->'quality',
            'crop', e->'version'->'post_process_config'->'crop'
          ),
          'credit_cost', NULLIF(e->'version'->>'credit_cost', '')::INT,
          -- JSON null is not SQL NULL — COALESCE alone would emit 'null'.
          -- The approval UI assumes an array; normalize anything else.
          'output_sizes', CASE
            WHEN jsonb_typeof(e->'version'->'output_sizes') = 'array'
            THEN e->'version'->'output_sizes'
            ELSE '[]'::jsonb
          END,
          'field_count', CASE
            WHEN jsonb_typeof(e->'fields') = 'array'
            THEN jsonb_array_length(e->'fields')
            ELSE 0
          END,
          'asset_link_count', CASE
            WHEN jsonb_typeof(e->'asset_links') = 'array'
            THEN jsonb_array_length(e->'asset_links')
            ELSE 0
          END
        )
        ORDER BY ord
      )
    ) INTO v_preview
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, ord);
  ELSE
    SELECT array_agg(
      encode(extensions.digest(e::text::bytea, 'sha256'), 'hex')
      ORDER BY ord
    ) INTO v_fingerprints
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, ord);

    SELECT jsonb_build_object(
      'operation', p_operation,
      'total_items', count(*),
      'categories', jsonb_agg(
        jsonb_build_object(
          'name', e->>'name',
          'slug', e->>'slug',
          'description', e->>'description',
          'sort_order', COALESCE((e->>'sort_order')::INT, 0)
        )
        ORDER BY ord
      )
    ) INTO v_preview
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, ord);
  END IF;

  -- Identical staged items produce identical fingerprints; duplicates
  -- would make the intent un-consumable (consumed count can never reach
  -- total) and let one approval line hide a second write.
  IF (SELECT count(DISTINCT f) FROM unnest(v_fingerprints) AS f)
     <> cardinality(v_fingerprints) THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: duplicate staged items are not allowed';
  END IF;

  v_digest := encode(
    extensions.digest(p_items::text::bytea, 'sha256'), 'hex'
  );

  v_expires := NOW() + make_interval(
    secs => GREATEST(60, LEAST(COALESCE(p_ttl_seconds, 900), 3600))
  );

  INSERT INTO public.preset_factory_write_intents (
    admin_user_id, operation, payload_digest, item_fingerprints,
    preview, client_id, expires_at
  ) VALUES (
    v_user_id, p_operation, v_digest, v_fingerprints,
    v_preview,
    (SELECT auth.jwt() ->> 'client_id'),
    v_expires
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'intent_id', v_id,
    'status', 'pending',
    'digest', v_digest,
    'preview', v_preview,
    'item_fingerprints', to_jsonb(v_fingerprints),
    'expires_at', v_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_stage_write_intent(
  TEXT, JSONB, INT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stage_write_intent(
  TEXT, JSONB, INT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Approve — pending → approved, atomically. OAuth-issued tokens are
--    refused: approval must come from a non-connector session (the admin
--    UI). Otherwise a stolen connector token could self-approve.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_approve_write_intent(
  p_intent_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_intent public.preset_factory_write_intents;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;
  -- Approval must originate outside the connector channel.
  IF (SELECT auth.jwt() ->> 'client_id') IS NOT NULL THEN
    RAISE EXCEPTION
      'PF_APPROVAL_INVALID: write intents must be approved from the admin UI, not an OAuth client token';
  END IF;

  -- Atomic transition: one pending → approved claim, caller-bound.
  UPDATE public.preset_factory_write_intents
  SET status = 'approved', approved_at = NOW()
  WHERE id = p_intent_id
    AND admin_user_id = v_user_id
    AND status = 'pending'
    AND expires_at > NOW()
  RETURNING * INTO v_intent;

  IF NOT FOUND THEN
    SELECT * INTO v_intent
    FROM public.preset_factory_write_intents
    WHERE id = p_intent_id AND admin_user_id = v_user_id;
    IF v_intent.id IS NULL THEN
      RAISE EXCEPTION 'PF_APPROVAL_INVALID: intent not found';
    ELSIF v_intent.expires_at <= NOW() THEN
      RAISE EXCEPTION 'PF_APPROVAL_EXPIRED: intent expired before approval';
    ELSE
      RAISE EXCEPTION
        'PF_APPROVAL_INVALID: intent is already %', v_intent.status;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'intent_id', v_intent.id,
    'status', v_intent.status,
    'expires_at', v_intent.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_write_intent(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_write_intent(UUID)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Consume — atomically claim one item fingerprint from an approved
--    intent. Status flips to 'consumed' when the last fingerprint is used;
--    a partially-consumed batch intent stays usable for its remaining
--    items. Called by the draft RPC internally AND exposed to the service
--    for tool-gated writes (categories).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_consume_write_intent(
  p_intent_id UUID,
  p_operation TEXT,
  p_request_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_intent public.preset_factory_write_intents;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;
  IF NULLIF(btrim(p_request_fingerprint), '') IS NULL THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: request fingerprint is required';
  END IF;

  -- Reason-mapped pre-check (not authoritative — the UPDATE below is).
  SELECT * INTO v_intent
  FROM public.preset_factory_write_intents
  WHERE id = p_intent_id AND admin_user_id = v_user_id;
  IF v_intent.id IS NULL THEN
    RAISE EXCEPTION 'PF_APPROVAL_INVALID: intent not found for this caller';
  END IF;
  IF v_intent.operation <> p_operation THEN
    RAISE EXCEPTION
      'PF_APPROVAL_INVALID: intent is for %, not %',
      v_intent.operation, p_operation;
  END IF;
  IF v_intent.status = 'pending' THEN
    RAISE EXCEPTION
      'PF_APPROVAL_REQUIRED: owner has not approved this intent yet';
  END IF;
  IF v_intent.status NOT IN ('approved', 'consumed') THEN
    RAISE EXCEPTION
      'PF_APPROVAL_INVALID: intent is %', v_intent.status;
  END IF;
  -- OAuth-client binding: an intent staged under a client_id can only be
  -- consumed by a token carrying the same claim — one connector cannot
  -- spend another connector's approval. Intents staged without a client
  -- (web tools) carry no such restriction.
  IF v_intent.client_id IS NOT NULL
     AND v_intent.client_id IS DISTINCT FROM
         (SELECT auth.jwt() ->> 'client_id') THEN
    RAISE EXCEPTION
      'PF_APPROVAL_INVALID: intent was staged by a different OAuth client';
  END IF;
  IF v_intent.expires_at <= NOW() THEN
    RAISE EXCEPTION 'PF_APPROVAL_EXPIRED: approval intent expired';
  END IF;

  -- The atomic claim: approved (or already partially consumed) + matching
  -- unconsumed fingerprint + unexpired, all in one UPDATE. Concurrent
  -- double-claims serialize on the row lock; the loser sees NOT FOUND.
  UPDATE public.preset_factory_write_intents
  SET
    consumed_fingerprints =
      consumed_fingerprints || btrim(p_request_fingerprint),
    consumed_at = NOW(),
    status = CASE
      WHEN cardinality(consumed_fingerprints || btrim(p_request_fingerprint))
           >= cardinality(item_fingerprints)
      THEN 'consumed'
      ELSE status
    END
  WHERE id = p_intent_id
    AND admin_user_id = v_user_id
    AND status IN ('approved', 'consumed')
    AND expires_at > NOW()
    AND btrim(p_request_fingerprint) = ANY(item_fingerprints)
    AND NOT (btrim(p_request_fingerprint) = ANY(consumed_fingerprints))
  RETURNING * INTO v_intent;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'PF_APPROVAL_PAYLOAD_MISMATCH: payload fingerprint is not covered by this approval (or was already consumed)';
  END IF;

  RETURN jsonb_build_object(
    'intent_id', v_intent.id,
    'status', v_intent.status,
    'consumed', cardinality(v_intent.consumed_fingerprints),
    'total', cardinality(v_intent.item_fingerprints)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_consume_write_intent(UUID, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_consume_write_intent(UUID, TEXT, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. OAuth-gated draft creation: OAuth-issued JWTs (client_id claim
--    present — Supabase OAuth 2.1 server tokens) must carry an approved
--    write intent covering this item's fingerprint. Web/session tokens
--    (no client_id) keep the existing behaviour unchanged.
-- ---------------------------------------------------------------------------

-- CREATE OR REPLACE does NOT remove the 9-arg overload — it would
-- silently coexist as an ungated bypass path. Drop it first so the
-- 10-arg signature below is the only entry point.
DROP FUNCTION IF EXISTS public.admin_create_preset_draft(
  JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.admin_create_preset_draft(
  p_product JSONB,
  p_metadata JSONB,
  p_version JSONB,
  p_fields JSONB,
  p_asset_links JSONB,
  p_batch_id TEXT,
  p_client_item_id TEXT,
  p_idempotency_key TEXT,
  p_request_fingerprint TEXT,
  p_approval_intent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_op_id UUID;
  v_existing public.preset_factory_operations;
  v_new public.products;
  v_version_id UUID;
  v_slug TEXT := p_product->>'slug';
  v_type TEXT := p_product->>'type';
  v_parent UUID := NULLIF(p_product->>'parent_preset_id', '')::UUID;
  v_category UUID := NULLIF(p_product->>'category_id', '')::UUID;
  v_link JSONB;
  v_asset public.assets;
  v_slot TEXT;
  v_slot_asset_id UUID;
  -- Canonical payload fingerprint computed here, never trusted from the
  -- caller. jsonb::text output is key-order-normalised so semantically
  -- identical payloads hash identically regardless of key order.
  -- SHA-256 (pgcrypto) — identical expression to admin_stage_write_intent,
  -- so a staged fingerprint can only ever match this exact payload.
  v_fingerprint CONSTANT TEXT := encode(
    extensions.digest(
      concat_ws(chr(31),
        p_product::text,
        COALESCE(p_metadata, '{}'::jsonb)::text,
        p_version::text,
        COALESCE(p_fields, '[]'::jsonb)::text,
        COALESCE(p_asset_links, '[]'::jsonb)::text
      )::bytea,
      'sha256'
    ),
    'hex'
  );
  v_ref_roles CONSTANT TEXT[] := ARRAY[
    'style_reference', 'composition_reference', 'layout_reference'
  ];
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  -- The caller-asserted fingerprint is required but only used as a
  -- submission marker + approval binding; the stored/compared fingerprint
  -- is computed above.
  IF NULLIF(btrim(p_request_fingerprint), '') IS NULL THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: request fingerprint is required';
  END IF;

  -- Idempotency: claim (admin, key) first. A replaying caller blocks on the
  -- unique index until the original transaction commits, then receives the
  -- already-created ids — a lost response can never mint a duplicate.
  -- Failures roll back the claim, so a retry of a failed item re-executes
  -- and deterministically reproduces the failure.
  BEGIN
    INSERT INTO public.preset_factory_operations (
      admin_user_id, batch_id, client_item_id, idempotency_key, status,
      request_fingerprint
    )
    VALUES (
      v_user_id, p_batch_id, p_client_item_id, p_idempotency_key, 'created',
      v_fingerprint
    )
    RETURNING id INTO v_op_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_existing
      FROM public.preset_factory_operations
      WHERE admin_user_id = v_user_id
        AND idempotency_key = p_idempotency_key;
      IF v_existing.product_id IS NULL THEN
        RAISE EXCEPTION 'PF_IDEMPOTENCY_CONFLICT: key was claimed without a result';
      END IF;
      -- Unconditional comparison: the stored fingerprint is always the
      -- server-computed canonical hash, so a replayed key can never ride a
      -- NULL fingerprint past this check.
      IF v_existing.request_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RAISE EXCEPTION
          'PF_IDEMPOTENCY_CONFLICT: idempotency key replayed with a different payload';
      END IF;
      -- Replay returns the original ids WITHOUT consuming an approval —
      -- no new write occurs, so no new authorization is needed.
      RETURN jsonb_build_object(
        'reused', true,
        'product_id', v_existing.product_id,
        'version_id', v_existing.version_id,
        'slug', (SELECT slug FROM public.products WHERE id = v_existing.product_id)
      );
  END;

  -- OAuth-origin writes need an owner-approved intent covering this
  -- item's canonical fingerprint (v_fingerprint — computed above, never
  -- caller-supplied). Web/session tokens (client_id absent) skip the gate
  -- entirely — the existing admin UI paths are untouched. The consume is
  -- atomic and rolls back with this transaction if any later step fails.
  IF (SELECT auth.jwt() ->> 'client_id') IS NOT NULL THEN
    IF p_approval_intent_id IS NULL THEN
      RAISE EXCEPTION
        'PF_APPROVAL_REQUIRED: OAuth-issued tokens must carry an approved write intent';
    END IF;
    PERFORM public.admin_consume_write_intent(
      p_approval_intent_id, 'create_draft_batch', v_fingerprint
    );
  END IF;

  -- Explicit reference checks with distinct, machine-mappable error codes.
  IF v_category IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id = v_category
  ) THEN
    RAISE EXCEPTION 'PF_INVALID_CATEGORY: category % does not exist', v_category;
  END IF;

  IF v_parent IS NOT NULL THEN
    PERFORM 1 FROM public.products
    WHERE id = v_parent
      AND type = v_type
      AND parent_preset_id IS NULL
      AND public_status <> 'retired';
    IF NOT FOUND THEN
      RAISE EXCEPTION
        'PF_INVALID_PARENT: % is not an eligible same-type root preset', v_parent;
    END IF;
  END IF;

  -- Asset links: only public, undeleted, unrejected/unflagged preset-media
  -- assets may be attached, and the media kind must match the role.
  FOR v_link IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_asset_links, '[]'::jsonb))
  LOOP
    SELECT * INTO v_asset
    FROM public.assets WHERE id = (v_link->>'asset_id')::UUID;
    IF NOT FOUND
       OR v_asset.deleted_at IS NOT NULL
       OR v_asset.bucket <> 'preset-media'
       OR v_asset.visibility <> 'public'
       OR v_asset.moderation_status IN ('rejected', 'flagged') THEN
      RAISE EXCEPTION
        'PF_INVALID_ASSET: asset % is not a usable preset-media asset',
        v_link->>'asset_id';
    END IF;
    IF v_link->>'role' = 'preview_video' AND v_asset.media_type <> 'video' THEN
      RAISE EXCEPTION 'PF_INVALID_ASSET: preview_video requires a video asset';
    END IF;
    IF v_link->>'role' = 'preview_gif' AND v_asset.mime_type <> 'image/gif' THEN
      RAISE EXCEPTION 'PF_INVALID_ASSET: preview_gif requires a GIF asset';
    END IF;
    IF v_link->>'role' NOT IN ('preview_video', 'preview_gif')
       AND v_asset.media_type <> 'image' THEN
      RAISE EXCEPTION 'PF_INVALID_ASSET: role % requires an image asset',
        v_link->>'role';
    END IF;
  END LOOP;

  -- Product media slots get the same constraints.
  FOREACH v_slot IN ARRAY ARRAY[
    'hero_asset_id', 'poster_asset_id',
    'preview_video_asset_id', 'preview_gif_asset_id'
  ] LOOP
    v_slot_asset_id := NULLIF(p_product->>v_slot, '')::UUID;
    IF v_slot_asset_id IS NULL THEN
      CONTINUE;
    END IF;
    SELECT * INTO v_asset FROM public.assets WHERE id = v_slot_asset_id;
    IF NOT FOUND
       OR v_asset.deleted_at IS NOT NULL
       OR v_asset.bucket <> 'preset-media'
       OR v_asset.visibility <> 'public'
       OR v_asset.moderation_status IN ('rejected', 'flagged') THEN
      RAISE EXCEPTION
        'PF_INVALID_ASSET: % asset % is not a usable preset-media asset',
        v_slot, v_slot_asset_id;
    END IF;
    IF v_slot = 'preview_video_asset_id' AND v_asset.media_type <> 'video' THEN
      RAISE EXCEPTION 'PF_INVALID_ASSET: preview_video_asset_id requires a video asset';
    END IF;
    IF v_slot = 'preview_gif_asset_id' AND v_asset.mime_type <> 'image/gif' THEN
      RAISE EXCEPTION 'PF_INVALID_ASSET: preview_gif_asset_id requires a GIF asset';
    END IF;
    IF v_slot IN ('hero_asset_id', 'poster_asset_id')
       AND v_asset.media_type <> 'image' THEN
      RAISE EXCEPTION 'PF_INVALID_ASSET: % requires an image asset', v_slot;
    END IF;
  END LOOP;

  -- Products row: public_status is hard-coded 'draft'. The family trigger
  -- (enforce_preset_family_level) and variant CHECKs still apply as
  -- defense-in-depth below the app-layer validation.
  BEGIN
    INSERT INTO public.products (
      type, slug, name, short_description, long_description,
      public_prompt_recipe, category_id, public_status, visibility,
      likeness_level, featured_rank, hero_asset_id, poster_asset_id,
      preview_video_asset_id, preview_gif_asset_id, metadata,
      parent_preset_id, standalone_discoverable, variant_display_name,
      variant_sort_order
    ) VALUES (
      v_type, v_slug, p_product->>'name',
      p_product->>'short_description', p_product->>'long_description',
      p_product->>'public_prompt_recipe', v_category, 'draft',
      COALESCE(p_product->>'visibility', 'public'),
      p_product->>'likeness_level',
      NULLIF(p_product->>'featured_rank', '')::INT,
      NULLIF(p_product->>'hero_asset_id', '')::UUID,
      NULLIF(p_product->>'poster_asset_id', '')::UUID,
      NULLIF(p_product->>'preview_video_asset_id', '')::UUID,
      NULLIF(p_product->>'preview_gif_asset_id', '')::UUID,
      COALESCE(p_metadata, '{}'::jsonb),
      v_parent,
      COALESCE((p_product->>'standalone_discoverable')::BOOLEAN, FALSE),
      p_product->>'variant_display_name',
      COALESCE(NULLIF(p_product->>'variant_sort_order', '')::INT, 0)
    )
    RETURNING * INTO v_new;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION
        'PF_SLUG_CONFLICT: a preset with slug "%" already exists', v_slug;
  END;

  -- The single complete initial version. state and created_by_admin_id are
  -- never taken from input.
  INSERT INTO public.product_versions (
    product_id, version_number, state, private_instruction_template,
    private_negative_instruction, provider_strategy, model_config,
    output_sizes, input_validation_config, input_mode, input_min_images,
    input_max_images, input_image_roles, prompt_override_enabled,
    prompt_max_chars, post_process_config, safety_config, credit_cost,
    created_by_admin_id
  ) VALUES (
    v_new.id, 1, 'draft',
    p_version->>'private_instruction_template',
    p_version->>'private_negative_instruction',
    COALESCE(p_version->'provider_strategy', '{}'::jsonb),
    COALESCE(p_version->'model_config', '{}'::jsonb),
    COALESCE(p_version->'output_sizes', '[]'::jsonb),
    COALESCE(p_version->'input_validation_config', '{}'::jsonb),
    COALESCE(p_version->>'input_mode', 'single'),
    COALESCE(NULLIF(p_version->>'input_min_images', '')::INT, 1),
    COALESCE(NULLIF(p_version->>'input_max_images', '')::INT, 1),
    COALESCE(p_version->'input_image_roles', '[]'::jsonb),
    COALESCE((p_version->>'prompt_override_enabled')::BOOLEAN, FALSE),
    COALESCE(NULLIF(p_version->>'prompt_max_chars', '')::INT, 0),
    COALESCE(p_version->'post_process_config', '{}'::jsonb),
    COALESCE(p_version->'safety_config', '{}'::jsonb),
    COALESCE(NULLIF(p_version->>'credit_cost', '')::INT, 0),
    v_user_id
  )
  RETURNING id INTO v_version_id;

  IF p_fields IS NOT NULL AND jsonb_array_length(p_fields) > 0 THEN
    INSERT INTO public.product_fields (
      product_id, field_key, label, help_text, field_type, required,
      sort_order, config, validation, active
    )
    SELECT
      v_new.id, field_key, label, help_text, field_type,
      COALESCE(required, FALSE), COALESCE(sort_order, 0),
      COALESCE(config, '{}'::jsonb), COALESCE(validation, '{}'::jsonb),
      COALESCE(active, TRUE)
    FROM jsonb_populate_recordset(NULL::public.product_fields, p_fields);
  END IF;

  -- Reference-role links bind to the new version (they are recipe inputs
  -- and consume route input slots); example/media links stay product-level.
  IF p_asset_links IS NOT NULL AND jsonb_array_length(p_asset_links) > 0 THEN
    INSERT INTO public.product_assets (
      product_id, product_version_id, asset_id, role, sort_order,
      internal_only, rights_metadata
    )
    SELECT
      v_new.id,
      CASE
        WHEN COALESCE((l->>'bind_to_version')::BOOLEAN, FALSE)
             OR (l->>'role') = ANY(v_ref_roles)
        THEN v_version_id
        ELSE NULL
      END,
      (l->>'asset_id')::UUID,
      l->>'role',
      COALESCE((l->>'sort_order')::INT, 0),
      -- Reference-role assets are private recipe material: internal_only
      -- is forced true regardless of caller input (public SELECT policy
      -- would otherwise leak them once the product goes active).
      CASE
        WHEN (l->>'role') = ANY(v_ref_roles) THEN TRUE
        ELSE COALESCE((l->>'internal_only')::BOOLEAN, FALSE)
      END,
      COALESCE(l->'rights_metadata', '{}'::jsonb)
    FROM jsonb_array_elements(p_asset_links) AS l;
  END IF;

  UPDATE public.preset_factory_operations
  SET product_id = v_new.id, version_id = v_version_id
  WHERE id = v_op_id;

  -- Audit mirrors the product.create convention: the product row + linkage
  -- metadata, never the private instruction template.
  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, before, after
  ) VALUES (
    v_user_id,
    'preset_factory.draft_create',
    'product',
    v_new.id,
    NULL,
    jsonb_build_object(
      'product', to_jsonb(v_new),
      'version_id', v_version_id,
      'batch_id', p_batch_id,
      'client_item_id', p_client_item_id
    )
  );

  RETURN jsonb_build_object(
    'reused', false,
    'product_id', v_new.id,
    'version_id', v_version_id,
    'slug', v_new.slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_preset_draft(
  JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_preset_draft(
  JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT, UUID
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Atomic category create-and-consume — the canonical category write path
--    for intent-gated (OAuth) callers. The fingerprint is computed HERE from
--    the real payload — identical expression to admin_stage_write_intent's
--    per-category fingerprint — then claimed in the same transaction as the
--    insert, so a category can never be written before its approval is
--    spent, and a spent approval rolls back if the insert fails.
--
--    OAuth-issued tokens (client_id claim) MUST supply an approved intent
--    covering this exact {name, slug, description, sort_order} payload.
--    Web/session callers keep the existing behaviour (no intent needed) —
--    note the underlying categories table is still directly writable under
--    categories_admin FOR ALL is_admin(), which is why category approval
--    was never claimed to be a hard DB boundary; this RPC makes the MCP
--    tool path atomic and fingerprint-bound, not the table itself.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_create_preset_category(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT,
  p_sort_order INT,
  p_approval_intent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  -- Identical canonical expression to admin_stage_write_intent's
  -- create_categories branch: SHA-256 over the normalized jsonb text of
  -- {name, slug, description, sort_order}.
  v_fingerprint CONSTANT TEXT := encode(
    extensions.digest(
      jsonb_build_object(
        'name', p_name,
        'slug', p_slug,
        'description', p_description,
        'sort_order', COALESCE(p_sort_order, 0)
      )::text::bytea,
      'sha256'
    ),
    'hex'
  );
  v_existing public.categories;
  v_new public.categories;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  -- OAuth-origin calls require an approved intent covering THIS payload.
  -- The claim runs before the insert and inside the same transaction, so
  -- a denied intent can never follow a write, and a failed insert rolls
  -- the consumption back (the fingerprint stays spendable on retry).
  IF (SELECT auth.jwt() ->> 'client_id') IS NOT NULL THEN
    IF p_approval_intent_id IS NULL THEN
      RAISE EXCEPTION
        'PF_APPROVAL_REQUIRED: OAuth-issued tokens must carry an approved write intent';
    END IF;
    PERFORM public.admin_consume_write_intent(
      p_approval_intent_id, 'create_categories', v_fingerprint
    );
  END IF;

  BEGIN
    INSERT INTO public.categories (
      name, slug, description, sort_order, is_active
    ) VALUES (
      p_name, p_slug, p_description, COALESCE(p_sort_order, 0), TRUE
    )
    RETURNING * INTO v_new;
  EXCEPTION
    WHEN unique_violation THEN
      -- Concurrent/existing slug holder: same semantics as the service —
      -- reuse only when the name matches (case/whitespace-insensitive),
      -- otherwise report a real conflict.
      SELECT * INTO v_existing
      FROM public.categories WHERE slug = p_slug;
      IF v_existing.id IS NOT NULL
         AND lower(btrim(v_existing.name)) = lower(btrim(p_name)) THEN
        RETURN jsonb_build_object(
          'status', 'reused',
          'category', to_jsonb(v_existing)
        );
      END IF;
      RETURN jsonb_build_object(
        'status', 'conflict',
        'existing', to_jsonb(v_existing)
      );
  END;

  RETURN jsonb_build_object(
    'status', 'created',
    'category', to_jsonb(v_new)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_preset_category(
  TEXT, TEXT, TEXT, INT, UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_preset_category(
  TEXT, TEXT, TEXT, INT, UUID
) TO authenticated;
