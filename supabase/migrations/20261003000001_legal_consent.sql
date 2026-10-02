-- Legal consent tracking: records which version of the legal documents a
-- user accepted and when. Populated from auth user metadata at signup
-- (password flow passes legal_consent_version), or stamped on first
-- OAuth/email-confirmation login via the auth callback.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_consent_version text,
  ADD COLUMN IF NOT EXISTS legal_consent_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    status,
    legal_consent_version,
    legal_consent_accepted_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'active',
    NEW.raw_user_meta_data ->> 'legal_consent_version',
    CASE
      WHEN NEW.raw_user_meta_data ->> 'legal_consent_version' IS NOT NULL
        THEN now()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
