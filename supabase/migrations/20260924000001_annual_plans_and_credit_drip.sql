-- Annual plans + monthly credit drip.
--
-- Pricing rationale is in docs/monetization/06_ANNUAL_PLANS.md. In short:
-- on a credit product an annual discount is funded out of gross margin, so the
-- safe discount per tier is bounded by that tier's markup_multiplier. A flat 50%
-- across all tiers is loss-making on Studio (-10%) and Agency (-41%); the
-- discounts below keep worst-case (fully-spent) margin above 25% everywhere.
--
-- Credits are granted one month at a time via the drip scheduler, never as a
-- single upfront grant: Agency Annual would otherwise hand over ~$84.7k of
-- provider cost on day one.

-- 1. Allow the new plan type and interval.
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_type_check;
ALTER TABLE public.plans
  ADD CONSTRAINT plans_type_check
  CHECK (type IN ('weekly_trial', 'monthly', 'annual', 'extra_credit'));

ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_interval_check;
ALTER TABLE public.plans
  ADD CONSTRAINT plans_interval_check
  CHECK (interval IN ('weekly', 'monthly', 'annual', 'one_time'));

-- 2. Drip configuration.
--    credit_drip_months = how many monthly grants the term produces.
--    credits_grant stays the PER-DRIP amount so existing fulfilment math is
--    unchanged for monthly/weekly plans (drip count 1).
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS credit_drip_months INTEGER NOT NULL DEFAULT 1
    CHECK (credit_drip_months >= 1);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS next_drip_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS drips_granted INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_drip
  ON public.subscriptions(next_drip_at)
  WHERE status = 'active' AND next_drip_at IS NOT NULL;

-- 3. Annual plans.
--
--  tier    | monthly | annual | eff/mo | disc | credits/mo | markup | worst-case margin
--  Creator |     $20 |   $120 | $10.00 |  50% |      2,000 |  3.0x  | 33.3%
--  Pro     |     $30 |   $216 | $18.00 |  40% |      3,000 |  2.5x  | 33.3%
--  Studio  |     $50 |   $450 | $37.50 |  25% |      5,500 |  2.0x  | 26.7%
--  Agency  |    $100 | $1,140 | $95.00 |   5% |     12,000 |  1.7x  | 25.7%
--
-- markup_multiplier is deliberately IDENTICAL to each tier's monthly plan, so
-- annual subscribers get the same credit-to-generation rate. The discount is
-- expressed purely in price, never by degrading credit value.
INSERT INTO public.plans (
  slug, name, type, price_cents, currency, credits_grant, markup_multiplier,
  interval, is_trial, can_repurchase, sort_order, is_active,
  credit_drip_months, metadata
) VALUES
  ('annual-creator', 'Creator Annual', 'annual', 12000, 'USD', 2000.0000, 3.0000,
   'annual', false, true, 10, true, 12,
   '{"polar_product_id": null, "dodo_product_id": null, "monthly_equivalent_cents": 1000, "discount_percent": 50, "sibling_monthly_slug": "monthly-creator", "hero": true}'::jsonb),

  ('annual-pro', 'Pro Annual', 'annual', 21600, 'USD', 3000.0000, 2.5000,
   'annual', false, true, 11, true, 12,
   '{"polar_product_id": null, "dodo_product_id": null, "monthly_equivalent_cents": 1800, "discount_percent": 40, "sibling_monthly_slug": "monthly-pro"}'::jsonb),

  ('annual-studio', 'Studio Annual', 'annual', 45000, 'USD', 5500.0000, 2.0000,
   'annual', false, true, 12, true, 12,
   '{"polar_product_id": null, "dodo_product_id": null, "monthly_equivalent_cents": 3750, "discount_percent": 25, "sibling_monthly_slug": "monthly-studio"}'::jsonb),

  ('annual-agency', 'Agency Annual', 'annual', 114000, 'USD', 12000.0000, 1.7000,
   'annual', false, true, 13, true, 12,
   '{"polar_product_id": null, "dodo_product_id": null, "monthly_equivalent_cents": 9500, "discount_percent": 5, "sibling_monthly_slug": "monthly-agency"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 4. Guard: a plan whose term spans multiple drips must declare them.
--    Catches "annual plan with credit_drip_months = 1", which would grant a
--    single month of credits for a year of payment (or, if credits_grant were
--    set to the full-year amount, dump the whole liability on day one).
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_annual_requires_drip;
ALTER TABLE public.plans
  ADD CONSTRAINT plans_annual_requires_drip
  CHECK (type <> 'annual' OR credit_drip_months = 12);

COMMENT ON COLUMN public.plans.credit_drip_months IS
  'Number of monthly credit grants per billing term. 1 for weekly/monthly plans, 12 for annual. credits_grant is the per-drip amount, not the term total.';
COMMENT ON COLUMN public.subscriptions.next_drip_at IS
  'When the next monthly credit grant is due. Driven by the drip scheduler, not by billing events (annual plans bill once per term).';
