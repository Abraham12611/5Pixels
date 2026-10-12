-- fix(db): repair generate_referral_code — signup-breaking defects
--
-- Two latent bugs surfaced by the db integration suite (#105):
--
-- 1. generate_referral_code runs inside handle_new_user (SECURITY DEFINER,
--    SET search_path = '') via the trg_profiles_referral_code trigger. The
--    empty search_path propagates to nested calls, so the unqualified
--    pgcrypto call failed on EVERY auth.users insert — new signups could
--    not complete. Fixed by schema-qualifying the call and pinning
--    search_path like the repo's other SECURITY DEFINER functions.
--
-- 2. The alphabet has 31 chars but indexing used % 32, so
--    substr(alphabet, 32, 1) returned '' ~1/32 of the time per character —
--    ~17% of generated codes were 5 chars and violate
--    chk_profiles_referral_code (^[A-Z0-9]{6}$), failing the profile
--    insert. This is the true origin of the malformed codes the 20261002
--    integrity migration attributed to "a partial manual backfill" — and
--    its own backfill loop regenerated malformed codes. Fixed by taking
--    the modulus of the actual alphabet length.

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes    BYTEA := extensions.gen_random_bytes(6);
  code     TEXT := '';
  i        INT;
BEGIN
  FOR i IN 0..5 LOOP
    code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE SET search_path = '';
