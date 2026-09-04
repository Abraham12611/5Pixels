-- Dodo Payments integration support (PR C)
-- Adds customer-linking column and idempotency indexes for webhook safety.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_dodo_customer_id
ON public.profiles(dodo_customer_id)
WHERE dodo_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_dodo_payment_id
ON public.invoices(dodo_payment_id)
WHERE dodo_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_dodo_checkout_session_id
ON public.invoices(dodo_checkout_session_id)
WHERE dodo_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_dodo_subscription_id
ON public.subscriptions(dodo_subscription_id)
WHERE dodo_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
ON public.subscriptions(user_id, status)
WHERE status IN ('active', 'past_due');

COMMENT ON COLUMN public.profiles.dodo_customer_id IS 'Dodo Payments customer id for portal and checkout attribution';
