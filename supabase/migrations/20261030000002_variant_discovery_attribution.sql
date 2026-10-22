-- 20261030000001_variant_discovery_attribution.sql
-- ============================================================================
-- #181 — Standalone-variant discovery: parent attribution for canonical SEO
-- and favorites/library "part of {parent}" context.
--
-- The discoverability predicate itself shipped in
-- 20261028000001_preset_family_input_contract.sql: get_public_catalog excludes
-- family children unless standalone_discoverable = TRUE across every
-- type/category/search/sort/pagination path, and get_public_product_by_slug
-- still resolves a dependent child's direct URL. This migration adds the
-- parent context those two surfaces need:
--
--   1. get_public_product_by_slug gains parent_slug / parent_name /
--      parent_is_public so the preset detail page can emit a
--      canonical-to-parent <link> for dependent variants (or noindex when
--      the parent itself is unreachable) and render "part of" attribution.
--
--   2. get_user_favorite_products gains parent_preset_id /
--      standalone_discoverable / parent_slug / parent_name so a favorited
--      dependent child still resolves with clear family attribution instead
--      of silently advertising itself as standalone.
--
-- Both rewrites are pure column additions — visibility and availability
-- predicates are unchanged, SECURITY DEFINER + search_path hardening is
-- preserved, and grants are re-applied after the required DROP.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. get_public_product_by_slug — + parent attribution columns
-- ---------------------------------------------------------------------------

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
  input_capability JSONB,
  parent_slug TEXT,
  parent_name TEXT,
  parent_is_public BOOLEAN
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
    ) AS input_capability,
    par.slug AS parent_slug,
    par.name AS parent_name,
    -- Whether the parent's own public page resolves — drives the
    -- canonical-to-parent vs noindex decision for dependent variants.
    (par.id IS NOT NULL AND par.visibility = 'public' AND par.public_status = 'active')
      AS parent_is_public
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  LEFT JOIN public.products par ON par.id = p.parent_preset_id
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
-- 2. get_user_favorite_products — + family attribution columns
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_user_favorite_products();
CREATE OR REPLACE FUNCTION public.get_user_favorite_products()
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
  is_available BOOLEAN,
  favorited_at TIMESTAMPTZ,
  parent_preset_id UUID,
  standalone_discoverable BOOLEAN,
  parent_slug TEXT,
  parent_name TEXT
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
    v.version_number,
    COALESCE(v.credit_cost, 0) AS credit_cost,
    p.metadata,
    p.hero_asset_id,
    p.poster_asset_id,
    p.preview_gif_asset_id,
    p.preview_video_asset_id,
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
    -- A dependent variant remains usable through its direct URL and the
    -- parent's family selector, so availability still tracks the product's
    -- own publish state — not its discoverability mode.
    (p.public_status = 'active' AND p.visibility = 'public') AS is_available,
    f.created_at AS favorited_at,
    p.parent_preset_id,
    p.standalone_discoverable,
    par.slug AS parent_slug,
    par.name AS parent_name
  FROM public.favorites f
  JOIN public.products p ON p.id = f.product_id
  LEFT JOIN public.categories c ON c.id = p.category_id
  LEFT JOIN public.products par ON par.id = p.parent_preset_id
  LEFT JOIN public.product_versions v ON v.id = (
    SELECT id
    FROM public.product_versions
    WHERE product_id = p.id AND state = 'active'
    ORDER BY version_number DESC
    LIMIT 1
  )
  WHERE f.user_id = (SELECT auth.uid())
  ORDER BY f.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_user_favorite_products() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_favorite_products() TO authenticated;
