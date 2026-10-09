-- Bachs provider migration.
--
-- Bachs is the active payment processor (PAYMENT_PROVIDER default). A
-- Bachs *subscription* (sub_*) is the subscription analogue; charges are
-- payments (ch_*) created through checkout sessions (chk_*). Buyers are
-- Bachs customers (cust_*), stored on profiles. Invoices are inv_*.
--
-- Note: Bachs is seller-of-record infrastructure, NOT a merchant of
-- record — the merchant remains seller of record.
--
-- 1. profiles: Bachs customer id.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bachs_customer_id TEXT;

-- 2. subscriptions: Bachs subscription + customer linkage.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS bachs_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS bachs_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_bachs_subscription
  ON public.subscriptions(bachs_subscription_id)
  WHERE bachs_subscription_id IS NOT NULL;

-- 3. invoices: charge / checkout-session / invoice / subscription refs.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS bachs_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS bachs_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS bachs_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS bachs_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_bachs_charge
  ON public.invoices(bachs_charge_id)
  WHERE bachs_charge_id IS NOT NULL;

-- 4. Plan → Bachs product mapping. Scoped per environment
--    (bachs_product_id_sandbox / bachs_product_id_live) so the sandbox
--    catalog and the live catalog can coexist in one row.
--    Sandbox catalog provisioned 2026-10-09 (acct_Rd1ezw2qJXmmpmOA):
--    one product per offering — weekly passes and credit packs are
--    one-time products, monthly/annual tiers carry billing_cycle.
UPDATE public.plans
SET metadata = metadata || jsonb_build_object(
  'bachs_product_id_sandbox', v.product_id
)
FROM (VALUES
  ('weekly-starter',  'prod_64f41739635147e2b564'),
  ('weekly-plus',     'prod_87cbf8c9ff634283b708'),
  ('monthly-creator', 'prod_08adf8fa2ffa446e94ca'),
  ('monthly-pro',     'prod_1bee9739ace34d6398bd'),
  ('monthly-studio',  'prod_626c21b3c45a433183dc'),
  ('monthly-agency',  'prod_1a08ea67820541a69ea3'),
  ('annual-creator',  'prod_ed94a932df924e5c894c'),
  ('annual-pro',      'prod_8b95457bad5140018a9d'),
  ('annual-studio',   'prod_a83f822bb5934c4dab0a'),
  ('annual-agency',   'prod_b0906fd9b0434015a40a'),
  ('credits-1000',    'prod_613170d4882e4bf9bfe6'),
  ('credits-2500',    'prod_8e214f1937d04e909280'),
  ('credits-5000',    'prod_254f75f3ee914aadb613'),
  ('credits-10000',   'prod_448c10053ccf4fd6bd5b')
) AS v(slug, product_id)
WHERE plans.slug = v.slug;
