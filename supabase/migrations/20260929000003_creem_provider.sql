-- Creem payment provider columns, mirroring the polar_*/dodo_* column set.
-- Plans map to Creem products via plans.metadata keys
-- creem_product_id_test / creem_product_id_live (resolved by environment,
-- with a creem_product_id legacy fallback) — same convention as Polar's
-- polar_product_id_sandbox/_production.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creem_customer_id TEXT;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS creem_customer_id TEXT;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS creem_order_id TEXT,
  ADD COLUMN IF NOT EXISTS creem_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_creem_order_id
  ON public.invoices(creem_order_id)
  WHERE creem_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_creem_subscription_id
  ON public.subscriptions(creem_subscription_id)
  WHERE creem_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_creem_customer_id
  ON public.profiles(creem_customer_id)
  WHERE creem_customer_id IS NOT NULL;
