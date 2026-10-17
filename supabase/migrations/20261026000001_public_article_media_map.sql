-- #131 — Public article detail: published media map + first-published date.
--
-- Published snapshots persist media as asset://{assetId} references inside the
-- block document. Anonymous readers need those resolved to public bucket
-- objects, but get_public_article_by_slug only projected the cover and author
-- avatar. This full-replacement adds:
--   media               JSONB map  assetId -> {assetId, bucket, storageKey,
--                       mimeType, width, height} covering ONLY the article's
--                       currently published media rows (article_assets.state =
--                       'published' AND a live, public assets row). Assets
--                       de-referenced by a republish flip out of 'published'
--                       and stop appearing here — the map always mirrors what
--                       the live snapshot may legally show.
--   first_published_at  articles.first_published_at, so the reader page can
--                       distinguish "Published" from "Updated" after a
--                       republish.

DROP FUNCTION IF EXISTS public.get_public_article_by_slug(TEXT);

CREATE FUNCTION public.get_public_article_by_slug(p_slug TEXT)
RETURNS TABLE (
  article_id UUID,
  slug TEXT,
  title TEXT,
  summary TEXT,
  topic TEXT,
  tags TEXT[],
  cover JSONB,
  content JSONB,
  media JSONB,
  schema_version INT,
  author_display_name TEXT,
  author_avatar JSONB,
  published_at TIMESTAMPTZ,
  first_published_at TIMESTAMPTZ,
  publication_number BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    a.id AS article_id,
    pub.slug,
    pub.title,
    pub.summary,
    pub.topic,
    pub.tags,
    public.public_asset_json(pub.cover_asset_id) AS cover,
    pub.content,
    COALESCE(media.map, '{}'::jsonb) AS media,
    pub.schema_version,
    pub.author_display_name,
    public.public_asset_json(pub.author_avatar_asset_id) AS author_avatar,
    pub.published_at,
    a.first_published_at,
    pub.publication_number
  FROM public.articles a
  JOIN public.article_publications pub ON pub.id = a.current_publication_id
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(aa.asset_id::text, jsonb_build_object(
      'assetId', asst.id,
      'bucket', asst.bucket,
      'storageKey', asst.storage_key,
      'mimeType', asst.mime_type,
      'width', asst.width,
      'height', asst.height
    )) AS map
    FROM public.article_assets aa
    JOIN public.assets asst ON asst.id = aa.asset_id
    WHERE aa.article_id = a.id
      AND aa.state = 'published'
      AND asst.visibility = 'public'
      AND asst.deleted_at IS NULL
  ) media ON TRUE
  WHERE a.status = 'published'
    AND a.slug = lower(btrim(COALESCE(p_slug, '')));
$$;

REVOKE ALL ON FUNCTION public.get_public_article_by_slug(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_article_by_slug(TEXT) TO anon, authenticated;
