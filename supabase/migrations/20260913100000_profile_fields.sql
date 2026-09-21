-- Profile public fields: username, headline, bio, location, socials, and spent-credits toggle.
-- Also adds an updated_at trigger for the profiles table.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS show_spent_credits BOOLEAN DEFAULT FALSE;

-- Unique, case-insensitive username. Optional in V1 (NULL allowed).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- Help users find each other by handle when profiles become public later.
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (LOWER(username));

-- Enforce reasonable length limits at the database level.
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_username_length CHECK (username IS NULL OR CHAR_LENGTH(username) BETWEEN 2 AND 32),
  ADD CONSTRAINT chk_profiles_headline_length CHECK (headline IS NULL OR CHAR_LENGTH(headline) <= 120),
  ADD CONSTRAINT chk_profiles_bio_length CHECK (bio IS NULL OR CHAR_LENGTH(bio) <= 300),
  ADD CONSTRAINT chk_profiles_location_length CHECK (location IS NULL OR CHAR_LENGTH(location) <= 80);

-- Ensure updated_at is bumped on every profile change.
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- RLS: users can update their own profile row (these fields are not sensitive).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_owner_update'
  ) THEN
    CREATE POLICY "profiles_owner_update" ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;
