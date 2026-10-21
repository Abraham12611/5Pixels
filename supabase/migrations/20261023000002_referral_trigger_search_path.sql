-- fix(db): pin search_path on set_profile_referral_code + lock down referral
-- function EXECUTE grants (#139)
--
-- public.set_profile_referral_code() (BEFORE INSERT trigger on profiles)
-- ran with the caller's search_path. Its body is fully schema-qualified, so
-- behavior was correct, but an unpinned path on a trigger function is a
-- search-path injection hazard — pin it like the repo's other functions.
--
-- Both public.generate_referral_code() and public.set_profile_referral_code()
-- were EXECUTE-able by anon + authenticated. Neither is meant to be called
-- directly — the app never RPCs them; codes are produced inside the
-- auth.users -> profiles trigger chain (handle_new_user, SECURITY DEFINER,
-- runs as the function owner, so the trigger path is unaffected). Restrict
-- EXECUTE to service_role.

CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      NEW.referral_code := public.generate_referral_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE UPPER(referral_code) = NEW.referral_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

REVOKE ALL ON FUNCTION public.generate_referral_code()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO service_role;

REVOKE ALL ON FUNCTION public.set_profile_referral_code()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_referral_code() TO service_role;
