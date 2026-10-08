-- Backfill invoice linkage on existing annual drip grants.
--
-- Grant rows created before the invoice-linkage fix carry
-- metadata.subscription_id + drip_index but no invoice_id, so refunds can
-- only reverse drip 1 (via invoices.credit_ledger_entry_id). Stamp the
-- subscription's most recent paid invoice — the invoice that opened the
-- current term — onto each unlinked drip grant, matching the rule
-- findTermInvoiceId() applies at grant time.
--
-- Note: if a subscription somehow spans two terms already, year-one drips
-- would be attributed to the latest invoice. That misattribution only
-- matters if the year-one order is refunded after year two starts; the
-- alternative (no linkage) under-reverses every such refund, so the
-- latest-term approximation is strictly better.

UPDATE public.credit_ledger cl
SET metadata = cl.metadata || jsonb_build_object('invoice_id', inv.invoice_id)
FROM (
  SELECT DISTINCT ON (psid) i.id AS invoice_id, i.psid
  FROM (
    SELECT id, polar_subscription_id AS psid, created_at
    FROM public.invoices
    WHERE polar_subscription_id IS NOT NULL AND status = 'paid'
    UNION ALL
    SELECT id, creem_subscription_id, created_at
    FROM public.invoices
    WHERE creem_subscription_id IS NOT NULL AND status = 'paid'
    UNION ALL
    SELECT id, dodo_subscription_id, created_at
    FROM public.invoices
    WHERE dodo_subscription_id IS NOT NULL AND status = 'paid'
  ) i
  ORDER BY i.psid, i.created_at DESC
) inv
WHERE cl.metadata ? 'drip_index'
  AND cl.metadata->>'subscription_id' = inv.psid
  AND cl.metadata->>'invoice_id' IS NULL;
