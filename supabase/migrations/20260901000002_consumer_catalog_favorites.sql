-- Milestone: consumer catalog, starter taxonomy, and favorites.
--
-- Runs after 20260901000001_publish_gates_admin_actions.sql.

-- 1. Seed a conservative idempotent starter taxonomy. Conflicts leave any
-- admin-edited values untouched.
INSERT INTO public.categories (slug, name, description, sort_order, is_active)
VALUES
  ('cinematic',   'Cinematic',   'Dramatic lighting and film-grade color grading.',      1, TRUE),
  ('portraits',   'Portraits',   'Studio and editorial portrait styles.',                2, TRUE),
  ('illustration', 'Illustration', 'Illustrated, painterly, and stylized looks.',         3, TRUE),
  ('vintage',     'Vintage',     'Retro, analog, and timeless aesthetics.',               4, TRUE),
  ('professional', 'Professional', 'LinkedIn-ready headshots and corporate visuals.',     5, TRUE),
  ('posters',     'Posters',     'Bold typographic posters and event artwork.',           6, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 2. Harden favorites RLS with explicit authenticated role, WITH CHECK for
-- writes, and supporting indexes.
DROP POLICY IF EXISTS "favorites_owner" ON public.favorites;

CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "favorites_update_own" ON public.favorites
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON public.favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON public.favorites(created_at DESC);

-- 3. Safe helper to verify a product is publicly available. Used by server
-- actions before mutating favorites.
CREATE OR REPLACE FUNCTION public.is_public_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.public_status = 'active'
      AND p.visibility = 'public'
      AND EXISTS (
        SELECT 1
        FROM public.product_versions v
        WHERE v.product_id = p.id
          AND v.state = 'active'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_public_product(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_product(UUID) TO authenticated;

-- 4. Public catalog RPC. Exposes only public-safe metadata:
-- product identity, active version number/credit cost, category, public
-- product-level asset IDs, and public product metadata. Never private
-- instructions, provider/model config, internal assets, or non-active versions.
CREATE OR REPLACE FUNCTION public.get_public_catalog(
  p_type TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_product_ids UUID[] DEFAULT NULL
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
  public_assets JSONB
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
            WHERE pa.product_id = p.id
              AND pa.internal_only = FALSE
              AND a.visibility = 'public'
            UNION ALL
            SELECT 'hero', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.hero_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'poster', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.poster_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_gif', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.preview_gif_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_video', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.preview_video_asset_id AND a.visibility = 'public'
          ) combined
          ORDER BY combined.role, combined.sort_order, combined.created_at
        ) sub
      ),
      '[]'::JSONB
    ) AS public_assets
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
  ORDER BY
    CASE WHEN p.featured_rank IS NULL THEN 1 ELSE 0 END,
    p.featured_rank ASC NULLS LAST,
    p.name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[]) TO anon, authenticated;

-- 5. Public product detail RPC. Includes active public fields and public asset
-- metadata, but no private recipe data.
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
  version_number INT,
  credit_cost INT,
  metadata JSONB,
  hero_asset_id UUID,
  poster_asset_id UUID,
  preview_gif_asset_id UUID,
  preview_video_asset_id UUID,
  active_fields JSONB,
  public_assets JSONB
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
              pa.created_at
            FROM public.product_assets pa
            JOIN public.assets a ON a.id = pa.asset_id
            WHERE pa.product_id = p.id
              AND pa.internal_only = FALSE
              AND a.visibility = 'public'
            UNION ALL
            SELECT 'hero', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.hero_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'poster', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.poster_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_gif', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.preview_gif_asset_id AND a.visibility = 'public'
            UNION ALL
            SELECT 'preview_video', a.id, 0, '{}'::JSONB, a.bucket, a.storage_key, a.mime_type, a.width, a.height, a.created_at
            FROM public.assets a
            WHERE a.id = p.preview_video_asset_id AND a.visibility = 'public'
          ) combined
          ORDER BY combined.role, combined.sort_order, combined.created_at
        ) sub
      ),
      '[]'::JSONB
    ) AS public_assets
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  JOIN public.product_versions v
    ON v.product_id = p.id
   AND v.state = 'active'
  WHERE p.slug = p_slug
    AND p.public_status = 'active'
    AND p.visibility = 'public';
$$;

REVOKE ALL ON FUNCTION public.get_public_product_by_slug(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_by_slug(TEXT) TO anon, authenticated;
