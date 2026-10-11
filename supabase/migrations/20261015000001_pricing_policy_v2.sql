-- Version the $0.01 denomination instead of rewriting v1 in place
-- ---------------------------------------------------------------------------
-- 20261014000001 updated the v1 row to credit_capacity_usd = 0.01, which
-- collapsed the version pin: a top-up checkout created under v1 ($0.001)
-- that fulfills after the switch would grant 10× the provider-cost budget
-- it sold (6,060 credits → $60.60 capacity on a $10 purchase).
--
-- Restore v1 to its true historical denomination (retired) and activate v2
-- at $0.01, so fulfillment can translate a pinned grant through the pinned
-- version's capacity: 6,060 × $0.001 / $0.01 = 606 credits = $6.06 — the
-- exact budget the customer bought.
-- ---------------------------------------------------------------------------

-- 1. Relax the fixed-capacity pin — versioning supersedes it.
ALTER TABLE public.pricing_policies
  DROP CONSTRAINT IF EXISTS pricing_policies_fixed_capacity;

-- 2. Restore v1 to its true historical denomination; retire it.
UPDATE public.pricing_policies
SET credit_capacity_usd = 0.001,
    is_active = false
WHERE version = 1;

-- 3. v2 — identical tunables, new denomination.
INSERT INTO public.pricing_policies (
  version, is_active, credit_capacity_usd, top_up_budget_ratio,
  quote_max_slack_factor, quote_ttl_seconds, snapshot_ttl_hours
)
SELECT
  2, true, 0.01, p.top_up_budget_ratio, p.quote_max_slack_factor,
  p.quote_ttl_seconds, p.snapshot_ttl_hours
FROM public.pricing_policies p
WHERE p.version = 1
ON CONFLICT (version) DO NOTHING;

-- 4. The live denomination is still not tunable: only a $0.01-capacity row
-- may be active. Historical versions keep their own capacity so pinned
-- checkouts remain translatable.
ALTER TABLE public.pricing_policies
  ADD CONSTRAINT pricing_policies_active_capacity
    CHECK (is_active = false OR credit_capacity_usd = 0.01);
