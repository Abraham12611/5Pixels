-- In-house referral codes (07 §2): every user gets a short human code
-- (e.g. K7M-2QX) on profiles.referral_code; codes resolve to referrers
-- for /r/<code> links and manual entry during onboarding.
-- Also extends referral_rewards.kind with 'referrer_signup_bonus' (07 §6.6).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Unambiguous alphabet: no 0/O, 1/I/L. 256 bytes mod 32 is perfectly uniform.
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes    BYTEA := gen_random_bytes(6);
  code     TEXT := '';
  i        INT;
BEGIN
  FOR i IN 0..5 LOOP
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code_unique
  ON public.profiles (UPPER(referral_code))
  WHERE referral_code IS NOT NULL;

-- Assign a code on profile creation, retrying on the (rare) collision.
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_referral_code ON public.profiles;
CREATE TRIGGER trg_profiles_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_referral_code();

-- Backfill existing users, retrying per row until the insert sticks.
DO $$
DECLARE
  r RECORD;
  tries INT;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    tries := 0;
    LOOP
      tries := tries + 1;
      BEGIN
        UPDATE public.profiles
          SET referral_code = public.generate_referral_code()
          WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF tries >= 8 THEN RAISE; END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Referrer signup bonus (07 §6.6): fixed credits when a referred friend
-- completes signup, alongside the existing 30% first-payment share.
ALTER TABLE public.referral_rewards
  DROP CONSTRAINT referral_rewards_kind_check;

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_kind_check
  CHECK (kind IN (
    'referee_unlock',
    'referrer_payment_share',
    'growsurf_milestone',
    'referrer_signup_bonus'
  ));

-- One signup bonus per referee — same once-ever pattern as the other kinds.
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_signup_bonus_once
  ON public.referral_rewards (referee_user_id, kind)
  WHERE kind = 'referrer_signup_bonus' AND referee_user_id IS NOT NULL;
