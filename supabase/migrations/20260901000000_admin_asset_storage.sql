INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'preset-media',
    'preset-media',
    TRUE,
    26214400,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
  ),
  (
    'user-assets',
    'user-assets',
    FALSE,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "preset_media_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'preset-media');

CREATE POLICY "preset_media_admin_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'preset-media' AND public.is_admin());

CREATE POLICY "preset_media_admin_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'preset-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'preset-media' AND public.is_admin());

CREATE POLICY "preset_media_admin_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'preset-media' AND public.is_admin());

CREATE POLICY "user_assets_owner_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

CREATE POLICY "user_assets_owner_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

CREATE POLICY "user_assets_owner_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  )
  WITH CHECK (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

CREATE POLICY "user_assets_owner_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

DROP POLICY IF EXISTS "assets_select" ON public.assets;
DROP POLICY IF EXISTS "assets_insert" ON public.assets;
DROP POLICY IF EXISTS "assets_update" ON public.assets;
DROP POLICY IF EXISTS "assets_delete" ON public.assets;

CREATE POLICY "assets_select" ON public.assets
  FOR SELECT
  USING (
    owner_user_id = (SELECT auth.uid())
    OR (visibility = 'public' AND bucket = 'preset-media')
    OR public.is_admin()
  );

CREATE POLICY "assets_insert" ON public.assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      owner_user_id = (SELECT auth.uid())
      AND bucket = 'user-assets'
      AND split_part(storage_key, '/', 1) = (SELECT auth.uid())::TEXT
      AND visibility = 'private'
    )
    OR public.is_admin()
  );

CREATE POLICY "assets_update" ON public.assets
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()) OR public.is_admin())
  WITH CHECK (
    (
      owner_user_id = (SELECT auth.uid())
      AND bucket = 'user-assets'
      AND split_part(storage_key, '/', 1) = (SELECT auth.uid())::TEXT
      AND visibility = 'private'
    )
    OR public.is_admin()
  );

CREATE POLICY "assets_delete" ON public.assets
  FOR DELETE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()) OR public.is_admin());

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_asset_id, locale, timezone) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Profile security fields cannot be updated';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
