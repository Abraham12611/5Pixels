-- Article preset blocks (#127): publish-time catalog validation
-- ------------------------------------------------------------
-- publish_article gains a check that every `preset` block in the document
-- references a CURRENTLY PUBLIC product (products.public_status='active' AND
-- products.visibility='public', matching the catalog visibility rules),
-- and that an optional selectedPublicVersionId pin still points at that
-- product's active (public) version.
--
-- Failure codes (mapped in lib/articles/actions.ts):
--   preset_unavailable          — presetId missing/not-a-uuid/no longer public
--   preset_version_unavailable  — pinned version retired or belongs elsewhere
--
-- This mirrors the media-ref checks above it: the publication snapshot that
-- anonymous readers render must only contain references that resolve through
-- the public catalog, even when the RPC is invoked directly.

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
  v_refs UUID[];
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

  -- Preset blocks (#127): every referenced product must be currently public.
  -- `$.**` descends the whole tree so nested preset blocks are covered too.
  -- presetId is validated as text first — a forged non-uuid value raises
  -- preset_unavailable, not a cast error.
  IF EXISTS (
    SELECT 1
    FROM jsonb_path_query(v_article.draft_content, '$.**') n(node)
    CROSS JOIN LATERAL (
      SELECT
        NULLIF(n.node -> 'props' ->> 'presetId', '') AS preset_id,
        NULLIF(n.node -> 'props' ->> 'selectedPublicVersionId', '') AS version_id
    ) p
    WHERE jsonb_typeof(n.node) = 'object'
      AND n.node ->> 'type' = 'preset'
      AND (
        p.preset_id IS NULL
        OR p.preset_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        OR NOT EXISTS (
          SELECT 1
          FROM public.products pr
          WHERE pr.id = p.preset_id::uuid
            AND pr.public_status = 'active'
            AND pr.visibility = 'public'
        )
      )
  ) THEN
    RAISE EXCEPTION 'preset_unavailable' USING ERRCODE = 'P0001';
  END IF;

  -- A version pin must still be the product's ACTIVE (public) version —
  -- retired, draft or cross-product pins block publish.
  IF EXISTS (
    SELECT 1
    FROM jsonb_path_query(v_article.draft_content, '$.**') n(node)
    CROSS JOIN LATERAL (
      SELECT NULLIF(n.node -> 'props' ->> 'selectedPublicVersionId', '') AS version_id
    ) p
    WHERE jsonb_typeof(n.node) = 'object'
      AND n.node ->> 'type' = 'preset'
      AND p.version_id IS NOT NULL
      AND (
        p.version_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        OR NOT EXISTS (
          SELECT 1
          FROM public.product_versions pv
          WHERE pv.id = p.version_id::uuid
            AND pv.product_id = (n.node -> 'props' ->> 'presetId')::uuid
            AND pv.state = 'active'
        )
      )
  ) THEN
    RAISE EXCEPTION 'preset_version_unavailable' USING ERRCODE = 'P0001';
  END IF;

  -- Every media reference in the document plus the cover.
  v_refs := ARRAY(
    SELECT DISTINCT ref.id
    FROM (
      SELECT public.article_document_asset_ids(v_article.draft_content) AS id
      UNION ALL
      SELECT v_article.cover_asset_id
    ) ref
    WHERE ref.id IS NOT NULL
  );

  -- Every reference must resolve to a verified media row of THIS article —
  -- forged, pending, or cross-article asset ids are rejected.
  IF EXISTS (
    SELECT 1
    FROM unnest(v_refs) r(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.article_assets aa
      WHERE aa.article_id = p_article_id
        AND aa.asset_id = r.id
        AND aa.state IN ('ready', 'published')
    )
  ) THEN
    RAISE EXCEPTION 'media_ref_not_ready' USING ERRCODE = 'P0001';
  END IF;

  -- Referenced assets not yet published must already have their public copy
  -- in storage — the app stages them just before calling this. The RPC never
  -- trusts that bytes exist without checking storage.objects.
  IF EXISTS (
    SELECT 1
    FROM public.article_assets aa
    WHERE aa.article_id = p_article_id
      AND aa.state = 'ready'
      AND aa.asset_id = ANY(v_refs)
      AND NOT EXISTS (
        SELECT 1
        FROM storage.objects o
        WHERE o.bucket_id = 'article-media-public'
          AND o.name = 'articles/' || p_article_id::text || '/'
              || aa.asset_id::text || '.'
              || substring(aa.staging_key from '\.([a-z0-9]+)$')
      )
  ) THEN
    RAISE EXCEPTION 'media_not_promoted' USING ERRCODE = 'P0001';
  END IF;

  -- Mark exactly the referenced assets published (stable ids, immutable keys).
  UPDATE public.article_assets aa
  SET state = 'published',
      published_key = 'articles/' || aa.article_id::text || '/'
          || aa.asset_id::text || '.'
          || substring(aa.staging_key from '\.([a-z0-9]+)$'),
      published_at = COALESCE(aa.published_at, NOW()),
      revoked_at = NULL
  WHERE aa.article_id = p_article_id
    AND aa.state = 'ready'
    AND aa.asset_id = ANY(v_refs);

  UPDATE public.assets a
  SET bucket = 'article-media-public',
      storage_key = aa.published_key,
      visibility = 'public'
  FROM public.article_assets aa
  WHERE aa.asset_id = a.id
    AND aa.article_id = p_article_id
    AND aa.state = 'published'
    AND aa.asset_id = ANY(v_refs)
    AND a.bucket <> 'article-media-public';

  -- De-publish assets a previous snapshot referenced but this one does not.
  -- Their public objects stay on disk with published_key retained so the
  -- revocation sweep can still find and remove them.
  UPDATE public.assets a
  SET bucket = 'article-media',
      storage_key = aa.staging_key,
      visibility = 'private'
  FROM public.article_assets aa
  WHERE aa.asset_id = a.id
    AND aa.article_id = p_article_id
    AND aa.state = 'published'
    AND NOT (aa.asset_id = ANY(v_refs));

  UPDATE public.article_assets aa
  SET state = 'ready', revoked_at = NOW()
  WHERE aa.article_id = p_article_id
    AND aa.state = 'published'
    AND NOT (aa.asset_id = ANY(v_refs));

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
