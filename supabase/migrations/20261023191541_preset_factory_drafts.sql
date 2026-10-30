-- #271 Preset Factory: atomic, idempotent draft creation for the private
-- ChatGPT plugin workstream (epic #270).
CREATE TABLE public.preset_factory_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id),
  batch_id TEXT NOT NULL,
  client_item_id TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  version_id UUID REFERENCES public.product_versions(id) ON DELETE SET NULL,
  request_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (admin_user_id, idempotency_key)
);

CREATE INDEX idx_preset_factory_operations_batch
  ON public.preset_factory_operations(admin_user_id, batch_id);

ALTER TABLE public.preset_factory_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preset_factory_operations_owner_select"
  ON public.preset_factory_operations
  FOR SELECT USING (
    admin_user_id = auth.uid()
    AND (public.is_admin() OR public.is_owner())
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.preset_factory_operations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_preset_draft(
  p_product JSONB,
  p_metadata JSONB,
  p_version JSONB,
  p_fields JSONB,
  p_asset_links JSONB,
  p_batch_id TEXT,
  p_client_item_id TEXT,
  p_idempotency_key TEXT,
  p_request_fingerprint TEXT
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

  IF NULLIF(btrim(p_request_fingerprint), '') IS NULL THEN
    RAISE EXCEPTION 'PF_BAD_REQUEST: request fingerprint is required';
  END IF;

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
      IF v_existing.request_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RAISE EXCEPTION
          'PF_IDEMPOTENCY_CONFLICT: idempotency key replayed with a different payload';
      END IF;
      RETURN jsonb_build_object(
        'reused', true,
        'product_id', v_existing.product_id,
        'version_id', v_existing.version_id,
        'slug', (SELECT slug FROM public.products WHERE id = v_existing.product_id)
      );
  END;

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

  FOR v_link IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_asset_links, '[]'::jsonb))
  LOOP
    SELECT * INTO v_asset FROM public.assets WHERE id = (v_link->>'asset_id')::UUID;
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
  JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_preset_draft(
  JSONB, JSONB, JSONB, JSONB, JSONB, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
