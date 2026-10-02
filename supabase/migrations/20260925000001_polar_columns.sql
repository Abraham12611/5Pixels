-- Polar payments integration (Dodo → Polar migration, docs/monetization/05).
-- Adds polar_* columns alongside the existing dodo_* ones so both providers
-- can coexist behind the PAYMENT_PROVIDER flag during transition.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_polar_customer_id
ON public.profiles(polar_customer_id)
WHERE polar_customer_id IS NOT NULL;

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT,
ADD COLUMN IF NOT EXISTS drip_anchor_at TIMESTAMPTZ;

COMMENT ON COLUMN public.subscriptions.drip_anchor_at IS
  'Term start used to derive every drip date (anchor + N months, clamped to month end). Fixed at subscription creation so drip dates never drift.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_subscription_id
ON public.subscriptions(polar_subscription_id)
WHERE polar_subscription_id IS NOT NULL;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS polar_order_id TEXT,
ADD COLUMN IF NOT EXISTS polar_checkout_id TEXT,
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_polar_order_id
ON public.invoices(polar_order_id)
WHERE polar_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_polar_checkout_id
ON public.invoices(polar_checkout_id)
WHERE polar_checkout_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.polar_customer_id IS 'Polar customer id for portal and checkout attribution';
