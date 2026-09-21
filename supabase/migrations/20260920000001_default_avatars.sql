-- Default avatars: new users get a randomly assigned shared avatar.
--
-- The 24 default avatar images are generated assets shipped with the app at
-- apps/web/public/avatars/ and served as static files (/avatars/<file>).
-- They are recorded in `assets` with bucket='default-avatars' — a
-- pseudo-bucket marker meaning "served by the app", NOT a Supabase storage
-- bucket — plus source_type='default_avatar', visibility='public',
-- owner_user_id=NULL. Client code resolves these rows to /avatars/<key>.
--
-- A dedicated SELECT policy exposes them to signed-in users (the existing
-- assets_select policy only covers owner rows, preset-media public rows,
-- and admins). The signup trigger runs as SECURITY DEFINER and picks one at
-- random.

CREATE INDEX IF NOT EXISTS idx_assets_default_avatar
  ON public.assets (source_type)
  WHERE source_type = 'default_avatar';

CREATE POLICY assets_select_default_avatars ON public.assets
  FOR SELECT TO authenticated
  USING (
    source_type = 'default_avatar'
    AND visibility = 'public'
    AND deleted_at IS NULL
  );

INSERT INTO public.assets
  (owner_user_id, storage_provider, bucket, storage_key, media_type,
   mime_type, bytes, width, height, visibility, source_type, moderation_status)
VALUES
    (NULL, 'supabase', 'default-avatars', 'avatar-01-robot-mascot.jpg', 'image', 'image/jpeg', 63073, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-02-fox.jpg', 'image', 'image/jpeg', 155994, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-03-line-art.jpg', 'image', 'image/jpeg', 53747, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-04-pixel-art.jpg', 'image', 'image/jpeg', 104286, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-05-chrome-blob.jpg', 'image', 'image/jpeg', 157143, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-06-cat-glasses.jpg', 'image', 'image/jpeg', 126383, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-07-origami.jpg', 'image', 'image/jpeg', 74317, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-08-astronaut.jpg', 'image', 'image/jpeg', 91976, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-09-lowpoly-bear.jpg', 'image', 'image/jpeg', 74267, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-10-clay-blob.jpg', 'image', 'image/jpeg', 95473, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-11-crt-glitch.jpg', 'image', 'image/jpeg', 162817, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-12-golden.jpg', 'image', 'image/jpeg', 103516, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-13-alien.jpg', 'image', 'image/jpeg', 60335, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-14-panda.jpg', 'image', 'image/jpeg', 289788, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-15-marble.jpg', 'image', 'image/jpeg', 122653, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-16-holo-orb.jpg', 'image', 'image/jpeg', 101698, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-17-film-camera.jpg', 'image', 'image/jpeg', 132332, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-18-paper-cut.jpg', 'image', 'image/jpeg', 124941, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-19-neon-face.jpg', 'image', 'image/jpeg', 183985, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-20-halftone.jpg', 'image', 'image/jpeg', 339783, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-21-frog.jpg', 'image', 'image/jpeg', 147513, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-22-knitted.jpg', 'image', 'image/jpeg', 176657, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-23-ink-owl.jpg', 'image', 'image/jpeg', 220286, 1024, 1024, 'public', 'default_avatar', 'approved'),
    (NULL, 'supabase', 'default-avatars', 'avatar-24-tin-robot.jpg', 'image', 'image/jpeg', 193386, 1024, 1024, 'public', 'default_avatar', 'approved')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_avatar_id UUID;
BEGIN
  SELECT a.id INTO v_avatar_id
  FROM public.assets a
  WHERE a.source_type = 'default_avatar'
    AND a.deleted_at IS NULL
  ORDER BY random()
  LIMIT 1;

  INSERT INTO public.profiles (id, email, status, avatar_asset_id)
  VALUES (NEW.id, NEW.email, 'active', v_avatar_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
