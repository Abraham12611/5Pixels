-- #251: stale-draft version resolution.
--
-- Incident: a product whose live (active) version is v5 can still carry a
-- leftover draft v4. State-first selection preferred the draft, so the admin
-- editor displayed v4's recipe as though it were the live preset — and a
-- direct publish call could retire live v5 in favour of the older draft.
--
-- This migration:
--   1. Blocks publish_product_version when the target version is older than
--      the current active version — a stale draft must be resolved through
--      the discard/rebase workflow, never silently published over live.
--   2. Switches admin_duplicate_product's editable-source pick to the same
--      newest-version ordering the app now uses, so a copy clones the live
--      recipe instead of a stale draft.
--   3. Extends clone_version_as_draft to rebind version-scoped product_assets
--      links — cloning a live version previously dropped its bound reference
--      assets, which would make a rebase lose recipe inputs.
--   4. Adds admin_resolve_stale_versions: the explicit conflict-resolution
--      workflow — retire every stale draft (discard) and optionally clone the
--      live version into a fresh draft (rebase). Atomic, audited.
--
-- No live routing, pricing, or product data changes: nothing reads versions
-- differently at runtime; the guards only affect which versions admins can
-- publish/discard.

-- 1. publish_product_version: stale-draft conflict guard -------------------

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

  -- Stale-draft conflict (#251): a version numbered below the live one is an
  -- abandoned leftover — publishing it would roll the preset back to an older
  -- recipe without an explicit conflict-resolution step. Discard or rebase it
  -- via admin_resolve_stale_versions first; there is no override because
  -- rollback_product_version covers intentional reversions.
  IF v_version.version_number < (
    SELECT version_number
    FROM public.product_versions
    WHERE product_id = p_product_id AND state = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot publish: v% is older than the live v% — discard or rebase the stale draft first',
      v_version.version_number,
      (SELECT version_number
       FROM public.product_versions
       WHERE product_id = p_product_id AND state = 'active');
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

-- 2. admin_duplicate_product: newest-version source pick (#251) ------------
-- Body unchanged except the editable-source ORDER BY: version number first,
-- so a stale draft can never silently supply the copy's recipe.

CREATE OR REPLACE FUNCTION public.admin_duplicate_product(
  p_source_product_id UUID,
  p_slug TEXT,
  p_name TEXT,
  p_parent_product_id UUID DEFAULT NULL,
  p_variant_display_name TEXT DEFAULT NULL
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_source public.products;
  v_source_version public.product_versions;
  v_new public.products;
  v_new_version_id UUID;
  v_sibling_count INT;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  SELECT * INTO v_source
  FROM public.products WHERE id = p_source_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source product not found';
  END IF;

  IF p_parent_product_id IS NOT NULL THEN
    -- Variant rules (single level): the parent must be a root of the same
    -- type. The products trigger enforces these too; surfacing here keeps
    -- the failure inside the same atomic call.
    PERFORM 1 FROM public.products
    WHERE id = p_parent_product_id
      AND type = v_source.type
      AND parent_preset_id IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid variant parent';
    END IF;
  END IF;

  -- Deterministic editable source version: the newest draft/testing/active
  -- version. Version number — not state — decides, so a stale draft numbered
  -- below the live version can never masquerade as the current recipe (#251).
  -- Retired versions are never an editable source: a product whose only
  -- versions are retired has no duplicable recipe and fails the check below.
  SELECT * INTO v_source_version
  FROM public.product_versions
  WHERE product_id = p_source_product_id
    AND state IN ('draft', 'testing', 'active')
  ORDER BY
    version_number DESC,
    CASE state WHEN 'draft' THEN 0 WHEN 'testing' THEN 1 ELSE 2 END
  LIMIT 1;

  -- Fail closed: a source with no usable version must never produce
  -- another incomplete product row.
  IF v_source_version.id IS NULL THEN
    RAISE EXCEPTION 'Cannot duplicate: product has no editable source version';
  END IF;

  SELECT COUNT(*) INTO v_sibling_count
  FROM public.products
  WHERE parent_preset_id = p_parent_product_id;

  INSERT INTO public.products (
    type, slug, name, short_description, long_description,
    public_prompt_recipe, category_id, public_status, visibility,
    likeness_level, featured_rank, hero_asset_id, poster_asset_id,
    preview_video_asset_id, preview_gif_asset_id, metadata,
    parent_preset_id, standalone_discoverable, variant_display_name,
    variant_sort_order
  )
  SELECT
    type, p_slug, p_name, short_description, long_description,
    public_prompt_recipe, category_id, 'draft', visibility,
    likeness_level, featured_rank, hero_asset_id, poster_asset_id,
    preview_video_asset_id, preview_gif_asset_id, metadata,
    p_parent_product_id,
    FALSE,
    CASE WHEN p_parent_product_id IS NULL THEN NULL
         ELSE p_variant_display_name END,
    CASE WHEN p_parent_product_id IS NULL THEN 0
         ELSE v_sibling_count END
  FROM public.products
  WHERE id = p_source_product_id
  RETURNING * INTO v_new;

  INSERT INTO public.product_versions (
    product_id, version_number, state, private_instruction_template,
    private_negative_instruction, provider_strategy, model_config,
    output_sizes, input_validation_config, input_mode, input_min_images,
    input_max_images, input_image_roles, prompt_override_enabled,
    prompt_max_chars, post_process_config, safety_config, credit_cost,
    created_by_admin_id
  )
  SELECT
    v_new.id, 1, 'draft', private_instruction_template,
    private_negative_instruction, provider_strategy, model_config,
    output_sizes, input_validation_config, input_mode, input_min_images,
    input_max_images, input_image_roles, prompt_override_enabled,
    prompt_max_chars, post_process_config, safety_config, credit_cost,
    v_user_id
  FROM public.product_versions
  WHERE id = v_source_version.id
  RETURNING id INTO v_new_version_id;

  INSERT INTO public.product_fields (
    product_id, field_key, label, help_text, field_type, required,
    sort_order, config, validation, active
  )
  SELECT
    v_new.id, field_key, label, help_text, field_type, required,
    sort_order, config, validation, active
  FROM public.product_fields
  WHERE product_id = p_source_product_id;

  -- Asset links: only product-level links and links bound to the SELECTED
  -- editable version are copied — references pinned to older versions must
  -- not leak into the new draft. Version-bound links rebind to the copy's
  -- new version so a later source edit never mutates this draft.
  INSERT INTO public.product_assets (
    product_id, product_version_id, asset_id, role, sort_order,
    internal_only, rights_metadata
  )
  SELECT
    v_new.id,
    CASE WHEN product_version_id IS NULL THEN NULL
         ELSE v_new_version_id END,
    asset_id, role, sort_order, internal_only, rights_metadata
  FROM public.product_assets
  WHERE product_id = p_source_product_id
    AND (product_version_id IS NULL
         OR product_version_id = v_source_version.id);

  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, before, after
  )
  VALUES (
    v_user_id,
    'product.duplicate',
    'product',
    v_new.id,
    jsonb_build_object('source_product_id', p_source_product_id),
    jsonb_build_object(
      'new_product_id', v_new.id,
      'parent_product_id', p_parent_product_id,
      'source_version_id', v_source_version.id
    )
  );

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_duplicate_product(UUID, TEXT, TEXT, UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_product(UUID, TEXT, TEXT, UUID, TEXT)
  TO authenticated;

-- 3. clone_version_as_draft: keep version-bound asset links (#251) ---------
-- Body unchanged except the added product_assets copy: reference assets
-- pinned to the source version must carry into the clone, or rebasing a
-- stale draft from live would silently drop recipe inputs.

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
    output_sizes, input_validation_config, input_mode, input_min_images,
    input_max_images, input_image_roles, prompt_override_enabled,
    prompt_max_chars, post_process_config, safety_config, credit_cost,
    created_by_admin_id
  )
  SELECT
    product_id, v_next_version, 'draft', private_instruction_template,
    private_negative_instruction, provider_strategy, model_config,
    output_sizes, input_validation_config, input_mode, input_min_images,
    input_max_images, input_image_roles, prompt_override_enabled,
    prompt_max_chars, post_process_config, safety_config, credit_cost,
    (SELECT auth.uid())
  FROM public.product_versions
  WHERE id = p_source_version_id
  RETURNING * INTO v_new;

  -- Rebind reference assets pinned to the source version — the clone keeps
  -- the same recipe inputs. Product-level links are shared and untouched.
  INSERT INTO public.product_assets (
    product_id, product_version_id, asset_id, role, sort_order,
    internal_only, rights_metadata
  )
  SELECT
    v_product_id, v_new.id, asset_id, role, sort_order,
    internal_only, rights_metadata
  FROM public.product_assets
  WHERE product_id = v_product_id
    AND product_version_id = p_source_version_id;

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

-- 4. admin_resolve_stale_versions: the explicit conflict-resolution step ---
--
-- Retires every draft/testing version numbered below the live version, then
-- optionally clones live into a fresh draft — the two halves of "discard /
-- rebase" in one atomic call. The live version and product row are never
-- modified; the new draft starts from exactly what customers use.

CREATE OR REPLACE FUNCTION public.admin_resolve_stale_versions(
  p_product_id UUID,
  p_create_draft BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_active public.product_versions;
  v_stale_ids UUID[];
  v_new_draft public.product_versions;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  -- Serialise against concurrent saves/duplicates on the same product.
  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  SELECT * INTO v_active
  FROM public.product_versions
  WHERE product_id = p_product_id AND state = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product has no live version to rebase stale drafts against';
  END IF;

  SELECT array_agg(id ORDER BY version_number) INTO v_stale_ids
  FROM (
    SELECT id, version_number
    FROM public.product_versions
    WHERE product_id = p_product_id
      AND state IN ('draft', 'testing')
      AND version_number < v_active.version_number
    FOR UPDATE
  ) stale;

  IF v_stale_ids IS NULL OR cardinality(v_stale_ids) = 0 THEN
    RAISE EXCEPTION 'Product has no stale versions — nothing to resolve';
  END IF;

  -- Discard: retiring keeps the rows for history/rollback while removing
  -- them from every editable/publishable path.
  UPDATE public.product_versions
  SET state = 'retired', retired_at = NOW()
  WHERE id = ANY (v_stale_ids);

  -- Rebase: a fresh draft cloned from live — version-bound reference assets
  -- are rebound inside clone_version_as_draft.
  IF p_create_draft THEN
    v_new_draft := public.clone_version_as_draft(v_active.id);
  END IF;

  INSERT INTO public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, before, after)
  VALUES (
    v_user_id,
    'product_version.resolve_stale',
    'product_version',
    v_active.id,
    jsonb_build_object(
      'stale_version_ids', to_jsonb(v_stale_ids)
    ),
    jsonb_build_object(
      'product_id', p_product_id,
      'active_version_id', v_active.id,
      'new_draft_version_id', v_new_draft.id
    )
  );

  RETURN v_new_draft.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_stale_versions(UUID, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_stale_versions(UUID, BOOLEAN)
  TO authenticated;
