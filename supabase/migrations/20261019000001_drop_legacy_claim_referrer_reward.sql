-- Drop the obsolete 5-argument claim_referrer_reward overload.
-- ---------------------------------------------------------------------------
-- 20261017000001 created claim_referrer_reward(UUID, UUID, TEXT, NUMERIC,
-- TEXT); 20261018000001 added p_status/p_hold_until, which Postgres treats as
-- a different function — so the old cap-semantics overload still exists
-- alongside the fixed one. Remove it so a single signature remains.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.claim_referrer_reward(UUID, UUID, TEXT, NUMERIC, TEXT);
