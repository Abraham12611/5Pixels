-- Articles foundation (epic #123, issues #124 / #125)
-- ============================================================================
-- Durable, safely permissioned storage for the public Articles product:
--   * articles              — working/draft row (staff-only)
--   * article_revisions     — bounded edit history (staff-only)
--   * article_publications  — immutable published snapshots (public read via RPC)
--
-- Security model:
--   * Public/anon readers may read ONLY published snapshots, through
--     SECURITY DEFINER RPCs that return a fixed, public-safe column set.
--     There is no direct SELECT grant path to draft_content, revisions,
--     or draft-list metadata for non-staff.
--   * Staff (admin OR owner) may SELECT working rows. ALL writes go through
--     SECURITY DEFINER RPCs so optimistic versioning, slug rules, size
--     bounds, revision bookkeeping and publish audit metadata cannot be
--     bypassed by a hand-crafted client call.
--
-- Note on roles: public.is_admin() intentionally does NOT include owners
-- (see 20260831190000_harden_security.sql); existing policies spell out
-- `is_admin() OR is_owner()`. Articles centralise that semantic in
-- public.is_editorial_staff() without changing any unrelated policy.
-- ============================================================================

-- 1. Editorial staff role helper (admin OR owner) ------------------------------
CREATE OR REPLACE FUNCTION public.is_editorial_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT (is_admin OR is_owner) FROM public.profiles WHERE id = (SELECT auth.uid())),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.is_editorial_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_editorial_staff() TO authenticated;

-- 2. Slug normaliser — DB-side authority, mirrors lib/articles/slug.ts --------
CREATE OR REPLACE FUNCTION public.article_slugify(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(
        substring(
          regexp_replace(lower(btrim(COALESCE(p_input, ''))), '[^a-z0-9]+', '-', 'g')
          FROM 1 FOR 120
        ),
        '^-+', ''
      ),
      '-+$', ''
    ),
    ''
  );
$$;

REVOKE ALL ON FUNCTION public.article_slugify(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.article_slugify(TEXT) TO authenticated;

-- 3. Public-safe asset projection ---------------------------------------------
-- Returns a fixed JSON shape for an asset only when it is public and live;
-- private/internal/deleted assets resolve to NULL rather than leaking refs.
CREATE OR REPLACE FUNCTION public.public_asset_json(p_asset_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
    'assetId', a.id,
    'bucket', a.bucket,
    'storageKey', a.storage_key,
    'mimeType', a.mime_type,
    'width', a.width,
    'height', a.height
  ) END
  FROM public.assets a
  WHERE a.id = p_asset_id
    AND a.visibility = 'public'
    AND a.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.public_asset_json(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_asset_json(UUID) TO authenticated;

-- 3.5. Publish-time document validator ------------------------------------------
-- Structural validation of the canonical BlockNote document, enforced inside
-- publish_article so the live snapshot can never contain malformed content
-- even when the RPC is called directly (bypassing the app's Zod layer).
-- Returns NULL when valid, otherwise a stable error code the caller raises.
-- Mirrors lib/articles/document.ts: max 500 blocks, nesting depth 8, 256KB.
-- Contract for later tickets: per-block prop validation (preset existence,
-- media asset ownership/visibility, workflow steps…) lands with the owning
-- issues (#127–#131). Unknown block types are structurally valid here — the
-- public renderer degrades them safely — but every element must be a proper
-- BlockNote block object (type/id/props/content/children shapes).
CREATE OR REPLACE FUNCTION public.article_document_error(p_content JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_work JSONB;
  v_item JSONB;
  v_block JSONB;
  v_depth INT;
  v_count INT := 0;
BEGIN
  IF p_content IS NULL OR jsonb_typeof(p_content) <> 'array' THEN
    RETURN 'document_not_array';
  END IF;
  IF pg_column_size(p_content) > 262144 THEN
    RETURN 'document_too_large';
  END IF;

  -- Worklist of {b: block, d: depth} pairs; depth-first walk.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('b', e.el, 'd', 1)), '[]'::jsonb)
  INTO v_work
  FROM jsonb_array_elements(p_content) AS e(el);

  WHILE jsonb_array_length(v_work) > 0 LOOP
    v_item := v_work -> (jsonb_array_length(v_work) - 1);
    v_work := v_work - (jsonb_array_length(v_work) - 1);
    v_block := v_item -> 'b';
    v_depth := (v_item ->> 'd')::int;

    v_count := v_count + 1;
    IF v_count > 500 THEN RETURN 'document_too_many_blocks'; END IF;
    IF v_depth > 8 THEN RETURN 'document_too_deep'; END IF;

    IF jsonb_typeof(v_block) <> 'object' THEN
      RETURN 'block_not_object';
    END IF;
    IF jsonb_typeof(v_block -> 'type') IS DISTINCT FROM 'string'
       OR char_length(v_block ->> 'type') = 0
       OR char_length(v_block ->> 'type') > 64 THEN
      RETURN 'block_bad_type';
    END IF;
    IF v_block ? 'id' AND (
      jsonb_typeof(v_block -> 'id') IS DISTINCT FROM 'string'
      OR char_length(v_block ->> 'id') > 64
    ) THEN
      RETURN 'block_bad_id';
    END IF;
    IF v_block ? 'props' AND jsonb_typeof(v_block -> 'props') <> 'object' THEN
      RETURN 'block_bad_props';
    END IF;
    IF v_block ? 'content' AND jsonb_typeof(v_block -> 'content') <> 'array' THEN
      RETURN 'block_bad_content';
    END IF;
    IF v_block ? 'children' AND jsonb_typeof(v_block -> 'children') <> 'array' THEN
      RETURN 'block_bad_children';
    END IF;

    IF v_block ? 'children' THEN
      SELECT v_work || COALESCE(
        jsonb_agg(jsonb_build_object('b', c.el, 'd', v_depth + 1)),
        '[]'::jsonb
      )
      INTO v_work
      FROM jsonb_array_elements(v_block -> 'children') AS c(el);
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.article_document_error(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.article_document_error(JSONB) TO authenticated;

-- 4. articles — working/draft state --------------------------------------------
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled article'
    CHECK (char_length(title) <= 200),
  -- Slugs are stored fully normalised (lowercase kebab). Unique across all
  -- articles so a draft cannot squat on a published slug.
  slug TEXT NOT NULL
    CHECK (char_length(slug) <= 120 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary TEXT NOT NULL DEFAULT ''
    CHECK (char_length(summary) <= 1000),
  cover_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  topic TEXT CHECK (topic IS NULL OR char_length(topic) <= 64),
  tags TEXT[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(tags) <= 12),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  -- Canonical BlockNote document JSON (array of blocks). 256KB hard bound.
  draft_content JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(draft_content) = 'array' AND pg_column_size(draft_content) <= 262144),
  schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  -- Optimistic concurrency counter; every save/publish must present the
  -- version it thinks it is updating or the write is rejected.
  edit_version BIGINT NOT NULL DEFAULT 0 CHECK (edit_version >= 0),
  last_edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Points at the live publication snapshot; NULL means nothing is public.
  current_publication_id UUID,
  first_published_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_articles_slug ON public.articles(slug);
CREATE INDEX idx_articles_status_updated ON public.articles(status, updated_at DESC);
CREATE INDEX idx_articles_author ON public.articles(author_id);
CREATE INDEX idx_articles_current_publication ON public.articles(current_publication_id)
  WHERE status = 'published';

CREATE TRIGGER articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. article_revisions — bounded, staff-only edit history -----------------------
CREATE TABLE public.article_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  editor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Mirrors articles.edit_version at the moment of the save.
  version BIGINT NOT NULL CHECK (version >= 0),
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('autosave', 'manual', 'publish')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL
    CHECK (jsonb_typeof(content) = 'array' AND pg_column_size(content) <= 262144),
  schema_version INT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, version)
);

CREATE INDEX idx_article_revisions_article_saved
  ON public.article_revisions(article_id, saved_at DESC);

-- 6. article_publications — immutable published snapshots -----------------------
-- A row is a frozen, public-safe copy of everything the renderer needs. It is
-- written only inside publish_article(); draft edits never touch it, which is
-- what guarantees editing-after-publish cannot silently change the live page.
CREATE TABLE public.article_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  -- Restricted: revision pruning must skip rows referenced by a publication.
  revision_id UUID NOT NULL REFERENCES public.article_revisions(id),
  publication_number BIGINT NOT NULL CHECK (publication_number > 0),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  topic TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  cover_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  content JSONB NOT NULL
    CHECK (jsonb_typeof(content) = 'array' AND pg_column_size(content) <= 262144),
  schema_version INT NOT NULL,
  -- Frozen public-safe author projection. Identity is captured at publish
  -- time, so a later-deleted author cannot break rendering and a profile
  -- edit cannot silently rewrite a published byline. Never stores email.
  author_display_name TEXT NOT NULL DEFAULT '5Pixels Team',
  author_avatar_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, publication_number)
);

CREATE INDEX idx_article_publications_article
  ON public.article_publications(article_id, published_at DESC);

ALTER TABLE public.articles
  ADD CONSTRAINT articles_current_publication_fk
  FOREIGN KEY (current_publication_id)
  REFERENCES public.article_publications(id)
  ON DELETE SET NULL;

-- Publications are an append-only audit trail: nothing may rewrite or remove
-- a snapshot. (Articles are archived, never hard-deleted — there is no DELETE
-- grant path on articles either.)
CREATE OR REPLACE FUNCTION public.prevent_article_publication_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Article publications are immutable';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_article_publication_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER article_publications_immutable
  BEFORE UPDATE OR DELETE ON public.article_publications
  FOR EACH ROW EXECUTE FUNCTION public.prevent_article_publication_mutation();

-- 7. Row-level security ----------------------------------------------------------
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_publications ENABLE ROW LEVEL SECURITY;

-- Staff may read working state. No INSERT/UPDATE/DELETE policies exist on any
-- articles table: every write goes through the SECURITY DEFINER RPCs below so
-- versioning, slug and validation rules cannot be bypassed. There is no
-- public SELECT policy anywhere — anonymous reads happen exclusively through
-- the fixed-projection public RPCs.
CREATE POLICY articles_staff_select ON public.articles
  FOR SELECT TO authenticated
  USING (public.is_editorial_staff());

CREATE POLICY article_revisions_staff_select ON public.article_revisions
  FOR SELECT TO authenticated
  USING (public.is_editorial_staff());

CREATE POLICY article_publications_staff_select ON public.article_publications
  FOR SELECT TO authenticated
  USING (public.is_editorial_staff());

-- 8. create_article --------------------------------------------------------------
-- Author identity is always auth.uid(); it cannot be spoofed.
CREATE OR REPLACE FUNCTION public.create_article(p_title TEXT DEFAULT NULL)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_title TEXT;
  v_base_slug TEXT;
  v_slug TEXT;
  v_i INT := 0;
  v_row public.articles;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  v_title := COALESCE(NULLIF(btrim(p_title), ''), 'Untitled article');
  v_base_slug := COALESCE(public.article_slugify(v_title), 'untitled-article');
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.articles WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := substring(v_base_slug FROM 1 FOR 115) || '-' || v_i;
  END LOOP;

  INSERT INTO public.articles (author_id, title, slug, last_edited_by)
  VALUES (v_user, v_title, v_slug, v_user)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_article(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_article(TEXT) TO authenticated;

-- 9. save_article_draft ------------------------------------------------------------
-- Optimistic-concurrency draft save + revision bookkeeping. Slug changes are
-- rejected once the article has been published at least once (stable public
-- URLs). Raises:
--   42501 forbidden          — non-staff caller
--   P0002 article_not_found
--   40001 edit_version_conflict — caller's base version is stale
--   23505 slug conflict       — slug taken (unique index)
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

-- 10. publish_article --------------------------------------------------------------
-- Atomic, race-safe publish: re-locks the row, re-checks the caller's
-- edit_version, validates the draft against the persisted document contract
-- (article_document_error — structural only; per-block media/preset rules are
-- owned by #127–#131), snapshots into article_revisions (source='publish')
-- and article_publications, then flips status inside the same transaction.
CREATE OR REPLACE FUNCTION public.publish_article(
  p_article_id UUID,
  p_expected_edit_version BIGINT
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
  v_revision_id UUID;
  v_publication_id UUID;
  v_pub_number BIGINT;
  v_author_name TEXT;
  v_author_avatar UUID;
  v_doc_error TEXT;
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

  IF v_article.status = 'archived' THEN
    RAISE EXCEPTION 'cannot_publish_archived' USING ERRCODE = 'P0001';
  END IF;
  IF btrim(v_article.title) = '' THEN
    RAISE EXCEPTION 'title_required' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(v_article.draft_content) = 0 THEN
    RAISE EXCEPTION 'content_required' USING ERRCODE = 'P0001';
  END IF;

  -- Publish is the trust boundary for document validity: the snapshot that
  -- anonymous readers will render must be structurally sound even when this
  -- RPC is invoked directly, outside the app's Zod validation.
  v_doc_error := public.article_document_error(v_article.draft_content);
  IF v_doc_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_doc_error USING ERRCODE = 'P0001';
  END IF;

  -- The save that produced this edit_version usually already wrote a
  -- 'manual'/'autosave' revision row at the same (article_id, version).
  -- Upgrade that row to source='publish' so it is retained permanently and
  -- reflects that this exact version is what went live.
  INSERT INTO public.article_revisions (
    article_id, editor_user_id, version, source,
    title, summary, content, schema_version
  ) VALUES (
    p_article_id, v_user, v_article.edit_version, 'publish',
    v_article.title, v_article.summary, v_article.draft_content, v_article.schema_version
  )
  ON CONFLICT (article_id, version) DO UPDATE
    SET source = 'publish',
        editor_user_id = EXCLUDED.editor_user_id,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        content = EXCLUDED.content,
        schema_version = EXCLUDED.schema_version,
        saved_at = NOW()
  RETURNING id INTO v_revision_id;

  -- Frozen public-safe author projection (display name + avatar ref only).
  SELECT
    COALESCE(NULLIF(btrim(pr.display_name), ''), '5Pixels Team'),
    pr.avatar_asset_id
  INTO v_author_name, v_author_avatar
  FROM public.profiles pr
  WHERE pr.id = v_article.author_id;

  v_author_name := COALESCE(v_author_name, '5Pixels Team');

  SELECT COALESCE(MAX(publication_number), 0) + 1
  INTO v_pub_number
  FROM public.article_publications
  WHERE article_id = p_article_id;

  INSERT INTO public.article_publications (
    article_id, revision_id, publication_number,
    slug, title, summary, topic, tags, cover_asset_id,
    content, schema_version,
    author_display_name, author_avatar_asset_id, published_by
  ) VALUES (
    p_article_id, v_revision_id, v_pub_number,
    v_article.slug, v_article.title, v_article.summary, v_article.topic,
    v_article.tags, v_article.cover_asset_id,
    v_article.draft_content, v_article.schema_version,
    v_author_name, v_author_avatar, v_user
  )
  RETURNING id INTO v_publication_id;

  UPDATE public.articles
  SET
    status = 'published',
    current_publication_id = v_publication_id,
    published_at = NOW(),
    first_published_at = COALESCE(first_published_at, NOW())
  WHERE id = p_article_id
  RETURNING * INTO v_article;

  RETURN v_article;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_article(UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_article(UUID, BIGINT) TO authenticated;

-- 11. unpublish / archive / unarchive -------------------------------------------
CREATE OR REPLACE FUNCTION public.unpublish_article(p_article_id UUID)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.articles
  SET status = 'draft', current_publication_id = NULL
  WHERE id = p_article_id AND status = 'published'
  RETURNING * INTO v_article;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_published' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_article;
END;
$$;

REVOKE ALL ON FUNCTION public.unpublish_article(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unpublish_article(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_article(p_article_id UUID)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.articles
  SET status = 'archived', current_publication_id = NULL
  WHERE id = p_article_id AND status <> 'archived'
  RETURNING * INTO v_article;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_article;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_article(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_article(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.unarchive_article(p_article_id UUID)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.articles
  SET status = 'draft'
  WHERE id = p_article_id AND status = 'archived'
  RETURNING * INTO v_article;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_archived' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_article;
END;
$$;

REVOKE ALL ON FUNCTION public.unarchive_article(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unarchive_article(UUID) TO authenticated;

-- 12. Public reads -----------------------------------------------------------------
-- Fixed-projection SECURITY DEFINER reads over the published snapshot only.
-- Anything unpublished/draft/archived/missing simply returns no rows -> the
-- app renders 404. Granted to anon + authenticated (anonymous browsing is a
-- product requirement — see 20260925151956 for why both grants matter).
CREATE OR REPLACE FUNCTION public.get_public_articles(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 12,
  p_topic TEXT DEFAULT NULL
)
RETURNS TABLE (
  article_id UUID,
  slug TEXT,
  title TEXT,
  summary TEXT,
  topic TEXT,
  tags TEXT[],
  cover JSONB,
  author_display_name TEXT,
  author_avatar JSONB,
  published_at TIMESTAMPTZ,
  total_count BIGINT
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
    pub.author_display_name,
    public.public_asset_json(pub.author_avatar_asset_id) AS author_avatar,
    pub.published_at,
    COUNT(*) OVER () AS total_count
  FROM public.articles a
  JOIN public.article_publications pub ON pub.id = a.current_publication_id
  WHERE a.status = 'published'
    AND (p_topic IS NULL OR pub.topic = p_topic)
  ORDER BY pub.published_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 50)
  OFFSET (GREATEST(p_page, 1) - 1) * LEAST(GREATEST(p_page_size, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_public_articles(INT, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_articles(INT, INT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_article_by_slug(p_slug TEXT)
RETURNS TABLE (
  article_id UUID,
  slug TEXT,
  title TEXT,
  summary TEXT,
  topic TEXT,
  tags TEXT[],
  cover JSONB,
  content JSONB,
  schema_version INT,
  author_display_name TEXT,
  author_avatar JSONB,
  published_at TIMESTAMPTZ,
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
    pub.schema_version,
    pub.author_display_name,
    public.public_asset_json(pub.author_avatar_asset_id) AS author_avatar,
    pub.published_at,
    pub.publication_number
  FROM public.articles a
  JOIN public.article_publications pub ON pub.id = a.current_publication_id
  WHERE a.status = 'published'
    AND a.slug = lower(btrim(COALESCE(p_slug, '')));
$$;

REVOKE ALL ON FUNCTION public.get_public_article_by_slug(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_article_by_slug(TEXT) TO anon, authenticated;
