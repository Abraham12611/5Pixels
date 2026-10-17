-- Article duplication (epic #123, issue #126)
-- ============================================================================
-- Clones an article as a NEW DRAFT. Media cannot be reference-shared:
-- article_assets enforces one article per asset (UNIQUE(asset_id)) and
-- staging paths are article-scoped — so every media row is re-registered
-- under fresh asset ids and the document's references are rewritten in the
-- same transaction. Storage objects are copied by the app layer afterwards;
-- new rows stay 'pending' until finalize_article_media_upload verifies the
-- copied object (unconfirmed rows are reclaimed by the stale-upload sweep).
--
-- Returns { article, copies } where copies is the per-asset copy plan the
-- app must execute (from_key -> to_key) and then finalize.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.duplicate_article(p_article_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_src public.articles;
  v_new public.articles;
  v_base_slug TEXT;
  v_slug TEXT;
  v_i INT := 0;
  v_aa RECORD;
  v_pair RECORD;
  v_new_asset UUID;
  v_new_key TEXT;
  v_ext TEXT;
  v_content JSONB;
  v_cover UUID;
  v_map JSONB := '{}'::jsonb;
  v_copies JSONB := '[]'::jsonb;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_src FROM public.articles WHERE id = p_article_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Fresh unique slug. The duplicate is ALWAYS a draft: status, publication
  -- pointers and timestamps are never carried over, so a clone can never go
  -- live accidentally.
  v_base_slug := substring(v_src.slug FROM 1 FOR 110) || '-copy';
  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.articles WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := v_base_slug || '-' || v_i;
  END LOOP;

  INSERT INTO public.articles (
    author_id, title, slug, summary, topic, tags, draft_content,
    schema_version, last_edited_by
  ) VALUES (
    v_user,
    substring(v_src.title FROM 1 FOR 192) || ' (copy)',
    v_slug,
    v_src.summary, v_src.topic, v_src.tags, v_src.draft_content,
    v_src.schema_version, v_user
  ) RETURNING * INTO v_new;

  -- Re-register every media row under fresh, article-scoped ids. Cloned rows
  -- start 'pending': the object copy is app-side work; finalize verifies the
  -- copied object before 'ready'. 'pending' SOURCE rows are cloned too — a
  -- document reference stays resolvable for draft saves either way.
  FOR v_aa IN
    SELECT aa.*, a.mime_type, a.media_type, a.bytes, a.width, a.height,
           a.duration_ms
    FROM public.article_assets aa
    JOIN public.assets a ON a.id = aa.asset_id
    WHERE aa.article_id = p_article_id
    ORDER BY aa.created_at, aa.id
  LOOP
    v_new_asset := gen_random_uuid();
    v_ext := public.article_media_extension(v_aa.mime_type);
    v_new_key := 'staff/' || v_user::text || '/articles/'
                 || v_new.id::text || '/' || v_new_asset::text || '.' || v_ext;

    INSERT INTO public.assets (
      id, owner_user_id, storage_provider, storage_key, bucket,
      media_type, mime_type, bytes, visibility, source_type,
      width, height, duration_ms
    ) VALUES (
      v_new_asset, v_user, 'supabase', v_new_key, 'article-media',
      v_aa.media_type, v_aa.mime_type, v_aa.bytes, 'private', 'article_media',
      v_aa.width, v_aa.height, v_aa.duration_ms
    );

    INSERT INTO public.article_assets (
      article_id, asset_id, uploader_user_id, kind, state, staging_key,
      source_generation_id, source_asset_id,
      consent_confirmed_by, consent_confirmed_at, alt_text, caption
    ) VALUES (
      v_new.id, v_new_asset, v_user, v_aa.kind, 'pending', v_new_key,
      v_aa.source_generation_id, v_aa.source_asset_id,
      v_aa.consent_confirmed_by, v_aa.consent_confirmed_at,
      v_aa.alt_text, v_aa.caption
    );

    v_map := v_map || jsonb_build_object(v_aa.asset_id::text, v_new_asset::text);
    v_copies := v_copies || jsonb_build_object(
      'asset_id', v_new_asset,
      'from_key', v_aa.staging_key,
      'to_key', v_new_key,
      'mime_type', v_aa.mime_type,
      'bytes', v_aa.bytes,
      'width', v_aa.width,
      'height', v_aa.height,
      'duration_ms', v_aa.duration_ms
    );
  END LOOP;

  -- Rewrite media references atomically with the clone: asset:// urls in
  -- media blocks and bare assetId props in generation blocks. UUIDs cannot
  -- appear as substrings of other tokens, so a whole-document replace is
  -- safe and catches every reference site.
  v_content := v_new.draft_content;
  FOR v_pair IN SELECT key AS old_id, value AS new_id FROM jsonb_each_text(v_map)
  LOOP
    v_content := REPLACE(v_content::text, v_pair.old_id, v_pair.new_id)::jsonb;
  END LOOP;

  -- The cover re-points at the cloned asset; NULL when the cover had no
  -- media row (or its clone was skipped).
  v_cover := (v_map ->> v_src.cover_asset_id::text)::uuid;

  UPDATE public.articles
  SET draft_content = v_content, cover_asset_id = v_cover
  WHERE id = v_new.id
  RETURNING * INTO v_new;

  RETURN jsonb_build_object('article', to_jsonb(v_new), 'copies', v_copies);
END;
$$;

REVOKE ALL ON FUNCTION public.duplicate_article(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_article(UUID) TO authenticated;
