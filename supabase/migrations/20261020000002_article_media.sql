-- Article media pipeline (epic #123, issue #129)
-- ============================================================================
-- Secure two-stage media storage for Articles:
--   * article-media         — PRIVATE bucket: draft staging, editorial staff only.
--                             Objects live at staff/{uploader}/articles/{article}/{asset}.{ext}
--   * article-media-public  — PUBLIC bucket: explicit promotion target for
--                             published revisions. Objects live at
--                             articles/{article}/{asset}.{ext} — immutable keys.
--   * article_assets        — links articles to assets rows, tracks the
--                             pending -> ready -> published lifecycle and the
--                             consent/provenance of generation derivatives.
--
-- Security model:
--   * Draft media is NEVER public: staging objects stay in the private bucket
--     and article asset rows carry visibility='private'. public_asset_json()
--     therefore resolves them to NULL for everyone.
--   * Publishing performs an explicit promotion: the app copies the staging
--     object into article-media-public and mark_article_media_published()
--     repoints the asset row (same asset id) at the public object with
--     visibility='public'. Unpublish/archive revokes: rows flip back to
--     private staging pointers BEFORE the public objects are deleted, so the
--     public projection stops resolving immediately.
--   * Staging paths embed uploader + article + asset ids: collision-resistant,
--     owner-scoped, and trivially verifiable server-side.
--   * All writes go through SECURITY DEFINER RPCs — quota, MIME/size bounds,
--     generation ownership and consent cannot be bypassed by a crafted client.
--   * Generation derivatives require the caller to OWN a completed generation;
--     the register RPC records consent metadata. Third-party results are never
--     copied — they resolve through the live public share only
--     (resolve_article_generation returns NULL once unshared).
-- ============================================================================

-- 1. Buckets -----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'article-media',
    'article-media',
    FALSE,
    104857600, -- 100 MB (video bound; images are capped lower by the RPC)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
  ),
  (
    'article-media-public',
    'article-media-public',
    TRUE,
    104857600,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage policies ---------------------------------------------------------
-- Staging bucket: editorial staff only, and only inside their own
-- staff/{uid}/articles/... namespace. Every verb gets the same path check so a
-- staff member cannot overwrite or delete a colleague's staging objects.
CREATE POLICY "article_media_staff_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (storage.foldername(name))[1] = 'staff'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (storage.foldername(name))[3] = 'articles'
    AND public.is_editorial_staff()
  );

CREATE POLICY "article_media_staff_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'article-media'
    AND (storage.foldername(name))[1] = 'staff'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (storage.foldername(name))[3] = 'articles'
    AND public.is_editorial_staff()
  );

CREATE POLICY "article_media_staff_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (storage.foldername(name))[1] = 'staff'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (storage.foldername(name))[3] = 'articles'
    AND public.is_editorial_staff()
  )
  WITH CHECK (
    bucket_id = 'article-media'
    AND (storage.foldername(name))[1] = 'staff'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (storage.foldername(name))[3] = 'articles'
    AND public.is_editorial_staff()
  );

CREATE POLICY "article_media_staff_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'article-media'
    AND (storage.foldername(name))[1] = 'staff'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (storage.foldername(name))[3] = 'articles'
    AND public.is_editorial_staff()
  );

-- Published bucket: world-readable objects (immutable keys); writes happen
-- exclusively through the service-role promotion path — there are deliberately
-- no INSERT/UPDATE/DELETE policies for authenticated users.
CREATE POLICY "article_media_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'article-media-public');

-- 3. article_assets -------------------------------------------------------------
CREATE TABLE public.article_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  -- The public-facing asset reference. Blocks and cover_asset_id point here;
  -- the row is repointed between staging and published objects on
  -- publish/unpublish so the id is stable across revisions.
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  uploader_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('upload', 'generation_derivative')),
  -- pending: upload URL issued, object not yet verified.
  -- ready:   verified object present in the private staging bucket.
  -- published: derived public copy exists in article-media-public.
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'ready', 'published')),
  -- Canonical private object path (never changes after creation).
  staging_key TEXT NOT NULL
    CHECK (staging_key ~ '^staff/[0-9a-f-]{36}/articles/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]+$'),
  -- Public object path while published; recomputed deterministically.
  published_key TEXT
    CHECK (published_key IS NULL OR published_key ~ '^articles/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]+$'),
  -- Provenance + consent for generation derivatives. The "Publish this output
  -- in the article" action IS the consent — it is recorded, never implied.
  source_generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
  source_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  consent_confirmed_by UUID REFERENCES public.profiles(id),
  consent_confirmed_at TIMESTAMPTZ,
  alt_text TEXT NOT NULL DEFAULT '' CHECK (char_length(alt_text) <= 300),
  caption TEXT NOT NULL DEFAULT '' CHECK (char_length(caption) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  -- An asset row belongs to at most one article (paths are article-scoped).
  UNIQUE (asset_id),
  -- A given source output is derived at most once per article (idempotent).
  UNIQUE (article_id, source_asset_id)
);

CREATE INDEX idx_article_assets_article ON public.article_assets(article_id);
CREATE INDEX idx_article_assets_state ON public.article_assets(state);
CREATE INDEX idx_article_assets_source_generation
  ON public.article_assets(source_generation_id)
  WHERE source_generation_id IS NOT NULL;
CREATE INDEX idx_article_assets_pending_sweep
  ON public.article_assets(created_at)
  WHERE state = 'pending';

CREATE TRIGGER article_assets_updated_at BEFORE UPDATE ON public.article_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.article_assets ENABLE ROW LEVEL SECURITY;

-- Staff may read media rows for the articles they can edit. There are no
-- write policies — every mutation goes through the SECURITY DEFINER RPCs.
CREATE POLICY article_assets_staff_select ON public.article_assets
  FOR SELECT TO authenticated
  USING (public.is_editorial_staff());

-- 4. assets SELECT widening ----------------------------------------------------
-- Staff must see draft media uploaded by colleagues on shared articles; the
-- existing policy only covers owner / public / is_admin() (owners are not
-- admins). Widened ONLY for the two article buckets.
DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select" ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR visibility = 'public'
    OR (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid()))
    OR (
      bucket IN ('article-media', 'article-media-public')
      AND public.is_editorial_staff()
    )
  );

-- 5. Shared helpers -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.article_media_extension(p_mime_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_mime_type
    WHEN 'image/jpeg' THEN 'jpg'
    WHEN 'image/png' THEN 'png'
    WHEN 'image/webp' THEN 'webp'
    WHEN 'image/gif' THEN 'gif'
    WHEN 'video/mp4' THEN 'mp4'
    WHEN 'video/webm' THEN 'webm'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.article_media_extension(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.article_media_extension(TEXT) TO authenticated;

-- Byte/size bounds + per-article quota, enforced inside the write RPCs.
CREATE OR REPLACE FUNCTION public.article_media_check_file(
  p_mime_type TEXT,
  p_bytes BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_mime_type IS NULL OR public.article_media_extension(p_mime_type) IS NULL THEN
    RAISE EXCEPTION 'unsupported_mime_type' USING ERRCODE = 'P0001';
  END IF;
  IF p_bytes IS NULL OR p_bytes <= 0 THEN
    RAISE EXCEPTION 'invalid_size' USING ERRCODE = 'P0001';
  END IF;
  IF p_mime_type LIKE 'image/%' AND p_bytes > 26214400 THEN
    RAISE EXCEPTION 'image_too_large' USING ERRCODE = 'P0001';
  END IF;
  IF p_mime_type LIKE 'video/%' AND p_bytes > 104857600 THEN
    RAISE EXCEPTION 'video_too_large' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.article_media_check_file(TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.article_media_check_file(TEXT, BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.article_media_check_quota(
  p_article_id UUID,
  p_additional_bytes BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count BIGINT;
  v_bytes BIGINT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(a.bytes), 0)
  INTO v_count, v_bytes
  FROM public.article_assets aa
  JOIN public.assets a ON a.id = aa.asset_id
  WHERE aa.article_id = p_article_id
    AND a.deleted_at IS NULL;

  IF v_count >= 100 THEN
    RAISE EXCEPTION 'article_media_count_exceeded' USING ERRCODE = 'P0001';
  END IF;
  IF v_bytes + COALESCE(p_additional_bytes, 0) > 536870912 THEN
    RAISE EXCEPTION 'article_media_quota_exceeded' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.article_media_check_quota(UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.article_media_check_quota(UUID, BIGINT) TO authenticated;

-- 6. create_article_media_upload -------------------------------------------------
-- Issues a staging path + records a pending asset/article_asset pair. Returns
-- {asset_id, path}; the app layer mints the signed upload URL.
CREATE OR REPLACE FUNCTION public.create_article_media_upload(
  p_article_id UUID,
  p_mime_type TEXT,
  p_bytes BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
  v_asset_id UUID := gen_random_uuid();
  v_ext TEXT;
  v_path TEXT;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_article
  FROM public.articles
  WHERE id = p_article_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_article.status = 'archived' THEN
    RAISE EXCEPTION 'article_archived' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.article_media_check_file(p_mime_type, p_bytes);
  PERFORM public.article_media_check_quota(p_article_id, p_bytes);

  v_ext := public.article_media_extension(p_mime_type);
  v_path := 'staff/' || v_user::text || '/articles/' || p_article_id::text
            || '/' || v_asset_id::text || '.' || v_ext;

  INSERT INTO public.assets (
    id, owner_user_id, storage_provider, storage_key, bucket,
    media_type, mime_type, bytes, visibility, source_type
  ) VALUES (
    v_asset_id, v_user, 'supabase', v_path, 'article-media',
    CASE WHEN p_mime_type LIKE 'video/%' THEN 'video' ELSE 'image' END,
    p_mime_type, p_bytes, 'private', 'article_media'
  );

  INSERT INTO public.article_assets (
    article_id, asset_id, uploader_user_id, kind, state, staging_key
  ) VALUES (
    p_article_id, v_asset_id, v_user, 'upload', 'pending', v_path
  );

  RETURN jsonb_build_object('asset_id', v_asset_id, 'path', v_path);
END;
$$;

REVOKE ALL ON FUNCTION public.create_article_media_upload(UUID, TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_article_media_upload(UUID, TEXT, BIGINT) TO authenticated;

-- 7. finalize_article_media_upload ------------------------------------------------
-- Verifies the uploaded object exists in storage.objects with matching
-- metadata, then flips pending -> ready. Idempotent: an already-ready (or
-- published) row returns successfully. The app layer performs content-level
-- verification (magic bytes, real dimensions) BEFORE calling this — the RPC
-- is the structural/storage authority.
CREATE OR REPLACE FUNCTION public.finalize_article_media_upload(
  p_asset_id UUID,
  p_verified_mime_type TEXT,
  p_verified_bytes BIGINT,
  p_width INT DEFAULT NULL,
  p_height INT DEFAULT NULL,
  p_duration_ms INT DEFAULT NULL
)
RETURNS public.article_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_aa public.article_assets;
  v_asset public.assets;
  v_obj RECORD;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_aa
  FROM public.article_assets
  WHERE asset_id = p_asset_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_media_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent finalization.
  IF v_aa.state IN ('ready', 'published') THEN
    RETURN v_aa;
  END IF;

  SELECT * INTO v_asset
  FROM public.assets
  WHERE id = p_asset_id;

  -- The staging path is generated by create_article_media_upload and already
  -- regex-bound; verify it still points inside the uploader's namespace.
  IF v_aa.staging_key <>
     'staff/' || v_aa.uploader_user_id::text || '/articles/'
     || v_aa.article_id::text || '/' || p_asset_id::text || '.'
     || public.article_media_extension(v_asset.mime_type) THEN
    RAISE EXCEPTION 'invalid_staging_path' USING ERRCODE = 'P0001';
  END IF;

  SELECT bucket_id, name, (metadata->>'mimetype') AS mimetype,
         (metadata->>'size')::BIGINT AS size
  INTO v_obj
  FROM storage.objects
  WHERE bucket_id = 'article-media' AND name = v_aa.staging_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'upload_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_obj.mimetype IS DISTINCT FROM v_asset.mime_type
     OR v_obj.size IS DISTINCT FROM v_asset.bytes THEN
    RAISE EXCEPTION 'upload_metadata_mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Content-level facts verified by the app (sharp/magic bytes) must still be
  -- inside bounds and consistent with the stored object.
  PERFORM public.article_media_check_file(p_verified_mime_type, p_verified_bytes);
  IF p_verified_mime_type <> v_asset.mime_type
     OR p_verified_bytes <> v_asset.bytes THEN
    RAISE EXCEPTION 'upload_content_mismatch' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.assets
  SET
    width = COALESCE(p_width, width),
    height = COALESCE(p_height, height),
    duration_ms = COALESCE(p_duration_ms, duration_ms)
  WHERE id = p_asset_id;

  UPDATE public.article_assets
  SET state = 'ready', ready_at = NOW()
  WHERE id = v_aa.id
  RETURNING * INTO v_aa;

  RETURN v_aa;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_article_media_upload(UUID, TEXT, BIGINT, INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_article_media_upload(UUID, TEXT, BIGINT, INT, INT, INT) TO authenticated;

-- 8. register_article_generation_derivative ---------------------------------------
-- "Publish this output in the article" — the affirmative consent action for an
-- author's own PRIVATE generation. The app copies the output object into the
-- deterministic staging path staff/{uid}/articles/{article}/{p_asset_id}.{ext}
-- FIRST, then calls this RPC, which independently verifies generation
-- ownership + completion, that the staged object really exists with the
-- declared metadata, and records consent metadata. Idempotent per
-- (article, source output).
CREATE OR REPLACE FUNCTION public.register_article_generation_derivative(
  p_article_id UUID,
  p_generation_id UUID,
  p_asset_id UUID,
  p_mime_type TEXT,
  p_bytes BIGINT,
  p_width INT DEFAULT NULL,
  p_height INT DEFAULT NULL
)
RETURNS public.article_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
  v_generation public.generations;
  v_output_asset_id UUID;
  v_staging_key TEXT;
  v_obj RECORD;
  v_aa public.article_assets;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_article FROM public.articles WHERE id = p_article_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_article.status = 'archived' THEN
    RAISE EXCEPTION 'article_archived' USING ERRCODE = 'P0001';
  END IF;

  -- The caller must OWN a completed generation. Admin/owner visibility into
  -- other people's outputs is deliberately NOT enough — this is publication
  -- consent, not moderation access. Third-party results go through the share
  -- link path instead.
  SELECT * INTO v_generation
  FROM public.generations
  WHERE id = p_generation_id
    AND user_id = v_user
    AND status = 'completed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'generation_not_publishable' USING ERRCODE = 'P0001';
  END IF;

  -- Primary (or first) output asset of the generation.
  SELECT go.asset_id INTO v_output_asset_id
  FROM public.generation_outputs go
  JOIN public.assets a ON a.id = go.asset_id
  WHERE go.generation_id = p_generation_id
    AND a.deleted_at IS NULL
    AND a.media_type = 'image'
  ORDER BY go.is_primary DESC, go.created_at ASC
  LIMIT 1;
  IF v_output_asset_id IS NULL THEN
    RAISE EXCEPTION 'generation_output_missing' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent: same source output -> same derivative row.
  SELECT * INTO v_aa
  FROM public.article_assets
  WHERE article_id = p_article_id AND source_asset_id = v_output_asset_id;
  IF FOUND THEN
    RETURN v_aa;
  END IF;

  PERFORM public.article_media_check_file(p_mime_type, p_bytes);
  PERFORM public.article_media_check_quota(p_article_id, p_bytes);

  -- The staging path is derived entirely from verified inputs — the caller
  -- cannot smuggle an arbitrary key. It must point at an object that actually
  -- exists in the private bucket with matching stored metadata.
  v_staging_key := 'staff/' || v_user::text || '/articles/'
    || p_article_id::text || '/' || p_asset_id::text || '.'
    || public.article_media_extension(p_mime_type);

  SELECT (metadata->>'mimetype') AS mimetype,
         (metadata->>'size')::BIGINT AS size
  INTO v_obj
  FROM storage.objects
  WHERE bucket_id = 'article-media' AND name = v_staging_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'staged_copy_missing' USING ERRCODE = 'P0002';
  END IF;
  IF v_obj.mimetype IS DISTINCT FROM p_mime_type
     OR v_obj.size IS DISTINCT FROM p_bytes THEN
    RAISE EXCEPTION 'staged_copy_mismatch' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.assets (
    id, owner_user_id, storage_provider, storage_key, bucket,
    media_type, mime_type, bytes, width, height, visibility, source_type
  ) VALUES (
    p_asset_id, v_user, 'supabase', v_staging_key, 'article-media',
    'image', p_mime_type, p_bytes, p_width, p_height, 'private',
    'article_generation'
  );

  INSERT INTO public.article_assets (
    article_id, asset_id, uploader_user_id, kind, state, staging_key,
    source_generation_id, source_asset_id,
    consent_confirmed_by, consent_confirmed_at
  ) VALUES (
    p_article_id, p_asset_id, v_user, 'generation_derivative', 'ready',
    v_staging_key, p_generation_id, v_output_asset_id, v_user, NOW()
  )
  RETURNING * INTO v_aa;

  RETURN v_aa;
END;
$$;

REVOKE ALL ON FUNCTION public.register_article_generation_derivative(UUID, UUID, UUID, TEXT, BIGINT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_article_generation_derivative(UUID, UUID, UUID, TEXT, BIGINT, INT, INT) TO authenticated;

-- 9. update_article_media ----------------------------------------------------------
-- Editorial metadata only (alt text / caption) — never the object itself.
CREATE OR REPLACE FUNCTION public.update_article_media(
  p_article_asset_id UUID,
  p_alt_text TEXT DEFAULT NULL,
  p_caption TEXT DEFAULT NULL
)
RETURNS public.article_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_aa public.article_assets;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  IF p_alt_text IS NOT NULL AND char_length(p_alt_text) > 300 THEN
    RAISE EXCEPTION 'alt_text_too_long' USING ERRCODE = 'P0001';
  END IF;
  IF p_caption IS NOT NULL AND char_length(p_caption) > 1000 THEN
    RAISE EXCEPTION 'caption_too_long' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.article_assets
  SET
    alt_text = COALESCE(p_alt_text, alt_text),
    caption = COALESCE(p_caption, caption)
  WHERE id = p_article_asset_id
  RETURNING * INTO v_aa;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_media_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_aa;
END;
$$;

REVOKE ALL ON FUNCTION public.update_article_media(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_article_media(UUID, TEXT, TEXT) TO authenticated;

-- 10. delete_article_media -----------------------------------------------------------
-- Removes the article<->asset link and the assets row. Returns the object keys
-- the app must delete from storage (staging + published copy if present).
CREATE OR REPLACE FUNCTION public.delete_article_media(p_article_asset_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_aa public.article_assets;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_aa
  FROM public.article_assets
  WHERE id = p_article_asset_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_media_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.assets WHERE id = v_aa.asset_id;

  RETURN jsonb_build_object(
    'staging_key', v_aa.staging_key,
    'published_key', v_aa.published_key,
    'was_published', v_aa.state = 'published'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_article_media(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_article_media(UUID) TO authenticated;

-- 11. Promotion / revocation -------------------------------------------------------
-- Promotion happens AFTER the app copies each staging object to the public
-- bucket (storage bytes cannot move inside a transaction). This flips every
-- ready article asset to published and repoints the assets row at the public
-- copy — atomically, per article. Re-publish is idempotent: published_key is
-- stable per asset, and already-published rows are untouched.
CREATE OR REPLACE FUNCTION public.mark_article_media_published(p_article_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_count INT;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  WITH to_publish AS (
    SELECT aa.id, aa.asset_id, aa.article_id,
           'articles/' || aa.article_id::text || '/' || aa.asset_id::text
             || '.' || substring(aa.staging_key from '\.([a-z0-9]+)$') AS pkey
    FROM public.article_assets aa
    WHERE aa.article_id = p_article_id
      AND aa.state = 'ready'
  ), upd AS (
    UPDATE public.article_assets aa
    SET state = 'published',
        published_key = tp.pkey,
        published_at = NOW(),
        revoked_at = NULL
    FROM to_publish tp
    WHERE aa.id = tp.id
    RETURNING aa.id
  )
  SELECT COUNT(*) INTO v_count FROM upd;

  UPDATE public.assets a
  SET bucket = 'article-media-public',
      storage_key = aa.published_key,
      visibility = 'public'
  FROM public.article_assets aa
  WHERE aa.asset_id = a.id
    AND aa.article_id = p_article_id
    AND aa.state = 'published'
    AND a.bucket <> 'article-media-public';

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_article_media_published(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_article_media_published(UUID) TO authenticated;

-- Revocation runs BEFORE public objects are deleted so the public projection
-- (public_asset_json) stops resolving immediately. Returns the published keys
-- whose objects the app should delete best-effort; already-revoked rows are
-- skipped (idempotent).
CREATE OR REPLACE FUNCTION public.revoke_article_media(p_article_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_keys JSONB;
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.assets a
  SET bucket = 'article-media',
      storage_key = aa.staging_key,
      visibility = 'private'
  FROM public.article_assets aa
  WHERE aa.asset_id = a.id
    AND aa.article_id = p_article_id
    AND aa.state = 'published';

  WITH revoked AS (
    UPDATE public.article_assets aa
    SET state = 'ready', revoked_at = NOW()
    WHERE aa.article_id = p_article_id
      AND aa.state = 'published'
    RETURNING aa.published_key
  )
  SELECT COALESCE(jsonb_agg(published_key), '[]'::jsonb)
  INTO v_keys FROM revoked;

  RETURN jsonb_build_object('revoked_keys', v_keys);
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_article_media(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_article_media(UUID) TO authenticated;

-- 12. Shared-generation resolver ----------------------------------------------------
-- Fixed-projection read for a THIRD-PARTY shared result. Returns NULL unless
-- the creator's share is still live and the generation is completed — the
-- renderer links out to /s/{shareId} and never copies the media. This is the
-- only code path that may surface another user's output, and it intentionally
-- ignores staff/admin access: share consent is the boundary, not admin power.
CREATE OR REPLACE FUNCTION public.resolve_article_generation(p_generation_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN g.id IS NULL THEN NULL ELSE jsonb_build_object(
    'generationId', g.id,
    'shareId', g.public_share_id,
    'productName', COALESCE(p.name, 'Untitled'),
    'productSlug', COALESCE(p.slug, ''),
    'outputAssetId', go.asset_id,
    'mimeType', a.mime_type,
    'width', a.width,
    'height', a.height
  ) END
  FROM public.generations g
  LEFT JOIN public.products p ON p.id = g.product_id
  LEFT JOIN LATERAL (
    SELECT o.asset_id, o.width, o.height
    FROM public.generation_outputs o
    JOIN public.assets ao ON ao.id = o.asset_id
    WHERE o.generation_id = g.id
      AND ao.deleted_at IS NULL
      AND ao.media_type = 'image'
    ORDER BY o.is_primary DESC, o.created_at ASC
    LIMIT 1
  ) go ON TRUE
  LEFT JOIN public.assets a ON a.id = go.asset_id
  WHERE g.id = p_generation_id
    AND g.status = 'completed'
    AND g.public_share_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.resolve_article_generation(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_article_generation(UUID) TO anon, authenticated;

-- Same projection, keyed by the public share id — used when an author pastes a
-- /s/{shareId} link into the chooser. Returns NULL for disabled/removed shares.
CREATE OR REPLACE FUNCTION public.resolve_article_generation_by_share_id(p_share_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.resolve_article_generation(g.id)
  FROM public.generations g
  WHERE g.public_share_id = p_share_id;
$$;

REVOKE ALL ON FUNCTION public.resolve_article_generation_by_share_id(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_article_generation_by_share_id(UUID) TO anon, authenticated;

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
