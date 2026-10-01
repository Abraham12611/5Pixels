-- Referral-code integrity (07 §2A follow-up): codes must always be
-- exactly 6 chars from the unambiguous alphabet. Two rows were found
-- with 4–5-char codes after the first backfill (origin unknown —
-- possibly a partial manual backfill before this migration landed),
-- which fail isReferralCode's length check and would dead-link /r/<code>.
-- Regenerate any malformed code, then pin the shape with a CHECK.

DO $$
DECLARE
  r RECORD;
  tries INT;
BEGIN
  FOR r IN SELECT id FROM public.profiles
           WHERE referral_code IS NULL
              OR referral_code !~ '^[A-Z0-9]{6}$' LOOP
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

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_referral_code
  CHECK (referral_code IS NULL OR referral_code ~ '^[A-Z0-9]{6}$');
