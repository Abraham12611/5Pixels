"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { reverseReferrerShareForRefund } from "@/lib/growsurf/sync";
import type { Refund } from "@polar-sh/sdk/models/components/refund.js";

export interface CreemRefundObject {
  id?: string;
  status?: string;
  refund_amount?: number;
  refund_currency?: string;
  reason?: string;
  /** Refund payload links back to the order via the transaction. */
  transaction?: { id?: string; order?: string; subscription?: string };
}

/**
 * Total credits granted against one invoice. A dripped annual plan is
 * 1:N with the ledger (up to 12 purchase rows share the same
 * metadata.invoice_id), so summing the linked grants is required — the
 * single credit_ledger_entry_id FK alone finds at most drip 1.
 */
async function sumGrantedCreditsForInvoice(
  service: ReturnType<typeof createServiceClient>,
  invoice: { id: string; credit_ledger_entry_id: string | null }
): Promise<number> {
  const { data: grants } = await service
    .from("credit_ledger")
    .select("id, amount")
    .filter("metadata->>invoice_id", "eq", invoice.id)
    .in("entry_type", ["purchase", "allocation"]);

  const seen = new Set<string>();
  let total = 0;
  for (const g of grants ?? []) {
    seen.add(g.id as string);
    total += Math.max(0, Number(g.amount));
  }

  // Older invoices predate metadata invoice stamps — fall back to the
  // single grant FK for those, deduped against the metadata-linked set.
  if (
    invoice.credit_ledger_entry_id &&
    !seen.has(invoice.credit_ledger_entry_id)
  ) {
    const { data: grant } = await service
      .from("credit_ledger")
      .select("amount")
      .eq("id", invoice.credit_ledger_entry_id)
      .maybeSingle();
    total += Math.max(0, Number(grant?.amount ?? 0));
  }

  return total;
}

/**
 * Reverses the credits granted by a refunded/charged-back order.
 *
 * The ledger is append-only: we never delete the grant, we add a negative
 * `debit` entry capped at the user's current available balance so
 * get_available_balance (a plain SUM over all ledger entries — reservations
 * are negative and already reduce it) is never pushed below zero. Any shortfall — credits already spent — is recorded in
 * the reversal entry's metadata as `unrecovered_credits` instead of being
 * clawed back.
 */
export async function handlePolarRefund(refund: Refund): Promise<void> {
  const service = createServiceClient();
  const idempotencyKey = `refund:${refund.id}`;

  const { data: existing } = await service
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    console.log(`[handlePolarRefund] already processed refund ${refund.id}`);
    return;
  }

  const { data: invoice } = await service
    .from("invoices")
    .select("id, user_id, credit_ledger_entry_id, plan_id")
    .eq("polar_order_id", refund.orderId)
    .maybeSingle();

  if (!invoice) {
    console.error(
      `[handlePolarRefund] no invoice for polar order ${refund.orderId}`
    );
    return;
  }

  const grantedCredits = await sumGrantedCreditsForInvoice(service, invoice);

  const { data: ledgerRows } = await service
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", invoice.user_id);

  const availableBalance = (ledgerRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const reversal = Math.min(grantedCredits, Math.max(0, availableBalance));
  const unrecovered = grantedCredits - reversal;

  const { error: ledgerError } = await service.from("credit_ledger").insert({
    user_id: invoice.user_id,
    entry_type: "debit",
    amount: -reversal,
    currency_unit: "credits",
    idempotency_key: idempotencyKey,
    metadata: {
      reason: refund.dispute ? "chargeback" : "refund",
      polar_refund_id: refund.id,
      polar_order_id: refund.orderId,
      invoice_id: invoice.id,
      granted_credits: grantedCredits,
      reversed_credits: reversal,
      unrecovered_credits: unrecovered,
    },
  });

  if (ledgerError) {
    throw new Error(
      `Failed to insert refund ledger entry: ${ledgerError.message}`
    );
  }

  await service
    .from("invoices")
    .update({ status: "refunded" })
    .eq("id", invoice.id);

  // Referral clawback (03 §4): if this purchase qualified a referrer
  // bonus, cancel its pending GrowSurf hold or reverse the granted
  // credits — capped at the referrer's available balance, same rule as
  // the buyer reversal above. Best-effort: never fail the refund over it.
  try {
    await reverseReferrerShareForRefund({
      buyerUserId: invoice.user_id,
      orderId: refund.orderId,
      refundId: refund.id,
    });
  } catch (err) {
    console.error(
      `[handlePolarRefund] referral reversal failed:`,
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log(
    `[handlePolarRefund] reversed ${reversal}/${grantedCredits} credits for order ${refund.orderId}` +
      (unrecovered > 0 ? ` (${unrecovered} already spent, recorded as loss)` : "")
  );
}

/**
 * Creem counterpart — refund.created / dispute.created carry
 * `transaction.order` (ord_*) which joins invoices.creem_order_id. Same
 * capped-reversal + referral-clawback semantics as the Polar path.
 */
export async function handleCreemRefund(
  refund: CreemRefundObject,
  isDispute = false
): Promise<void> {
  const orderId = refund.transaction?.order;
  if (!refund.id || !orderId) {
    console.error("[handleCreemRefund] refund missing id or transaction.order");
    return;
  }

  const service = createServiceClient();
  const idempotencyKey = `refund:${refund.id}`;

  const { data: existing } = await service
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    console.log(`[handleCreemRefund] already processed refund ${refund.id}`);
    return;
  }

  const { data: orderInvoice } = await service
    .from("invoices")
    .select("id, user_id, credit_ledger_entry_id, plan_id")
    .eq("creem_order_id", orderId)
    .maybeSingle();

  // Renewal-period invoices created from subscription.paid carry no order
  // id — fall back to the subscription the refund's transaction points at.
  // Known limitation: after multiple annual terms, a delayed refund for an
  // older term can resolve to the newer term's invoice here. Acceptable for
  // launch (annual plans are new); a term-scoped refund reference is the
  // proper fix later.
  let invoice = orderInvoice;
  if (!invoice && refund.transaction?.subscription) {
    const { data: subInvoice } = await service
      .from("invoices")
      .select("id, user_id, credit_ledger_entry_id, plan_id")
      .eq("creem_subscription_id", refund.transaction.subscription)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    invoice = subInvoice;
  }

  if (!invoice) {
    console.error(`[handleCreemRefund] no invoice for creem order ${orderId}`);
    return;
  }

  const grantedCredits = await sumGrantedCreditsForInvoice(service, invoice);

  const { data: ledgerRows } = await service
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", invoice.user_id);

  const availableBalance = (ledgerRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  const reversal = Math.min(grantedCredits, Math.max(0, availableBalance));
  const unrecovered = grantedCredits - reversal;

  const { error: ledgerError } = await service.from("credit_ledger").insert({
    user_id: invoice.user_id,
    entry_type: "debit",
    amount: -reversal,
    currency_unit: "credits",
    idempotency_key: idempotencyKey,
    metadata: {
      reason: isDispute ? "chargeback" : "refund",
      creem_refund_id: refund.id,
      creem_order_id: orderId,
      invoice_id: invoice.id,
      granted_credits: grantedCredits,
      reversed_credits: reversal,
      unrecovered_credits: unrecovered,
    },
  });

  if (ledgerError) {
    throw new Error(
      `Failed to insert refund ledger entry: ${ledgerError.message}`
    );
  }

  await service
    .from("invoices")
    .update({ status: "refunded" })
    .eq("id", invoice.id);

  try {
    await reverseReferrerShareForRefund({
      buyerUserId: invoice.user_id,
      orderId,
      refundId: refund.id,
    });
  } catch (err) {
    console.error(
      `[handleCreemRefund] referral reversal failed:`,
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log(
    `[handleCreemRefund] reversed ${reversal}/${grantedCredits} credits for order ${orderId}` +
      (unrecovered > 0 ? ` (${unrecovered} already spent, recorded as loss)` : "")
  );
}
