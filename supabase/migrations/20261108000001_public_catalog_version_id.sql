-- Restore version_id in get_public_catalog.
--
-- The RETURNS TABLE has never exposed version_id, but every consumer maps it
-- (lib/catalog/catalog-rows.ts) and the quick sheet derives
-- `available = version_id != null` from it — so every catalog preset has
-- always rendered "This look isn't available right now". The detail RPC
-- (get_public_product_by_slug) does return version_id, which masked the gap.
-- The active-version join already exists; this just exposes v.id.

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
  version_id UUID,
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
      v.id AS version_id,
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
        WHEN p_sort = 'credits_desc' THEN ROW_NUMBER() OVER (ORDER BY filtered.credit_cost DESC, filtered.name DESC)
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
    r.version_id,
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
