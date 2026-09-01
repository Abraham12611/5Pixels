-- Milestone: publish gates, owner override, atomic version workflow,
-- admin product actions, and audit logging.
--
-- This migration runs after 20260901000000_admin_asset_storage.sql.

-- 1. Owner flag on profiles, seeded from the canonical owner email.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_owner ON public.profiles(is_owner)
  WHERE is_owner = TRUE;

-- Set the initial owner based on the known account email. The email address is
-- intentionally kept out of application code; only this one-time migration
-- references it.
ALTER TABLE public.profiles DISABLE TRIGGER prevent_profile_privilege_escalation;

UPDATE public.profiles
SET is_owner = TRUE
WHERE lower(email) = lower('abraham.dahunsi@gmail.com');

ALTER TABLE public.profiles ENABLE TRIGGER prevent_profile_privilege_escalation;

-- 2. Helpers for ownership and admin checks.
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT is_owner FROM public.profiles WHERE id = (SELECT auth.uid())), FALSE);
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

-- 3. Harden the profile privilege-escalation guard to also protect is_owner.
-- Only owners or admins may mutate owner/admin security fields.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_owner()) AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.is_owner IS DISTINCT FROM OLD.is_owner
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Profile security fields cannot be updated';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Enforce at most one active version per product.
-- Resolve existing duplicates safely: keep only the most recently published
-- active version for each product and retire the rest.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (product_id) id, product_id
    FROM public.product_versions
    WHERE state = 'active'
    ORDER BY product_id, COALESCE(published_at, created_at) DESC, version_number DESC
  LOOP
    UPDATE public.product_versions
    SET state = 'retired', retired_at = NOW()
    WHERE product_id = rec.product_id
      AND state = 'active'
      AND id <> rec.id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_versions_one_active_per_product
  ON public.product_versions(product_id)
  WHERE state = 'active';

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

REVOKE ALL ON FUNCTION public.prevent_active_version_recipe_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER prevent_active_version_recipe_update
  BEFORE UPDATE ON public.product_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_active_version_recipe_update();

-- 5. Canonical publish-gate validation in SQL. Mirrors the TypeScript validator
-- so the database is the final authority. No private recipe data is exposed.
CREATE OR REPLACE FUNCTION public.check_publish_gates(
  p_product public.products,
  p_version public.product_versions
)
RETURNS TABLE(
  code TEXT,
  message TEXT,
  field_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_field public.product_fields;
  v_safety JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  -- Product identity.
  IF p_product.name IS NULL OR length(trim(p_product.name)) = 0 THEN
    RETURN QUERY SELECT 'MISSING_PRODUCT_NAME'::TEXT, 'Product name is required.'::TEXT, 'name'::TEXT;
  END IF;

  IF p_product.slug IS NULL OR p_product.slug !~ '^[a-z0-9-]+$' THEN
    RETURN QUERY SELECT 'INVALID_SLUG'::TEXT, 'Slug is required and must use lowercase letters, numbers, and hyphens only.'::TEXT, 'slug'::TEXT;
  END IF;

  IF p_product.type NOT IN ('filter', 'poster') THEN
    RETURN QUERY SELECT 'INVALID_PRODUCT_TYPE'::TEXT, 'Product type must be one of: filter, poster.'::TEXT, 'type'::TEXT;
  END IF;

  IF p_product.public_status NOT IN ('draft', 'internal_test', 'private_beta', 'scheduled', 'active', 'paused', 'retired') THEN
    RETURN QUERY SELECT 'INVALID_PRODUCT_STATUS'::TEXT, ('Product status ''' || p_product.public_status || ''' is not valid.')::TEXT, 'public_status'::TEXT;
  END IF;

  -- Visual assets.
  IF p_product.hero_asset_id IS NULL THEN
    RETURN QUERY SELECT 'MISSING_HERO_ASSET'::TEXT, 'A hero visual asset is required.'::TEXT, 'hero_asset_id'::TEXT;
  END IF;

  IF p_product.poster_asset_id IS NULL THEN
    RETURN QUERY SELECT 'MISSING_POSTER_ASSET'::TEXT, 'A poster visual asset is required.'::TEXT, 'poster_asset_id'::TEXT;
  END IF;

  -- Provider/model.
  IF p_version.provider_strategy->>'primary_provider' IS NULL OR length(trim(p_version.provider_strategy->>'primary_provider')) = 0 THEN
    RETURN QUERY SELECT 'MISSING_PRIMARY_PROVIDER'::TEXT, 'Primary AI provider is required.'::TEXT, 'version.provider_strategy.primary_provider'::TEXT;
  END IF;

  IF p_version.provider_strategy->>'primary_model' IS NULL OR length(trim(p_version.provider_strategy->>'primary_model')) = 0 THEN
    RETURN QUERY SELECT 'MISSING_PRIMARY_MODEL'::TEXT, 'Primary AI model is required.'::TEXT, 'version.provider_strategy.primary_model'::TEXT;
  END IF;

  -- Credit cost.
  IF p_version.credit_cost IS NULL OR p_version.credit_cost <= 0 THEN
    RETURN QUERY SELECT 'INVALID_CREDIT_COST'::TEXT, 'Credit cost must be greater than 0.'::TEXT, 'version.credit_cost'::TEXT;
  END IF;

  -- Safety config must explicitly contain required booleans.
  v_safety := COALESCE(p_version.safety_config, '{}'::JSONB);
  IF jsonb_typeof(v_safety->'allowed_nsfw') <> 'boolean' THEN
    RETURN QUERY SELECT 'INVALID_SAFETY_CONFIG'::TEXT, 'Safety config must explicitly set ''allowed_nsfw'' to a boolean value.'::TEXT, 'version.safety_config.allowed_nsfw'::TEXT;
  END IF;
  IF jsonb_typeof(v_safety->'block_public_figures') <> 'boolean' THEN
    RETURN QUERY SELECT 'INVALID_SAFETY_CONFIG'::TEXT, 'Safety config must explicitly set ''block_public_figures'' to a boolean value.'::TEXT, 'version.safety_config.block_public_figures'::TEXT;
  END IF;
  IF jsonb_typeof(v_safety->'block_minors') <> 'boolean' THEN
    RETURN QUERY SELECT 'INVALID_SAFETY_CONFIG'::TEXT, 'Safety config must explicitly set ''block_minors'' to a boolean value.'::TEXT, 'version.safety_config.block_minors'::TEXT;
  END IF;

  -- Type-specific config coherence.
  IF p_product.type = 'poster' THEN
    IF p_product.metadata->'poster_config'->>'layout_template' IS NULL
       OR p_product.metadata->'poster_config'->>'layout_template' NOT IN ('portrait', 'square', 'landscape') THEN
      RETURN QUERY SELECT 'INVALID_POSTER_LAYOUT'::TEXT, 'Posters require a valid layout template (portrait, square, or landscape).'::TEXT, 'poster_config.layout_template'::TEXT;
    END IF;
  END IF;

  IF p_product.type = 'filter' THEN
    IF p_product.metadata->'filter_config'->>'style_archetype' IS NULL
       OR length(trim(p_product.metadata->'filter_config'->>'style_archetype')) = 0 THEN
      RETURN QUERY SELECT 'MISSING_FILTER_CONFIG'::TEXT, 'Filter products require filter configuration.'::TEXT, 'filter_config.style_archetype'::TEXT;
    END IF;
  END IF;

  -- Field schemas. Empty array is allowed; invalid fields are rejected.
  FOR v_field IN
    SELECT *
    FROM public.product_fields
    WHERE product_id = p_product.id
      AND active = TRUE
  LOOP
    IF v_field.field_key IS NULL OR v_field.field_key !~ '^[a-z0-9_]+$' THEN
      RETURN QUERY SELECT 'INVALID_FIELD_SCHEMA'::TEXT,
        ('Field ''' || COALESCE(v_field.field_key, 'unknown') || ''' has an invalid key format.')::TEXT,
        ('fields.' || COALESCE(v_field.field_key, 'unknown'))::TEXT;
    END IF;
    IF v_field.label IS NULL OR length(trim(v_field.label)) = 0 OR length(v_field.label) > 120 THEN
      RETURN QUERY SELECT 'INVALID_FIELD_SCHEMA'::TEXT,
        ('Field ''' || COALESCE(v_field.field_key, 'unknown') || ''' has an invalid label.')::TEXT,
        ('fields.' || COALESCE(v_field.field_key, 'unknown') || '.label')::TEXT;
    END IF;
    IF v_field.field_type IS NULL OR v_field.field_type NOT IN ('short_text', 'select', 'radio', 'toggle', 'color', 'aspect_ratio', 'intensity', 'layout', 'background', 'wardrobe', 'era', 'mood') THEN
      RETURN QUERY SELECT 'INVALID_FIELD_SCHEMA'::TEXT,
        ('Field ''' || COALESCE(v_field.field_key, 'unknown') || ''' has an invalid field type.')::TEXT,
        ('fields.' || COALESCE(v_field.field_key, 'unknown') || '.field_type')::TEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.check_publish_gates(public.products, public.product_versions) FROM PUBLIC, anon, authenticated;

-- 6. Atomic version publish.
-- Admins may publish when gates pass. Owners may additionally override gate
-- failures by supplying a non-trivial reason, which is persisted in the audit log.
CREATE OR REPLACE FUNCTION public.publish_product_version(
  p_product_id UUID,
  p_version_id UUID,
  p_override_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_is_admin BOOLEAN := public.is_admin();
  v_is_owner BOOLEAN := public.is_owner();
  v_product public.products;
  v_version public.product_versions;
  v_gate RECORD;
  v_reason TEXT;
  v_overridden BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL OR NOT (v_is_admin OR v_is_owner) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  SELECT * INTO v_version FROM public.product_versions WHERE id = p_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  IF v_version.product_id <> p_product_id THEN
    RAISE EXCEPTION 'Version does not belong to product';
  END IF;

  -- Only draft or testing versions may be published. Active/retired versions
  -- are immutable workflow states.
  IF v_version.state NOT IN ('draft', 'testing') THEN
    RAISE EXCEPTION 'Only draft or testing versions can be published';
  END IF;

  v_reason := COALESCE(NULLIF(trim(p_override_reason), ''), NULL);

  FOR v_gate IN SELECT * FROM public.check_publish_gates(v_product, v_version)
  LOOP
    IF v_is_owner AND v_reason IS NOT NULL AND length(v_reason) >= 12 THEN
      v_overridden := TRUE;
    ELSE
      RAISE EXCEPTION 'Publish gate failed: % - % (field: %)',
        v_gate.code, v_gate.message, v_gate.field_path;
    END IF;
  END LOOP;

  -- Atomic transition: retire current active version, publish target.
  UPDATE public.product_versions
  SET state = 'retired', retired_at = NOW()
  WHERE product_id = p_product_id AND state = 'active';

  UPDATE public.product_versions
  SET state = 'active', published_at = NOW()
  WHERE id = p_version_id;

  UPDATE public.products
  SET public_status = 'active'
  WHERE id = p_product_id;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, after, reason)
  VALUES (
    v_user_id,
    CASE WHEN v_overridden THEN 'product_version.publish.override' ELSE 'product_version.publish' END,
    'product_version',
    p_version_id,
    jsonb_build_object(
      'product_id', p_product_id,
      'version_id', p_version_id,
      'override', v_overridden
    ),
    v_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_product_version(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_product_version(UUID, UUID, TEXT) TO authenticated;

-- 7. Atomic rollback to a prior version.
CREATE OR REPLACE FUNCTION public.rollback_product_version(
  p_product_id UUID,
  p_target_version_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_target public.product_versions;
  v_current_active UUID;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  SELECT * INTO v_target FROM public.product_versions WHERE id = p_target_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target version not found';
  END IF;

  IF v_target.product_id <> p_product_id THEN
    RAISE EXCEPTION 'Version does not belong to product';
  END IF;

  IF v_target.state = 'active' THEN
    RAISE EXCEPTION 'Target version is already active';
  END IF;

  IF v_target.state NOT IN ('retired', 'testing') THEN
    RAISE EXCEPTION 'Target version must be retired or testing to be rolled back';
  END IF;

  SELECT id INTO v_current_active
  FROM public.product_versions
  WHERE product_id = p_product_id AND state = 'active'
  FOR UPDATE;

  UPDATE public.product_versions
  SET state = 'retired', retired_at = NOW()
  WHERE product_id = p_product_id AND state = 'active';

  UPDATE public.product_versions
  SET state = 'active', published_at = NOW(), retired_at = NULL
  WHERE id = p_target_version_id;

  UPDATE public.products
  SET public_status = 'active'
  WHERE id = p_product_id;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after, reason)
  VALUES (
    v_user_id,
    'product_version.rollback',
    'product_version',
    p_target_version_id,
    jsonb_build_object('previous_active_version_id', v_current_active),
    jsonb_build_object(
      'product_id', p_product_id,
      'version_id', p_target_version_id
    ),
    NULLIF(trim(p_reason), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_product_version(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_product_version(UUID, UUID, TEXT) TO authenticated;

-- 8. Atomic product status transitions (pause/unpause/retire/archive/etc).
CREATE OR REPLACE FUNCTION public.transition_product_status(
  p_product_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_old_status TEXT;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  IF p_new_status NOT IN ('active', 'paused', 'retired') THEN
    RAISE EXCEPTION 'Invalid product status transition: %', p_new_status;
  END IF;

  IF p_new_status = 'active' AND NOT EXISTS (
    SELECT 1 FROM public.product_versions
    WHERE product_id = p_product_id AND state = 'active'
  ) THEN
    RAISE EXCEPTION 'A product requires an active version before it can be activated';
  END IF;

  SELECT public_status INTO v_old_status FROM public.products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  UPDATE public.products
  SET public_status = p_new_status
  WHERE id = p_product_id;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after, reason)
  VALUES (
    v_user_id,
    'product.status.transition',
    'product',
    p_product_id,
    jsonb_build_object('public_status', v_old_status),
    jsonb_build_object('public_status', p_new_status),
    NULLIF(trim(p_reason), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_product_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_product_status(UUID, TEXT, TEXT) TO authenticated;

-- 9. Helper to clone an active version into a new draft when an admin attempts
-- to edit a published (immutable) version.
CREATE OR REPLACE FUNCTION public.clone_version_as_draft(
  p_source_version_id UUID
)
RETURNS public.product_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_source public.product_versions;
  v_product_id UUID;
  v_next_version INT;
  v_new public.product_versions;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  SELECT * INTO v_source FROM public.product_versions WHERE id = p_source_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source version not found';
  END IF;

  v_product_id := v_source.product_id;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.product_versions
  WHERE product_id = v_product_id;

  INSERT INTO public.product_versions (
    product_id, version_number, state, private_instruction_template,
    private_negative_instruction, provider_strategy, model_config,
    input_validation_config, post_process_config, safety_config, credit_cost,
    created_by_admin_id
  )
  SELECT
    product_id, v_next_version, 'draft', private_instruction_template,
    private_negative_instruction, provider_strategy, model_config,
    input_validation_config, post_process_config, safety_config, credit_cost,
    (SELECT auth.uid())
  FROM public.product_versions
  WHERE id = p_source_version_id
  RETURNING * INTO v_new;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (
    v_user_id,
    'product_version.clone_draft',
    'product_version',
    v_new.id,
    jsonb_build_object('source_version_id', p_source_version_id),
    jsonb_build_object(
      'product_id', v_product_id,
      'version_number', v_next_version
    )
  );

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_version_as_draft(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_version_as_draft(UUID) TO authenticated;
