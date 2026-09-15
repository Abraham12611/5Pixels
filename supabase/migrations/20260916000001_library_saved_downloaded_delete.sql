-- Library support: per-generation saved/downloaded flags, safe owner
-- mutations (save, download-mark, delete), and a favorite-product lookup
-- that keeps unavailable presets visible as retired cards.
-- Applied via Supabase MCP on 2026-09-16; kept here for migration parity.

-- 1. Flags on generations ---------------------------------------------------

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_generations_user_saved
  ON public.generations (user_id, saved_at DESC)
  WHERE saved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generations_user_downloaded
  ON public.generations (user_id, downloaded_at DESC)
  WHERE downloaded_at IS NOT NULL;

-- 2. History tables keep their rows when a generation is deleted ------------

ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_generation_id_fkey;
ALTER TABLE public.credit_ledger
  ADD CONSTRAINT credit_ledger_generation_id_fkey
  FOREIGN KEY (generation_id) REFERENCES public.generations(id)
  ON DELETE SET NULL;

ALTER TABLE public.fal_usage_logs
  DROP CONSTRAINT IF EXISTS fal_usage_logs_generation_id_fkey;
ALTER TABLE public.fal_usage_logs
  ADD CONSTRAINT fal_usage_logs_generation_id_fkey
  FOREIGN KEY (generation_id) REFERENCES public.generations(id)
  ON DELETE SET NULL;

-- 3. get_user_generations: expose saved/downloaded ---------------------------

DROP FUNCTION IF EXISTS public.get_user_generations();
CREATE OR REPLACE FUNCTION public.get_user_generations()
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
  saved_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ
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
    g.saved_at,
    g.downloaded_at
  FROM public.generations g
  JOIN public.products p ON p.id = g.product_id
  LEFT JOIN public.generation_outputs go ON go.generation_id = g.id AND go.is_primary = TRUE
  LEFT JOIN public.assets a ON a.id = go.asset_id
  WHERE g.user_id = (SELECT auth.uid())
  ORDER BY g.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_user_generations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_generations() TO authenticated;

-- 4. get_user_generation_by_id: expose saved/downloaded ----------------------

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
  downloaded_at TIMESTAMPTZ
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
    g.downloaded_at
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

-- 5. set_generation_saved: owner-scoped save toggle --------------------------

CREATE OR REPLACE FUNCTION public.set_generation_saved(
  p_generation_id UUID,
  p_saved BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.generations
  SET saved_at = CASE WHEN p_saved THEN now() ELSE NULL END
  WHERE id = p_generation_id
    AND user_id = (SELECT auth.uid());
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_generation_saved(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_generation_saved(UUID, BOOLEAN) TO authenticated;

-- 6. mark_generation_downloaded: owner-scoped download marker ----------------

CREATE OR REPLACE FUNCTION public.mark_generation_downloaded(
  p_generation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.generations
  SET downloaded_at = now()
  WHERE id = p_generation_id
    AND user_id = (SELECT auth.uid())
    AND status = 'completed';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_generation_downloaded(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_generation_downloaded(UUID) TO authenticated;

-- 7. delete_generation: removes the generation (outputs + feedback cascade),
-- then deletes asset rows left unreferenced, returning their storage refs so
-- the caller can remove the underlying objects.

CREATE OR REPLACE FUNCTION public.delete_generation(
  p_generation_id UUID
)
RETURNS TABLE (bucket TEXT, storage_key TEXT)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner UUID;
  v_asset_ids UUID[];
BEGIN
  SELECT g.user_id INTO v_owner
  FROM public.generations g
  WHERE g.id = p_generation_id;

  IF v_owner IS NULL OR v_owner IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN;
  END IF;

  SELECT array_agg(x.asset_id) INTO v_asset_ids
  FROM (
    SELECT g.source_asset_id AS asset_id
    FROM public.generations g
    WHERE g.id = p_generation_id
    UNION
    SELECT go.asset_id
    FROM public.generation_outputs go
    WHERE go.generation_id = p_generation_id
  ) x;

  DELETE FROM public.generations WHERE id = p_generation_id;

  RETURN QUERY
  WITH doomed AS (
    DELETE FROM public.assets a
    WHERE a.id = ANY (COALESCE(v_asset_ids, ARRAY[]::UUID[]))
      AND a.owner_user_id = (SELECT auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM public.generations g WHERE g.source_asset_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.generation_outputs go WHERE go.asset_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.product_assets pa WHERE pa.asset_id = a.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.hero_asset_id = a.id
           OR p.poster_asset_id = a.id
           OR p.preview_gif_asset_id = a.id
           OR p.preview_video_asset_id = a.id
      )
    RETURNING a.bucket, a.storage_key
  )
  SELECT d.bucket, d.storage_key FROM doomed d;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_generation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_generation(UUID) TO authenticated;

-- 8. get_user_favorite_products: favorites incl. unavailable presets ---------
-- Same public-safe column set as get_public_catalog plus availability and the
-- favorited timestamp, so retired saves render as muted cards instead of
-- vanishing.

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
  favorited_at TIMESTAMPTZ
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
    (p.public_status = 'active' AND p.visibility = 'public') AS is_available,
    f.created_at AS favorited_at
  FROM public.favorites f
  JOIN public.products p ON p.id = f.product_id
  LEFT JOIN public.categories c ON c.id = p.category_id
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
