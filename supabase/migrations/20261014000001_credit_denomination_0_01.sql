-- Re-denominate credits: 1 credit = $0.01 of provider-cost capacity
-- ---------------------------------------------------------------------------
-- The $0.001 denomination produced balances in the thousands (6,060 credits
-- for a $20 plan), which reads like "thousands of images" to a customer when
-- a typical transformation costs 40–90 credits. At $0.01/credit the same
-- economics read honestly: 606 credits/month, ~8 credits per transformation.
--
-- Provider-cost economics are UNCHANGED — every stored credit figure is
-- divided by 10, every USD value stays identical. All tester balances are
-- already zero (20261009000001 §11), so this is a clean denomination break.
--
-- Grant values (per the canonical margin table, rounded DOWN — never over):
--   weekly-starter $5   1,136 → 113   ($1.13 provider budget)
--   weekly-plus    $10  2,597 → 259   ($2.59)
--   creator        $20  6,060 → 606   ($6.06)
--   pro            $30 10,909 → 1,090 ($10.90)
--   studio         $50 25,000 → 2,500 ($25.00)
--   agency        $100 64,171 → 6,417 ($64.17)
--   packs (policy-derived): $10/$25/$50/$100 → 606 / 1,515 / 3,030 / 6,060
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. pricing_policies — repin the fixed capacity at $0.01
-- ---------------------------------------------------------------------------

ALTER TABLE public.pricing_policies
  DROP CONSTRAINT IF EXISTS pricing_policies_fixed_capacity;

UPDATE public.pricing_policies SET credit_capacity_usd = 0.01;

-- The denomination remains permanent, not tunable — now pinned to $0.01.
ALTER TABLE public.pricing_policies
  ADD CONSTRAINT pricing_policies_fixed_capacity
    CHECK (credit_capacity_usd = 0.01);

-- ---------------------------------------------------------------------------
-- 2. credits_for_provider_cost — conversion primitive at the new denomination
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.credits_for_provider_cost(p_cost_usd NUMERIC)
RETURNS NUMERIC(12,4)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CEIL(p_cost_usd / 0.01)::NUMERIC(12,4);
$$;

REVOKE ALL ON FUNCTION public.credits_for_provider_cost(NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credits_for_provider_cost(NUMERIC) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Re-denominate every stored credit figure (÷10)
-- ---------------------------------------------------------------------------

UPDATE public.credit_ledger        SET amount = amount / 10;
UPDATE public.generation_quotes    SET reserve_credits = reserve_credits / 10;
UPDATE public.generations
SET credit_cost = credit_cost / 10,
    actual_credit_cost = actual_credit_cost / 10;
-- provisional_credit_cost exists only after 20261012000001 (reserve-until-
-- settlement) — guard so this migration replays cleanly regardless of PR
-- merge order.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generations'
      AND column_name = 'provisional_credit_cost'
  ) THEN
    UPDATE public.generations
    SET provisional_credit_cost = provisional_credit_cost / 10;
  END IF;
END $$;
UPDATE public.referral_rewards     SET credits = credits / 10;
UPDATE public.provider_billing_events
SET ledger_credit_delta = ledger_credit_delta / 10
WHERE ledger_credit_delta IS NOT NULL;

-- Plan grants ÷10, floored so rounding always favors margin, never the
-- customer (canonical margin table — the budgets are preserved, the
-- denomination is not). Applies uniformly: plans AND extra_credit packs.
UPDATE public.plans SET credits_grant = FLOOR(credits_grant / 10);

-- Catalog "from ~N credits" hints: ÷10 rounded UP so a hint never understates
-- a transformation's cost. credit_cost is guarded by the recipe-immutability
-- trigger — same sanctioned-update pattern as 20261009000001 §12.
ALTER TABLE public.product_versions DISABLE TRIGGER prevent_active_version_recipe_update;
UPDATE public.product_versions
SET credit_cost = CEIL(credit_cost / 10)
WHERE credit_cost IS NOT NULL AND credit_cost <> 0;
ALTER TABLE public.product_versions ENABLE TRIGGER prevent_active_version_recipe_update;

-- ---------------------------------------------------------------------------
-- 4. Credit-pack display names — match the new grants
-- ---------------------------------------------------------------------------

UPDATE public.plans SET name = '606 Credits'   WHERE slug = 'credits-1000';
UPDATE public.plans SET name = '1,515 Credits' WHERE slug = 'credits-2500';
UPDATE public.plans SET name = '3,030 Credits' WHERE slug = 'credits-5000';
UPDATE public.plans SET name = '6,060 Credits' WHERE slug = 'credits-10000';

-- ---------------------------------------------------------------------------
-- 5. handle_new_user — no signup handout
-- ---------------------------------------------------------------------------
-- Product decision: new users receive NO credits. They buy a plan or earn
-- through referral. Removes the 100-credit grant added in 20261013000001.

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
