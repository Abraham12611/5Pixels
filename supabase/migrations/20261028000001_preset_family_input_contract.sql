-- Preset Studio 2.0 contract (#176, epic #175): preset families, per-version
-- input capability, and immutable generation inputs.
--
-- Additive + backward compatible by design:
--   * products get optional family columns; every existing row stays a
--     standalone root (parent_preset_id NULL, standalone_discoverable FALSE).
--   * product_versions get an input-capability contract defaulting to the
--     shipped behavior: exactly one required image, custom prompt disabled.
--   * generations keep source_asset_id (NOT NULL) as the ordinal-1
--     projection; the full ordered input set lives in the new immutable
--     generation_input_assets table.
--   * pending_generations gains a defaulted input_assets jsonb column; empty
--     means "derive from source_asset_id", so pending replay is unchanged.
--   * create_generation keeps its legacy (quote, asset, options, key)
--     signature as a wrapper over the new multi-input signature.
--   * Catalog RPCs gain additive columns only; non-standalone variants are
--     excluded from discovery but remain reachable by direct slug.
--
-- Contract reference: docs/adr/001-preset-families-and-generation-input-contract.md

-- ---------------------------------------------------------------------------
-- 1. products — single-level preset family columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS parent_preset_id UUID
    REFERENCES public.products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS standalone_discoverable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS variant_sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variant_display_name TEXT;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_no_self_parent;
ALTER TABLE public.products
  ADD CONSTRAINT products_no_self_parent
    CHECK (parent_preset_id IS NULL OR parent_preset_id <> id);

-- Variant-only fields may not be set on standalone products/roots.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_variant_fields_require_parent;
ALTER TABLE public.products
  ADD CONSTRAINT products_variant_fields_require_parent
    CHECK (
      parent_preset_id IS NOT NULL
      OR (standalone_discoverable = FALSE
          AND variant_display_name IS NULL
          AND variant_sort_order = 0)
    );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_variant_display_name_len;
ALTER TABLE public.products
  ADD CONSTRAINT products_variant_display_name_len
    CHECK (variant_display_name IS NULL OR char_length(variant_display_name) <= 120);

CREATE INDEX IF NOT EXISTS idx_products_parent_preset
  ON public.products(parent_preset_id)
  WHERE parent_preset_id IS NOT NULL;

-- One level only, same type, and a product that already has children may not
-- itself become a child (that would create depth-2 retroactively).
CREATE OR REPLACE FUNCTION public.enforce_preset_family_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- A product with children may not change type (its children would be
  -- orphaned from the same-type invariant).
  IF TG_OP = 'UPDATE'
     AND NEW.type IS DISTINCT FROM OLD.type
     AND EXISTS (
       SELECT 1 FROM public.products c WHERE c.parent_preset_id = NEW.id
     ) THEN
    RAISE EXCEPTION 'Cannot change the type of a preset that has variants'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.parent_preset_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- The parent must exist (FK) and must itself be a root — a variant can
  -- never be assigned as a parent, even when both products are valid.
  IF EXISTS (
    SELECT 1 FROM public.products par
    WHERE par.id = NEW.parent_preset_id
      AND par.parent_preset_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Preset families are single-level: a variant cannot be a parent'
      USING ERRCODE = 'P0001';
  END IF;

  -- This row must not already be a parent.
  IF EXISTS (
    SELECT 1 FROM public.products c WHERE c.parent_preset_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'A preset that has variants cannot itself become a variant'
      USING ERRCODE = 'P0001';
  END IF;

  -- Variants share the parent's content type.
  IF EXISTS (
    SELECT 1 FROM public.products par
    WHERE par.id = NEW.parent_preset_id
      AND par.type <> NEW.type
  ) THEN
    RAISE EXCEPTION 'Variant type must match the parent preset type'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_preset_family_level() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_preset_family_level ON public.products;
CREATE TRIGGER enforce_preset_family_level
  BEFORE INSERT OR UPDATE OF parent_preset_id, type ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_preset_family_level();

-- Admin family mutations must actually work under RLS. The shipped policies
-- embed `(SELECT is_admin FROM public.profiles WHERE id = auth.uid())`,
-- which hits the self-referencing profiles_read_self policy and fails with
-- "infinite recursion" for ANY authenticated table access — the bug stayed
-- latent because reads go through SECURITY DEFINER RPCs. public.is_admin()
-- (already shipped, definer) returns the same result without the recursive
-- reference. Family writes would otherwise be impossible through PostgREST
-- for both admins and non-admins. The grant is widened to anon because the
-- select policies below are evaluated for anonymous reads too —
-- public.is_admin() correctly returns FALSE without a session.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (
    public_status = 'active' AND visibility = 'public'
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "products_admin" ON public.products;
CREATE POLICY "products_admin" ON public.products
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "product_versions_admin" ON public.product_versions;
CREATE POLICY "product_versions_admin" ON public.product_versions
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "product_fields_admin" ON public.product_fields;
CREATE POLICY "product_fields_admin" ON public.product_fields
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "product_assets_admin" ON public.product_assets;
CREATE POLICY "product_assets_admin" ON public.product_assets
  FOR ALL USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. product_versions — admin-owned input capability (version-pinned)
-- ---------------------------------------------------------------------------

ALTER TABLE public.product_versions
  ADD COLUMN IF NOT EXISTS input_mode TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS input_min_images INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS input_max_images INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS input_image_roles JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS prompt_override_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prompt_max_chars INT NOT NULL DEFAULT 0;

-- Role entries: {"name": "^[a-z0-9_]{1,32}$", "optional": bool?}
CREATE OR REPLACE FUNCTION public.is_valid_input_image_roles(p_roles JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_roles IS NOT NULL
    AND jsonb_typeof(p_roles) = 'array'
    AND jsonb_array_length(p_roles) <= 8
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_roles) AS e
      WHERE jsonb_typeof(e) <> 'object'
         OR e->>'name' IS NULL
         OR e->>'name' !~ '^[a-z0-9_]{1,32}$'
         OR (e ? 'optional' AND jsonb_typeof(e->'optional') <> 'boolean')
    )
    AND (
      SELECT COUNT(DISTINCT e->>'name')
      FROM jsonb_array_elements(p_roles) AS e
    ) = jsonb_array_length(p_roles);
$$;

REVOKE ALL ON FUNCTION public.is_valid_input_image_roles(JSONB) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.product_versions
  DROP CONSTRAINT IF EXISTS product_versions_input_contract;
ALTER TABLE public.product_versions
  ADD CONSTRAINT product_versions_input_contract CHECK (
    input_mode IN ('single', 'multi')
    AND input_min_images >= 1
    AND input_max_images >= input_min_images
    AND input_max_images <= 8
    AND (input_mode = 'single'
         OR (input_min_images >= 1 AND input_max_images >= 2))
    AND (input_mode <> 'single'
         OR (input_min_images = 1 AND input_max_images = 1))
    AND public.is_valid_input_image_roles(input_image_roles)
    AND jsonb_array_length(input_image_roles) <= input_max_images
    AND (prompt_override_enabled = FALSE AND prompt_max_chars = 0
         OR prompt_override_enabled = TRUE
            AND prompt_max_chars BETWEEN 1 AND 2000)
  );

-- Capability is part of the pinned recipe: mutating it on an active version
-- must create a new version, same as instructions/model_config.
CREATE OR REPLACE FUNCTION public.prevent_active_version_recipe_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.state = 'active' AND (
    NEW.product_id IS DISTINCT FROM OLD.product_id
    OR NEW.version_number IS DISTINCT FROM OLD.version_number
    OR NEW.private_instruction_template IS DISTINCT FROM OLD.private_instruction_template
    OR NEW.private_negative_instruction IS DISTINCT FROM OLD.private_negative_instruction
    OR NEW.provider_strategy IS DISTINCT FROM OLD.provider_strategy
    OR NEW.model_config IS DISTINCT FROM OLD.model_config
    OR NEW.input_validation_config IS DISTINCT FROM OLD.input_validation_config
    OR NEW.input_mode IS DISTINCT FROM OLD.input_mode
    OR NEW.input_min_images IS DISTINCT FROM OLD.input_min_images
    OR NEW.input_max_images IS DISTINCT FROM OLD.input_max_images
    OR NEW.input_image_roles IS DISTINCT FROM OLD.input_image_roles
    OR NEW.prompt_override_enabled IS DISTINCT FROM OLD.prompt_override_enabled
    OR NEW.prompt_max_chars IS DISTINCT FROM OLD.prompt_max_chars
    OR NEW.post_process_config IS DISTINCT FROM OLD.post_process_config
    OR NEW.safety_config IS DISTINCT FROM OLD.safety_config
    OR NEW.credit_cost IS DISTINCT FROM OLD.credit_cost
    OR NEW.created_by_admin_id IS DISTINCT FROM OLD.created_by_admin_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Active version recipes are immutable';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. generations — user prompt + immutable input mapping
-- ---------------------------------------------------------------------------

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS user_prompt TEXT,
  ADD COLUMN IF NOT EXISTS user_prompt_sha256 TEXT;

ALTER TABLE public.generations
  DROP CONSTRAINT IF EXISTS generations_user_prompt_len;
ALTER TABLE public.generations
  ADD CONSTRAINT generations_user_prompt_len
    CHECK (user_prompt IS NULL OR char_length(user_prompt) <= 2000);

-- Ordered, immutable record of exactly which user-owned assets a generation
-- consumed. Ordinal is 1-based and semantically significant (input order
-- maps to provider slot order / declared roles).
CREATE TABLE IF NOT EXISTS public.generation_input_assets (
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  ordinal INT NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  role TEXT,
  product_version_id UUID NOT NULL REFERENCES public.product_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (generation_id, ordinal),
  UNIQUE (generation_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_generation_input_assets_asset
  ON public.generation_input_assets(asset_id);

ALTER TABLE public.generation_input_assets ENABLE ROW LEVEL SECURITY;

-- Owner check runs inside a SECURITY DEFINER helper: the shipped
-- profiles_read_self policy self-references profiles, so a raw profiles/
-- generations subquery inside a policy expression fails under RLS with
-- "infinite recursion" (pre-existing latent bug — see ADR 001). Definer
-- functions evaluate the check as the table owner, bypassing that path.
CREATE OR REPLACE FUNCTION public.generation_input_is_owner(
  p_generation_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.generations g
    WHERE g.id = p_generation_id
      AND g.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.generation_input_is_owner(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generation_input_is_owner(UUID)
  TO authenticated;

-- Reads: generation owner or admin. Writes: only inside create_generation
-- (security definer) — no client write grants/policies exist.
CREATE POLICY "generation_input_assets_select" ON public.generation_input_assets
  FOR SELECT USING (
    public.generation_input_is_owner(generation_id)
    OR public.is_admin()
  );

REVOKE ALL ON public.generation_input_assets FROM PUBLIC, anon;
GRANT SELECT ON public.generation_input_assets TO authenticated;

-- Integrity: the pinned version must match the parent generation's version,
-- and a declared role must be one the pinned version advertises.
CREATE OR REPLACE FUNCTION public.generation_input_assets_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_version_id UUID;
  v_owner_id UUID;
  v_roles JSONB;
BEGIN
  IF NEW.ordinal < 1 OR NEW.ordinal > 8 THEN
    RAISE EXCEPTION 'Input ordinal out of range' USING ERRCODE = 'P0001';
  END IF;

  SELECT g.product_version_id, g.user_id INTO v_version_id, v_owner_id
  FROM public.generations g
  WHERE g.id = NEW.generation_id;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Unknown generation' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.product_version_id IS DISTINCT FROM v_version_id THEN
    RAISE EXCEPTION 'Input pinned to a different product version than the generation'
      USING ERRCODE = 'P0001';
  END IF;

  -- Cross-owner guard: the mapped asset must belong to the generation's
  -- owner even if a privileged path ever bypasses create_generation.
  IF NOT EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = NEW.asset_id
      AND a.owner_user_id = v_owner_id
      AND a.bucket = 'user-assets'
  ) THEN
    RAISE EXCEPTION 'Input asset is not owned by the generation owner'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.role IS NOT NULL THEN
    SELECT v.input_image_roles INTO v_roles
    FROM public.product_versions v
    WHERE v.id = v_version_id;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(v_roles, '[]'::JSONB)) r
      WHERE r->>'name' = NEW.role
    ) THEN
      RAISE EXCEPTION 'Input role is not declared by the pinned version'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.generation_input_assets_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS generation_input_assets_integrity ON public.generation_input_assets;
CREATE TRIGGER generation_input_assets_integrity
  BEFORE INSERT ON public.generation_input_assets
  FOR EACH ROW EXECUTE FUNCTION public.generation_input_assets_integrity();

-- Immutability: input history is audit data — never edited in place.
-- Deletes are cascade-only (parent generation removal).
CREATE OR REPLACE FUNCTION public.generation_input_assets_no_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Generation input assets are immutable' USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.generation_input_assets_no_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS generation_input_assets_no_update ON public.generation_input_assets;
CREATE TRIGGER generation_input_assets_no_update
  BEFORE UPDATE ON public.generation_input_assets
  FOR EACH ROW EXECUTE FUNCTION public.generation_input_assets_no_update();

-- ---------------------------------------------------------------------------
-- 4. pending_generations — deferred-auth multi-input contract
-- ---------------------------------------------------------------------------

-- Ordered [{"asset_id": uuid, "role": text?}]. Empty array = derive the
-- single input from the legacy source_asset_id column at replay time.
ALTER TABLE public.pending_generations
  ADD COLUMN IF NOT EXISTS input_assets JSONB NOT NULL DEFAULT '[]'::JSONB;

CREATE OR REPLACE FUNCTION public.is_valid_input_asset_refs(p_assets JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_assets IS NOT NULL
    AND jsonb_typeof(p_assets) = 'array'
    AND jsonb_array_length(p_assets) <= 8
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_assets) AS e
      WHERE jsonb_typeof(e) <> 'object'
         OR e->>'asset_id' IS NULL
         OR e->>'asset_id' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
         OR (e->>'role' IS NOT NULL AND e->>'role' !~ '^[a-z0-9_]{1,32}$')
    );
$$;

REVOKE ALL ON FUNCTION public.is_valid_input_asset_refs(JSONB) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.pending_generations
  DROP CONSTRAINT IF EXISTS pending_generations_input_assets_shape;
ALTER TABLE public.pending_generations
  ADD CONSTRAINT pending_generations_input_assets_shape
    CHECK (public.is_valid_input_asset_refs(input_assets));

-- ---------------------------------------------------------------------------
-- 5. create_generation — multi-input signature (quote-bound) + legacy wrapper
-- ---------------------------------------------------------------------------

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

  -- Fail-closed guards (#176 review): the contract is live, but the
  -- provider pipeline still submits only the ordinal-1 image (#179) and
  -- user-prompt composition/moderation lands in #183. Requests that are
  -- contractually valid but functionally incomplete are rejected BEFORE
  -- any generation row or credit reservation is created — including for
  -- direct RPC callers that bypass the application layer. Removal of
  -- these two raises is owned by #179 and #183 respectively.
  IF v_input_count > 1 THEN
    RAISE EXCEPTION 'Multi-image generation is not yet enabled'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_prompt_sha IS NOT NULL THEN
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
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generation(UUID, JSONB, JSONB, TEXT, TEXT)
  TO authenticated;

-- Legacy single-asset signature — kept as a wrapper so existing clients
-- (consumers, lab, pending-generation replay) keep working unchanged.
CREATE OR REPLACE FUNCTION public.create_generation(
  p_quote_id UUID,
  p_source_asset_id UUID,
  p_options JSONB,
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT *
  FROM public.create_generation(
    p_quote_id,
    jsonb_build_array(jsonb_build_object('asset_id', p_source_asset_id::TEXT)),
    p_options,
    NULL::TEXT,
    p_idempotency_key
  );
$$;

REVOKE ALL ON FUNCTION public.create_generation(UUID, UUID, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generation(UUID, UUID, JSONB, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Admin lab overload — record the input mapping on the same contract
-- ---------------------------------------------------------------------------
-- The lab signature stays single-asset; the generation still writes its
-- ordinal-1 generation_input_assets row so every generation has complete
-- input provenance. A version requiring >1 input rejects the lab path until
-- the lab UI supports multi-upload (#179 lane).

CREATE OR REPLACE FUNCTION public.create_generation(
  p_product_id UUID,
  p_product_version_id UUID,
  p_source_asset_id UUID,
  p_options JSONB,
  p_idempotency_key TEXT,
  p_provider_endpoint TEXT,
  p_output_width INT,
  p_output_height INT
)
RETURNS TABLE (
  generation_id UUID,
  status TEXT,
  processing_token TEXT,
  balance_after NUMERIC(12,4),
  credit_cost NUMERIC(12,4)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_staff BOOLEAN;
  v_existing_id UUID;
  v_existing_status TEXT;
  v_version_credit_cost NUMERIC(12,4);
  v_provider_strategy JSONB;
  v_input_min_images INT;
  v_source_owner UUID;
  v_source_bucket TEXT;
  v_balance NUMERIC(12,4);
  v_available NUMERIC(12,4);
  v_token TEXT;
  v_token_hash TEXT;
  v_validation_error TEXT;
  v_generation_id UUID;
  v_markup NUMERIC(6,4);
  v_pricing RECORD;
  v_quantity NUMERIC(12,4);
  v_unit_price NUMERIC(12,8);
  v_unit TEXT;
  v_raw_cost NUMERIC(12,8);
  v_credit_cost NUMERIC(12,4);
  v_provider_cost_usd NUMERIC(12,8);
  v_max_pixels INT := 4000000;
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

  IF p_output_width IS NULL OR p_output_height IS NULL
     OR p_output_width <= 0 OR p_output_height <= 0
     OR (p_output_width::bigint * p_output_height::bigint) > v_max_pixels THEN
    RAISE EXCEPTION 'Invalid output size' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::TEXT, 0));

  -- Idempotency: return the existing generation without charging again.
  SELECT g.id, g.status, g.credit_cost
    INTO v_existing_id, v_existing_status, v_credit_cost
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
    credit_cost := COALESCE(v_credit_cost, 0);
    RETURN NEXT;
    RETURN;
  END IF;

  -- Staff may generate against any version (draft/testing presets in the lab);
  -- everyone else still requires a live product with an active version.
  SELECT COALESCE(pr.is_admin, FALSE) OR COALESCE(pr.is_owner, FALSE)
    INTO v_is_staff
  FROM public.profiles pr
  WHERE pr.id = v_user_id;

  SELECT v.credit_cost, v.provider_strategy, v.input_min_images
    INTO v_version_credit_cost, v_provider_strategy, v_input_min_images
  FROM public.products p
  JOIN public.product_versions v ON v.product_id = p.id
  WHERE p.id = p_product_id
    AND v.id = p_product_version_id
    AND (
      COALESCE(v_is_staff, FALSE)
      OR (
        p.public_status = 'active'
        AND p.visibility = 'public'
        AND v.state = 'active'
      )
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid product or version' USING ERRCODE = 'P0001';
  END IF;

  -- The lab path is single-asset; a version that requires multiple inputs
  -- cannot be exercised here yet.
  IF COALESCE(v_input_min_images, 1) > 1 THEN
    RAISE EXCEPTION 'This preset requires multiple input images'
      USING ERRCODE = 'P0001';
  END IF;

  -- Verify source asset exists, is owned by the caller, and lives in user-assets.
  SELECT owner_user_id, bucket INTO v_source_owner, v_source_bucket
  FROM public.assets
  WHERE id = p_source_asset_id;

  IF v_source_owner IS NULL OR v_source_owner <> v_user_id OR v_source_bucket <> 'user-assets' THEN
    RAISE EXCEPTION 'Invalid source asset' USING ERRCODE = 'P0001';
  END IF;

  -- Validate options against active product_fields.
  v_validation_error := public.validate_generation_options(p_product_id, p_options);
  IF v_validation_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_validation_error USING ERRCODE = 'P0001';
  END IF;

  -- Determine the user's markup.
  v_markup := public.get_user_markup_multiplier(v_user_id);

  -- Look up pricing for the requested endpoint.
  SELECT unit_price, unit
    INTO v_pricing
  FROM public.provider_model_pricing
  WHERE provider = 'fal'
    AND endpoint_id = p_provider_endpoint
    AND is_active = true
    AND effective_from <= NOW()
  ORDER BY effective_from DESC
  LIMIT 1;

  IF FOUND THEN
    v_unit_price := v_pricing.unit_price;
    v_unit := v_pricing.unit;

    -- Compute quantity from unit + selected output size.
    v_quantity := CASE
      WHEN v_unit IN ('images', 'generations') THEN 1::NUMERIC(12,4)
      WHEN v_unit = 'megapixel' THEN (p_output_width::NUMERIC(12,4) * p_output_height::NUMERIC(12,4)) / 1000000
      WHEN v_unit IN ('compute seconds', 'seconds') THEN 15::NUMERIC(12,4) -- worst-case cap
      ELSE 1::NUMERIC(12,4)
    END;

    v_raw_cost := v_unit_price * v_quantity;
    v_credit_cost := public.calculate_credit_cost(v_unit_price, v_quantity, v_markup);
    v_provider_cost_usd := v_raw_cost;
  ELSE
    -- No provider pricing: fall back to the product version's static credit cost.
    v_credit_cost := COALESCE(v_version_credit_cost, 0);
    v_markup := 1.0000;
    v_provider_cost_usd := NULL;
  END IF;

  -- Credit check uses available balance (excludes open reservations).
  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4) INTO v_balance
  FROM public.credit_ledger
  WHERE user_id = v_user_id;

  SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4) INTO v_available
  FROM public.credit_ledger
  WHERE user_id = v_user_id
    AND entry_type <> 'reservation';

  IF v_available < v_credit_cost THEN
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
    markup_multiplier,
    provider_cost_usd
  )
  VALUES (
    v_user_id,
    p_product_id,
    p_product_version_id,
    p_source_asset_id,
    'created',
    p_options,
    encode(extensions.digest(p_options::text::bytea, 'sha256'), 'hex'),
    p_idempotency_key,
    v_token_hash,
    v_credit_cost,
    NULL,
    v_markup,
    v_provider_cost_usd
  )
  RETURNING id INTO v_generation_id;

  INSERT INTO public.generation_input_assets (
    generation_id, ordinal, asset_id, role, product_version_id
  ) VALUES (
    v_generation_id, 1, p_source_asset_id, NULL, p_product_version_id
  );

  -- Reserve credits atomically and link the ledger row to the generation.
  IF v_credit_cost > 0 THEN
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
      -v_credit_cost,
      v_generation_id,
      'reserve:' || p_idempotency_key,
      jsonb_build_object(
        'product_id', p_product_id,
        'product_version_id', p_product_version_id,
        'provider_endpoint', p_provider_endpoint,
        'output_width', p_output_width,
        'output_height', p_output_height,
        'estimated_quantity', v_quantity,
        'unit', v_unit
      )
    );
  END IF;

  generation_id := v_generation_id;
  status := 'created';
  processing_token := v_token;
  balance_after := (
    SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,4)
    FROM public.credit_ledger
    WHERE user_id = v_user_id
  );
  credit_cost := v_credit_cost;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation(UUID, UUID, UUID, JSONB, TEXT, TEXT, INT, INT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generation(UUID, UUID, UUID, JSONB, TEXT, TEXT, INT, INT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. get_preset_family — ordered family members for any member id
-- ---------------------------------------------------------------------------
-- Accepts a parent or any child; resolves the root and returns all currently
-- published members (parent first, then variants by sort order). Hidden
-- (non-standalone) variants ARE listed — "hidden" means absent from
-- independent discovery, not from the family rail. Unavailable members
-- (paused/retired/draft) are excluded; a non-public input yields an empty
-- result so family structure never leaks for unpublished products.

CREATE OR REPLACE FUNCTION public.get_preset_family(p_product_id UUID)
RETURNS TABLE (
  product_id UUID,
  slug TEXT,
  name TEXT,
  variant_display_name TEXT,
  variant_sort_order INT,
  is_parent BOOLEAN,
  is_current BOOLEAN,
  public_status TEXT,
  credit_cost NUMERIC(12,4),
  hero_asset_id UUID,
  poster_asset_id UUID,
  preview_gif_asset_id UUID,
  preview_video_asset_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH root AS (
    SELECT COALESCE(p.parent_preset_id, p.id) AS root_id
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.public_status = 'active'
      AND p.visibility = 'public'
  )
  SELECT
    m.id AS product_id,
    m.slug,
    m.name,
    m.variant_display_name,
    m.variant_sort_order,
    (m.id = r.root_id) AS is_parent,
    (m.id = p_product_id) AS is_current,
    m.public_status,
    COALESCE((
      SELECT v.credit_cost
      FROM public.product_versions v
      WHERE v.product_id = m.id AND v.state = 'active'
      ORDER BY v.version_number DESC
      LIMIT 1
    ), 0)::NUMERIC(12,4) AS credit_cost,
    m.hero_asset_id,
    m.poster_asset_id,
    m.preview_gif_asset_id,
    m.preview_video_asset_id
  FROM public.products m
  CROSS JOIN root r
  WHERE (m.id = r.root_id OR m.parent_preset_id = r.root_id)
    AND m.public_status = 'active'
    AND m.visibility = 'public'
  ORDER BY (m.id = r.root_id) DESC, m.variant_sort_order, m.created_at;
$$;

REVOKE ALL ON FUNCTION public.get_preset_family(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_preset_family(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. get_public_catalog — hide non-standalone variants + family columns
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.get_public_catalog(
  p_type TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_product_ids UUID[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'featured',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  type TEXT,
  short_description TEXT,
  long_description TEXT,
  category_id UUID,
  category_slug TEXT,
  category_name TEXT,
  featured_rank INT,
  version_number INT,
  credit_cost NUMERIC(12,4),
  metadata JSONB,
  hero_asset_id UUID,
  poster_asset_id UUID,
  preview_gif_asset_id UUID,
  preview_video_asset_id UUID,
  public_assets JSONB,
  created_at TIMESTAMPTZ,
  likeness_level TEXT,
  parent_preset_id UUID,
  standalone_discoverable BOOLEAN,
  variant_count INT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH filtered AS (
    SELECT
      p.id,
      p.slug,
      p.name,
      p.type,
      p.short_description,
      p.long_description,
      c.id AS category_id,
      c.slug AS category_slug,
      c.name AS category_name,
      p.featured_rank,
      v.version_number,
      COALESCE(v.credit_cost, 0) AS credit_cost,
      p.metadata,
      p.created_at,
      p.likeness_level,
      p.hero_asset_id,
      p.poster_asset_id,
      p.preview_gif_asset_id,
      p.preview_video_asset_id,
      p.parent_preset_id,
      p.standalone_discoverable,
      (
        SELECT COUNT(*)::INT
        FROM public.products ch
        WHERE ch.parent_preset_id = p.id
          AND ch.public_status = 'active'
          AND ch.visibility = 'public'
      ) AS variant_count,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'role', sub.role,
              'asset_id', sub.asset_id,
              'sort_order', sub.sort_order,
              'rights_metadata', sub.rights_metadata,
              'bucket', sub.bucket,
              'storage_key', sub.storage_key,
              'mime_type', sub.mime_type,
              'width', sub.width,
              'height', sub.height
            )
            ORDER BY sub.sort_order, sub.created_at
          )
          FROM (
            SELECT DISTINCT ON (combined.role)
              combined.role,
              combined.asset_id,
              combined.sort_order,
              combined.rights_metadata,
              combined.bucket,
              combined.storage_key,
              combined.mime_type,
              combined.width,
              combined.height,
              combined.created_at
            FROM (
              SELECT
                pa.role,
                pa.asset_id,
                pa.sort_order,
                pa.rights_metadata,
                a.bucket,
                a.storage_key,
                a.mime_type,
                a.width,
                a.height,
                a.created_at
              FROM public.product_assets pa
              JOIN public.assets a ON a.id = pa.asset_id
              WHERE pa.product_id = p.id
                AND pa.internal_only = false
                AND a.visibility = 'public'

              UNION ALL

              SELECT
                'hero' AS role,
                p.hero_asset_id AS asset_id,
                0 AS sort_order,
                NULL::JSONB AS rights_metadata,
                a.bucket,
                a.storage_key,
                a.mime_type,
                a.width,
                a.height,
                a.created_at
              FROM public.assets a
              WHERE a.id = p.hero_asset_id
                AND a.visibility = 'public'
            ) combined
            ORDER BY combined.role, combined.sort_order, combined.created_at
          ) sub
        ),
        '[]'::JSONB
      ) AS public_assets
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    JOIN public.product_versions v ON v.id = (
      SELECT id
      FROM public.product_versions
      WHERE product_id = p.id AND state = 'active'
      ORDER BY version_number DESC
      LIMIT 1
    )
    WHERE p.visibility = 'public'
      AND p.public_status = 'active'
      -- Variant children are family-only by default; standalone_discoverable
      -- is the explicit admin opt-in to independent discovery.
      AND (p.parent_preset_id IS NULL OR p.standalone_discoverable)
      AND (p_type IS NULL OR p.type = p_type)
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (p_product_ids IS NULL OR p.id = ANY(p_product_ids))
      AND (p_search IS NULL OR p_search = ''
           OR p.name ILIKE '%' || p_search || '%'
           OR p.short_description ILIKE '%' || p_search || '%'
           OR p.long_description ILIKE '%' || p_search || '%')
  ),
  counted AS (
    SELECT COUNT(*) AS total_count FROM filtered
  ),
  ranked AS (
    SELECT
      filtered.*,
      CASE
        WHEN p_sort = 'newest' THEN ROW_NUMBER() OVER (ORDER BY filtered.created_at DESC)
        WHEN p_sort = 'name_asc' THEN ROW_NUMBER() OVER (ORDER BY filtered.name ASC)
        WHEN p_sort = 'name_desc' THEN ROW_NUMBER() OVER (ORDER BY filtered.name DESC)
        WHEN p_sort = 'credits_asc' THEN ROW_NUMBER() OVER (ORDER BY filtered.credit_cost ASC, filtered.name ASC)
        WHEN p_sort = 'credits_desc' THEN ROW_NUMBER() OVER (ORDER BY filtered.credit_cost DESC, filtered.name ASC)
        ELSE ROW_NUMBER() OVER (
          ORDER BY
            CASE WHEN filtered.featured_rank IS NULL THEN 1 ELSE 0 END,
            filtered.featured_rank,
            filtered.created_at DESC
        )
      END AS row_num
    FROM filtered
  )
  SELECT
    r.id,
    r.slug,
    r.name,
    r.type,
    r.short_description,
    r.long_description,
    r.category_id,
    r.category_slug,
    r.category_name,
    r.featured_rank,
    r.version_number,
    r.credit_cost,
    r.metadata,
    r.hero_asset_id,
    r.poster_asset_id,
    r.preview_gif_asset_id,
    r.preview_video_asset_id,
    r.public_assets,
    r.created_at,
    r.likeness_level,
    r.parent_preset_id,
    r.standalone_discoverable,
    r.variant_count,
    c.total_count
  FROM ranked r
  CROSS JOIN counted c
  WHERE r.row_num BETWEEN ((p_page - 1) * p_page_size + 1) AND (p_page * p_page_size)
  ORDER BY r.row_num;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. get_public_product_by_slug — family + input capability (public projection)
-- ---------------------------------------------------------------------------
-- Variants stay resolvable by direct slug (safe shareable URL) even when not
-- standalone_discoverable — "hidden" is a discovery filter, not a route block.
-- input_capability exposes only the consumer-facing contract — mode, counts,
-- role names, prompt flag — never provider routes or recipe data.

DROP FUNCTION IF EXISTS public.get_public_product_by_slug(TEXT);
CREATE OR REPLACE FUNCTION public.get_public_product_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  type TEXT,
  short_description TEXT,
  long_description TEXT,
  category_id UUID,
  category_slug TEXT,
  category_name TEXT,
  featured_rank INT,
  version_id UUID,
  version_number INT,
  credit_cost NUMERIC(12,4),
  output_sizes JSONB,
  metadata JSONB,
  hero_asset_id UUID,
  poster_asset_id UUID,
  preview_gif_asset_id UUID,
  preview_video_asset_id UUID,
  active_fields JSONB,
  public_assets JSONB,
  created_at TIMESTAMPTZ,
  likeness_level TEXT,
  parent_preset_id UUID,
  standalone_discoverable BOOLEAN,
  variant_display_name TEXT,
  family_id UUID,
  input_capability JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.slug,
    p.name,
    p.type,
    p.short_description,
    p.long_description,
    c.id AS category_id,
    c.slug AS category_slug,
    c.name AS category_name,
    p.featured_rank,
    v.id AS version_id,
    v.version_number,
    COALESCE(v.credit_cost, 0) AS credit_cost,
    COALESCE(
      v.output_sizes,
      CASE
        WHEN v.model_config->>'width' IS NOT NULL AND v.model_config->>'height' IS NOT NULL THEN
          jsonb_build_array(
            jsonb_build_object(
              'name', concat(v.model_config->>'width', 'x', v.model_config->>'height'),
              'width', (v.model_config->>'width')::int,
              'height', (v.model_config->>'height')::int,
              'is_default', true
            )
          )
        ELSE '[]'::JSONB
      END
    ) AS output_sizes,
    CASE
      WHEN p.type = 'filter' THEN jsonb_build_object('filter_config', COALESCE(p.metadata->'filter_config', '{}'::JSONB))
      WHEN p.type = 'poster' THEN jsonb_build_object('poster_config', COALESCE(p.metadata->'poster_config', '{}'::JSONB))
      ELSE '{}'::JSONB
    END AS metadata,
    p.hero_asset_id,
    p.poster_asset_id,
    p.preview_gif_asset_id,
    p.preview_video_asset_id,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'field_key', f.field_key,
            'label', f.label,
            'help_text', f.help_text,
            'field_type', f.field_type,
            'required', f.required,
            'sort_order', f.sort_order,
            'config', f.config,
            'validation', f.validation
          )
          ORDER BY f.sort_order, f.id
        )
        FROM public.product_fields f
        WHERE f.product_id = p.id AND f.active = TRUE
      ),
      '[]'::JSONB
    ) AS active_fields,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'role', sub.role,
            'asset_id', sub.asset_id,
            'sort_order', sub.sort_order,
            'rights_metadata', sub.rights_metadata,
            'bucket', sub.bucket,
            'storage_key', sub.storage_key,
            'mime_type', sub.mime_type,
            'width', sub.width,
            'height', sub.height
          )
          ORDER BY sub.sort_order, sub.created_at
        )
        FROM (
          SELECT DISTINCT ON (combined.role)
            combined.role,
            combined.asset_id,
            combined.sort_order,
            combined.rights_metadata,
            combined.bucket,
            combined.storage_key,
            combined.mime_type,
            combined.width,
            combined.height,
            combined.created_at
          FROM (
            SELECT
              pa.role,
              pa.asset_id,
              pa.sort_order,
              pa.rights_metadata,
              a.bucket,
              a.storage_key,
              a.mime_type,
              a.width,
              a.height,
              a.created_at
            FROM public.product_assets pa
            JOIN public.assets a ON a.id = pa.asset_id
            WHERE pa.product_id = p.id
              AND pa.internal_only = false
              AND a.visibility = 'public'

            UNION ALL

            SELECT
              'hero' AS role,
              p.hero_asset_id AS asset_id,
              0 AS sort_order,
              NULL::JSONB AS rights_metadata,
              a.bucket,
              a.storage_key,
              a.mime_type,
              a.width,
              a.height,
              a.created_at
            FROM public.assets a
            WHERE a.id = p.hero_asset_id
              AND a.visibility = 'public'
          ) combined
          ORDER BY combined.role, combined.sort_order, combined.created_at
        ) sub
      ),
      '[]'::JSONB
    ) AS public_assets,
    p.created_at,
    p.likeness_level,
    p.parent_preset_id,
    p.standalone_discoverable,
    p.variant_display_name,
    COALESCE(p.parent_preset_id, p.id) AS family_id,
    jsonb_build_object(
      'mode', v.input_mode,
      'min_images', v.input_min_images,
      'max_images', v.input_max_images,
      'roles', COALESCE(v.input_image_roles, '[]'::JSONB),
      'prompt', jsonb_build_object(
        'enabled', v.prompt_override_enabled,
        'max_chars', v.prompt_max_chars
      )
    ) AS input_capability
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  JOIN public.product_versions v ON v.id = (
    SELECT id
    FROM public.product_versions
    WHERE product_id = p.id AND state = 'active'
    ORDER BY version_number DESC
    LIMIT 1
  )
  WHERE p.slug = p_slug
    AND p.visibility = 'public'
    AND p.public_status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_product_by_slug(TEXT)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 10. get_user_generation_by_id — ordered input assets + user prompt
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_user_generation_by_id(UUID);
CREATE OR REPLACE FUNCTION public.get_user_generation_by_id(p_generation_id UUID)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  product_slug TEXT,
  product_type TEXT,
  status TEXT,
  status_detail TEXT,
  progress JSONB,
  credit_cost NUMERIC(12,4),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  output_asset_id UUID,
  output_role TEXT,
  output_bucket TEXT,
  output_storage_key TEXT,
  output_mime_type TEXT,
  output_width INT,
  output_height INT,
  source_asset_id UUID,
  source_bucket TEXT,
  source_storage_key TEXT,
  saved_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  input_assets JSONB,
  user_prompt TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    g.id,
    p.id AS product_id,
    p.name AS product_name,
    p.slug AS product_slug,
    p.type AS product_type,
    g.status,
    g.status_detail,
    g.progress,
    g.credit_cost,
    g.created_at,
    g.updated_at,
    a.id AS output_asset_id,
    go.output_role,
    a.bucket AS output_bucket,
    a.storage_key AS output_storage_key,
    a.mime_type AS output_mime_type,
    a.width AS output_width,
    a.height AS output_height,
    sa.id AS source_asset_id,
    sa.bucket AS source_bucket,
    sa.storage_key AS source_storage_key,
    g.saved_at,
    g.downloaded_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'asset_id', gia.asset_id,
            'role', gia.role,
            'ordinal', gia.ordinal,
            'bucket', ia.bucket,
            'storage_key', ia.storage_key,
            'mime_type', ia.mime_type,
            'width', ia.width,
            'height', ia.height
          )
          ORDER BY gia.ordinal
        )
        FROM public.generation_input_assets gia
        JOIN public.assets ia ON ia.id = gia.asset_id
        WHERE gia.generation_id = g.id
      ),
      '[]'::JSONB
    ) AS input_assets,
    g.user_prompt
  FROM public.generations g
  JOIN public.products p ON p.id = g.product_id
  LEFT JOIN public.generation_outputs go ON go.generation_id = g.id AND go.is_primary = TRUE
  LEFT JOIN public.assets a ON a.id = go.asset_id
  LEFT JOIN public.assets sa ON sa.id = g.source_asset_id
  WHERE g.user_id = (SELECT auth.uid())
    AND g.id = p_generation_id;
$$;

REVOKE ALL ON FUNCTION public.get_user_generation_by_id(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_generation_by_id(UUID) TO authenticated;
