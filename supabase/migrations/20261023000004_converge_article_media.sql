-- fix(db): converge article-media functions with hosted-DB state (#139)
--
-- The hosted project applied an earlier draft of
-- 20261020000002_article_media.sql. Two code differences remain vs the
-- final version on develop (comments ignored):
--   1. public.save_article_draft(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT,
--      TEXT[], UUID, BOOLEAN, JSONB, INT, TEXT) on prod lacks the
--      invalid_cover_asset check (cover must be a ready/published
--      article_assets row of the same article).
--   2. public.sweep_stale_article_uploads(TIMESTAMPTZ) does not exist on
--      prod at all.
-- This re-states both final definitions verbatim from
-- 20261020000002_article_media.sql (commit b2506a6). It is a no-op on a
-- fresh `supabase db reset` of this repo and is idempotent.

-- 13. Stale-upload sweep -------------------------------------------------------------
-- Pending uploads that were never finalized leave orphan staging objects.
-- This deletes the DB rows and returns their staging keys for object cleanup.
-- Callable by staff and by the service role (scheduled job); not by anon.
CREATE OR REPLACE FUNCTION public.sweep_stale_article_uploads(
  p_older_than TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_keys JSONB;
BEGIN
  IF NOT (
    public.is_editorial_staff()
    OR (SELECT auth.role()) = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  WITH stale AS (
    DELETE FROM public.article_assets aa
    WHERE aa.state = 'pending'
      AND aa.created_at < p_older_than
    RETURNING aa.asset_id, aa.staging_key
  ), gone AS (
    DELETE FROM public.assets a
    USING stale s
    WHERE a.id = s.asset_id
    RETURNING s.staging_key
  )
  SELECT COALESCE(jsonb_agg(staging_key), '[]'::jsonb)
  INTO v_keys FROM gone;

  RETURN jsonb_build_object('deleted_keys', v_keys);
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_stale_article_uploads(TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sweep_stale_article_uploads(TIMESTAMPTZ) TO authenticated;

-- 14. Cover integrity in save_article_draft ------------------------------------------
-- The cover must come from the article's own media library: it is stored as
-- an asset id, promoted with the article, and can never be a raw URL or an
-- unlinked asset. Recreated with the additional check (full replacement).
CREATE OR REPLACE FUNCTION public.save_article_draft(
  p_article_id UUID,
  p_expected_edit_version BIGINT,
  p_title TEXT DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_topic TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_cover_asset_id UUID DEFAULT NULL,
  p_clear_cover BOOLEAN DEFAULT FALSE,
  p_content JSONB DEFAULT NULL,
  p_schema_version INT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual'
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
  v_new_slug TEXT;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_article
  FROM public.articles
  WHERE id = p_article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_article.edit_version <> p_expected_edit_version THEN
    RAISE EXCEPTION 'edit_version_conflict' USING ERRCODE = '40001';
  END IF;

  -- Cover must reference a verified media row belonging to THIS article.
  -- Forged or cross-article asset ids are rejected.
  IF p_cover_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.article_assets aa
    WHERE aa.article_id = p_article_id
      AND aa.asset_id = p_cover_asset_id
      AND aa.state IN ('ready', 'published')
  ) THEN
    RAISE EXCEPTION 'invalid_cover_asset' USING ERRCODE = 'P0001';
  END IF;

  -- Slug is locked once the article has ever been published.
  v_new_slug := NULL;
  IF p_slug IS NOT NULL AND p_slug <> v_article.slug THEN
    IF v_article.first_published_at IS NOT NULL THEN
      RAISE EXCEPTION 'slug_locked' USING ERRCODE = 'P0001';
    END IF;
    v_new_slug := public.article_slugify(p_slug);
    IF v_new_slug IS NULL THEN
      RAISE EXCEPTION 'invalid_slug' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_title IS NOT NULL AND char_length(p_title) > 200 THEN
    RAISE EXCEPTION 'title_too_long' USING ERRCODE = 'P0001';
  END IF;
  IF p_summary IS NOT NULL AND char_length(p_summary) > 1000 THEN
    RAISE EXCEPTION 'summary_too_long' USING ERRCODE = 'P0001';
  END IF;
  IF p_topic IS NOT NULL AND char_length(p_topic) > 64 THEN
    RAISE EXCEPTION 'topic_too_long' USING ERRCODE = 'P0001';
  END IF;
  IF p_tags IS NOT NULL AND (
    cardinality(p_tags) > 12
    OR EXISTS (
      SELECT 1 FROM unnest(p_tags) AS tags(tag)
      WHERE char_length(tag) > 40 OR tag !~ '^[a-z0-9-]+$'
    )
  ) THEN
    RAISE EXCEPTION 'invalid_tags' USING ERRCODE = 'P0001';
  END IF;
  IF p_content IS NOT NULL AND (
    jsonb_typeof(p_content) IS DISTINCT FROM 'array'
    OR pg_column_size(p_content) > 262144
  ) THEN
    RAISE EXCEPTION 'invalid_content' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.articles
  SET
    title = COALESCE(p_title, title),
    summary = COALESCE(p_summary, summary),
    slug = COALESCE(v_new_slug, slug),
    topic = COALESCE(p_topic, topic),
    tags = COALESCE(p_tags, tags),
    cover_asset_id = CASE
      WHEN p_clear_cover THEN NULL
      ELSE COALESCE(p_cover_asset_id, cover_asset_id)
    END,
    draft_content = COALESCE(p_content, draft_content),
    schema_version = COALESCE(p_schema_version, schema_version),
    edit_version = edit_version + 1,
    last_edited_by = v_user
  WHERE id = p_article_id
  RETURNING * INTO v_article;

  INSERT INTO public.article_revisions (
    article_id, editor_user_id, version, source,
    title, summary, content, schema_version
  ) VALUES (
    p_article_id, v_user, v_article.edit_version,
    CASE WHEN p_source = 'autosave' THEN 'autosave' ELSE 'manual' END,
    v_article.title, v_article.summary, v_article.draft_content, v_article.schema_version
  );

  -- Bounded retention: keep the newest 25 autosave + newest 100 manual
  -- revisions per article; never prune a revision a publication references.
  DELETE FROM public.article_revisions r
  WHERE r.article_id = p_article_id
    AND r.source = 'autosave'
    AND r.id NOT IN (
      SELECT id FROM public.article_revisions
      WHERE article_id = p_article_id AND source = 'autosave'
      ORDER BY saved_at DESC, id DESC
      LIMIT 25
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.article_publications ap WHERE ap.revision_id = r.id
    );

  DELETE FROM public.article_revisions r
  WHERE r.article_id = p_article_id
    AND r.source = 'manual'
    AND r.id NOT IN (
      SELECT id FROM public.article_revisions
      WHERE article_id = p_article_id AND source = 'manual'
      ORDER BY saved_at DESC, id DESC
      LIMIT 100
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.article_publications ap WHERE ap.revision_id = r.id
    );

  RETURN v_article;
END;
$$;

REVOKE ALL ON FUNCTION public.save_article_draft(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, BOOLEAN, JSONB, INT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_article_draft(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, BOOLEAN, JSONB, INT, TEXT)
  TO authenticated;
