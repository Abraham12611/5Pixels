-- fix(db): forward-port hosted search_path pin on set_profile_referral_code
--
-- The hosted project carries a manual hardening (recorded there as
-- 20261023000002 referral_trigger_search_path) that was never in the repo:
-- the trigger function ran with the invoker's search_path while calling
-- public.generate_referral_code(). Pin it like the repo's other definer-
-- context functions. Without this forward-port a fresh environment would
-- silently drop the pin.

CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
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
$$;
