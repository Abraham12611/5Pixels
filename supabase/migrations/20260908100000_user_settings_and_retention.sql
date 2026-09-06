-- Retention and user settings (Phase 9.2)

-- User preferences and privacy controls.
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_download_format TEXT DEFAULT 'webp',
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  product_updates_opt_in BOOLEAN DEFAULT FALSE,
  auto_delete_originals_days INT,
  auto_delete_outputs_days INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);

-- Ensure every existing active user has a settings row.
INSERT INTO public.user_settings (user_id)
SELECT id FROM public.profiles
WHERE status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = profiles.id)
ON CONFLICT (user_id) DO NOTHING;

-- Trigger to create a default settings row for new profiles.
CREATE OR REPLACE FUNCTION public.create_user_settings_on_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_user_settings_after_profile ON public.profiles;
CREATE TRIGGER create_user_settings_after_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_settings_on_profile();

GRANT ALL ON public.user_settings TO authenticated;
