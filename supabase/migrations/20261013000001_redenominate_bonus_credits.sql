-- Re-denominate bonus grants + fix credit-pack display names
-- ---------------------------------------------------------------------------
-- The fixed-credit denomination (1 credit = $0.001 of provider-cost capacity)
-- made the remaining small fixed grants meaningless:
--
--   signup grant          10 credits  → $0.01  (and was already dead code —
--                          handle_new_user stopped granting it when legal-
--                          consent columns were added)
--   referrer signup bonus 50 credits  → $0.05  (lib/referrals/reward-amounts.ts)
--   referee signup bonus  25 credits  → $0.025
--
-- New amounts (chosen so each bonus ≈ one free transformation at typical
-- preset costs of ~40–90 credits):
--
--   signup grant          → 100 credits ($0.10)
--   referrer signup bonus → 250 credits ($0.25)   [code constant]
--   referee signup bonus  → 100 credits ($0.10)   [code constant]
--
-- Only the signup grant lives in the database; the referral amounts are
-- TypeScript constants updated in the same change set.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. handle_new_user — restore the signup grant at the new denomination
-- ---------------------------------------------------------------------------

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

  -- Grant 100 welcome credits exactly once per user (≈ one free
  -- transformation at ~40–90 credit preset costs). Idempotency key makes
  -- trigger retries safe.
  INSERT INTO public.credit_ledger (
    user_id,
    entry_type,
    amount,
    idempotency_key,
    metadata
  )
  VALUES (
    NEW.id,
    'allocation',
    100,
    'signup:' || NEW.id::text,
    jsonb_build_object('reason', 'initial_signup_credits')
  )
  ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Credit-pack display names — the name must match what the pack grants
-- ---------------------------------------------------------------------------
-- The packs were seeded as "1,000 Credits" / "2,500 Credits" / … under the
-- old model where the name described the grant. Grants are now derived from
-- the active pricing policy (price × top_up_budget_ratio / $0.001), so the
-- names were claiming far fewer credits than customers actually receive.

UPDATE public.plans SET name = '6,060 Credits'  WHERE slug = 'credits-1000';
UPDATE public.plans SET name = '15,150 Credits' WHERE slug = 'credits-2500';
UPDATE public.plans SET name = '30,300 Credits' WHERE slug = 'credits-5000';
UPDATE public.plans SET name = '60,600 Credits' WHERE slug = 'credits-10000';
