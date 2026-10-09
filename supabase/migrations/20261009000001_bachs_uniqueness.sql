-- Bachs webhook deliveries for one purchase arrive concurrently
-- (subscription.created + subscription.updated + invoice.paid), and
-- existence-check-then-insert races produced duplicate subscription
-- rows. Dedupe first, then enforce uniqueness so losers of the race
-- surface as constraint violations the handler can recover from.

DELETE FROM subscriptions a
USING subscriptions b
WHERE a.bachs_subscription_id IS NOT NULL
  AND a.bachs_subscription_id = b.bachs_subscription_id
  AND a.created_at > b.created_at;

DELETE FROM invoices a
USING invoices b
WHERE a.bachs_invoice_id IS NOT NULL
  AND a.bachs_invoice_id = b.bachs_invoice_id
  AND a.created_at > b.created_at;

DELETE FROM invoices a
USING invoices b
WHERE a.bachs_charge_id IS NOT NULL
  AND a.bachs_charge_id = b.bachs_charge_id
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_bachs_subscription_id_key
  ON subscriptions (bachs_subscription_id)
  WHERE bachs_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_bachs_invoice_id_key
  ON invoices (bachs_invoice_id)
  WHERE bachs_invoice_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_bachs_charge_id_key
  ON invoices (bachs_charge_id)
  WHERE bachs_charge_id IS NOT NULL;
