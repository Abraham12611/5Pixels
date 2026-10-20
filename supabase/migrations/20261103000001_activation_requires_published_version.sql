-- #233 follow-up: gate catalog activation on a published recipe version.
--
-- The editor's catalog-status field reaches products.public_status through
-- admin_update_product's JSONB patch, bypassing the active-version rule
-- that transition_product_status() has always enforced — a preset with no
-- published recipe could be saved straight to 'active' (the hosted
-- Retro Slam Manga anomaly).
--
-- The guard only fires on the transition INTO 'active': products already
-- active keep saving so they remain editable/repairable, and
-- publish_product_version() — which activates the product atomically
-- after marking the version active — is unaffected. No deadlock.
--
-- SECURITY DEFINER surface is unchanged: same signature, same in-body
-- is_admin()/is_owner() gate, same grants, same atomicity.
--
-- This is a forward-only replace of the function body; the applied
-- 20261102000001 migration is left byte-identical.

CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_product_id UUID,
  p_product JSONB,
  p_source_version_id UUID,
  p_version JSONB,
  p_fields JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := (SELECT auth.uid());
  v_before public.products;
  v_after public.products;
  v_p public.products;
  v_v public.product_versions;
  v_existing_version public.product_versions;
  v_effective_version_id UUID := p_source_version_id;
BEGIN
  IF v_user_id IS NULL OR NOT (public.is_admin() OR public.is_owner()) THEN
    RAISE EXCEPTION 'Forbidden: admin or owner required';
  END IF;

  SELECT * INTO v_before
  FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Fail closed: never report a successful save for a product with no
  -- editable version — that is exactly the incomplete state #233 removes.
  IF p_source_version_id IS NULL OR p_version IS NULL THEN
    RAISE EXCEPTION 'Cannot save: product has no editable source version';
  END IF;

  -- Merge onto the before-image: keys absent from p_product keep their
  -- current value instead of being nulled out.
  v_p := jsonb_populate_record(
    NULL::public.products, to_jsonb(v_before) || p_product
  );

  -- Catalog activation must go through a published recipe — the same rule
  -- transition_product_status() enforces; a save must not bypass it by
  -- writing public_status directly. Products that are already 'active'
  -- keep saving so their metadata remains editable/repairable; only the
  -- transition INTO active is gated here.
  IF v_before.public_status IS DISTINCT FROM 'active'
     AND v_p.public_status = 'active'
     AND NOT EXISTS (
       SELECT 1 FROM public.product_versions
       WHERE product_id = p_product_id AND state = 'active'
     ) THEN
    RAISE EXCEPTION
      'A product requires an active version before it can be activated';
  END IF;

  UPDATE public.products SET
    type = v_p.type,
    slug = v_p.slug,
    name = v_p.name,
    short_description = v_p.short_description,
    long_description = v_p.long_description,
    public_prompt_recipe = v_p.public_prompt_recipe,
    category_id = v_p.category_id,
    public_status = v_p.public_status,
    visibility = v_p.visibility,
    likeness_level = v_p.likeness_level,
    featured_rank = v_p.featured_rank,
    hero_asset_id = v_p.hero_asset_id,
    poster_asset_id = v_p.poster_asset_id,
    preview_video_asset_id = v_p.preview_video_asset_id,
    preview_gif_asset_id = v_p.preview_gif_asset_id,
    -- Partial metadata updates merge: keys absent from the patch (e.g.
    -- prompt_ui when only filter_config is submitted) keep their value.
    metadata = COALESCE(v_before.metadata, '{}'::JSONB)
               || COALESCE(v_p.metadata, '{}'::JSONB),
    parent_preset_id = v_p.parent_preset_id,
    standalone_discoverable = COALESCE(v_p.standalone_discoverable, FALSE),
    variant_display_name = v_p.variant_display_name,
    variant_sort_order = COALESCE(v_p.variant_sort_order, 0)
  WHERE id = p_product_id
  RETURNING * INTO v_after;

  -- Editable version: update in place unless the source is active — the
  -- recipe is immutable once published, so clone then edit the clone.
  PERFORM 1 FROM public.product_versions
  WHERE id = p_source_version_id AND product_id = p_product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source version not found';
  END IF;

  IF (SELECT state FROM public.product_versions WHERE id = p_source_version_id)
     = 'active' THEN
    v_effective_version_id :=
      (SELECT id FROM public.clone_version_as_draft(p_source_version_id));
  END IF;

  -- Merge the patch onto the effective row (the clone when the source was
  -- active): keys absent from p_version keep their current value.
  SELECT * INTO v_existing_version
  FROM public.product_versions WHERE id = v_effective_version_id;
  v_v := jsonb_populate_record(
    NULL::public.product_versions,
    to_jsonb(v_existing_version) || p_version
  );

  UPDATE public.product_versions SET
    private_instruction_template = v_v.private_instruction_template,
    private_negative_instruction = v_v.private_negative_instruction,
    provider_strategy = v_v.provider_strategy,
    model_config = v_v.model_config,
    output_sizes = v_v.output_sizes,
    input_validation_config = v_v.input_validation_config,
    input_mode = v_v.input_mode,
    input_min_images = v_v.input_min_images,
    input_max_images = v_v.input_max_images,
    input_image_roles = v_v.input_image_roles,
    prompt_override_enabled = v_v.prompt_override_enabled,
    prompt_max_chars = v_v.prompt_max_chars,
    post_process_config = v_v.post_process_config,
    safety_config = v_v.safety_config,
    credit_cost = v_v.credit_cost
  WHERE id = v_effective_version_id;

  -- NULL p_fields = fields untouched; [] = delete all; array = replace set.
  IF p_fields IS NOT NULL THEN
    DELETE FROM public.product_fields WHERE product_id = p_product_id;
    INSERT INTO public.product_fields (
      product_id, field_key, label, help_text, field_type, required,
      sort_order, config, validation, active
    )
    SELECT
      p_product_id, field_key, label, help_text, field_type,
      COALESCE(required, FALSE), COALESCE(sort_order, 0),
      COALESCE(config, '{}'::JSONB), COALESCE(validation, '{}'::JSONB),
      COALESCE(active, TRUE)
    FROM jsonb_populate_recordset(NULL::public.product_fields, p_fields);
  END IF;

  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, before, after
  )
  VALUES (
    v_user_id,
    'product.update',
    'product',
    p_product_id,
    to_jsonb(v_before),
    to_jsonb(v_after)
  );

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'effective_version_id', v_effective_version_id
  );
END;
$$;

-- Grants unchanged — re-asserted for clarity since CREATE OR REPLACE
-- preserves existing privileges.
REVOKE ALL ON FUNCTION public.admin_update_product(UUID, JSONB, UUID, JSONB, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_product(UUID, JSONB, UUID, JSONB, JSONB)
  TO authenticated;
