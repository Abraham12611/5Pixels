-- 5.3 Explore: add search, sorting, and pagination to public catalog RPC.

DROP FUNCTION IF EXISTS public.get_public_catalog(TEXT, TEXT, UUID[]);

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
  credit_cost INT,
  metadata JSONB,
  hero_asset_id UUID,
  poster_asset_id UUID,
  preview_gif_asset_id UUID,
  preview_video_asset_id UUID,
  public_assets JSONB,
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
      p.hero_asset_id,
      p.poster_asset_id,
      p.preview_gif_asset_id,
      p.preview_video_asset_id,
      p.created_at
    FROM public.products p
    LEFT JOIN public.categories c ON c.id = p.category_id
    JOIN public.product_versions v
      ON v.product_id = p.id
     AND v.state = 'active'
    WHERE p.public_status = 'active'
      AND p.visibility = 'public'
      AND (p_type IS NULL OR p.type = p_type)
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (
        p_product_ids IS NULL
        OR array_length(p_product_ids, 1) IS NULL
        OR p.id = ANY (p_product_ids)
      )
      AND (
        p_search IS NULL
        OR p_search = ''
        OR p.name ILIKE '%' || p_search || '%'
        OR p.short_description ILIKE '%' || p_search || '%'
        OR p.long_description ILIKE '%' || p_search || '%'
        OR c.name ILIKE '%' || p_search || '%'
      )
  ),
  total AS (
    SELECT COUNT(*)::BIGINT AS total_count FROM filtered
  ),
  ordered AS (
    SELECT
      filtered.*,
      total.total_count,
      CASE
        WHEN p_sort = 'newest' THEN ROW_NUMBER() OVER (ORDER BY filtered.created_at DESC)
        WHEN p_sort = 'name_asc' THEN ROW_NUMBER() OVER (ORDER BY filtered.name ASC)
        WHEN p_sort = 'name_desc' THEN ROW_NUMBER() OVER (ORDER BY filtered.name DESC)
        WHEN p_sort = 'credits_asc' THEN ROW_NUMBER() OVER (ORDER BY filtered.credit_cost ASC, filtered.name ASC)
        WHEN p_sort = 'credits_desc' THEN ROW_NUMBER() OVER (ORDER BY filtered.credit_cost DESC, filtered.name ASC)
        ELSE ROW_NUMBER() OVER (
          ORDER BY
            CASE WHEN filtered.featured_rank IS NULL THEN 1 ELSE 0 END,
            filtered.featured_rank ASC NULLS LAST,
            filtered.name ASC
        )
      END AS row_num
    FROM filtered
    CROSS JOIN total
  )
  SELECT
    o.id,
    o.slug,
    o.name,
    o.type,
    o.short_description,
    o.long_description,
    o.category_id,
    o.category_slug,
    o.category_name,
    o.featured_rank,
    o.version_number,
    o.credit_cost,
    CASE
      WHEN o.type = 'filter' THEN jsonb_build_object('filter_config', COALESCE(o.metadata->'filter_config', '{}'::JSONB))
      WHEN o.type = 'poster' THEN jsonb_build_object('poster_config', COALESCE(o.metadata->'poster_config', '{}'::JSONB))
      ELSE '{}'::JSONB
    END AS metadata,
    o.hero_asset_id,
    o.poster_asset_id,
    o.preview_gif_asset_id,
    o.preview_video_asset_id,
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
              pa.created_at
            FROM public.product_assets pa
            JOIN public.assets a ON a.id = pa.asset_id
            WHERE pa.product_id = o.id
              AND pa.internal_only = FALSE
              AND a.visibility = 'public'
            UNION ALL
            SELECT 'hero', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = o.hero_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'poster', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = o.poster_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_gif', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = o.preview_gif_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_video', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = o.preview_video_asset_id AND a.visibility = 'public'
          ) combined
          ORDER BY combined.role, combined.sort_order, combined.created_at
        ) sub
      ),
      '[]'::JSONB
    ) AS public_assets,
    o.total_count
  FROM ordered o
  ORDER BY o.row_num
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
$$;

REVOKE ALL ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT) TO anon, authenticated;

-- Enable trigram extension for performant ILIKE search.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_search_trgm ON public.products USING GIN ((COALESCE(name, '') || ' ' || COALESCE(short_description, '') || ' ' || COALESCE(long_description, '')) gin_trgm_ops);
