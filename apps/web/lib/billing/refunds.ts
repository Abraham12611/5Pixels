"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { reverseReferrerShareForRefund } from "@/lib/growsurf/sync";

export interface WhopRefundObject {
  id?: string;
  status?: string;
  /** Whop links refunds/disputes back via the payment id (pay_*). */
  payment?: { id?: string } | string | null;
  total?: number;
  currency?: string;
  reason?: string | null;
}

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

  const { data: invoice } = await service
    .from("invoices")
    .select("id, user_id, credit_ledger_entry_id, plan_id")
    .eq("creem_order_id", orderId)
    .maybeSingle();

  if (!invoice) {
    console.error(`[handleCreemRefund] no invoice for creem order ${orderId}`);
    return;
  }

  let grantedCredits = 0;
  if (invoice.credit_ledger_entry_id) {
    const { data: grant } = await service
      .from("credit_ledger")
      .select("amount")
      .eq("id", invoice.credit_ledger_entry_id)
      .maybeSingle();
    grantedCredits = Math.max(0, Number(grant?.amount ?? 0));
  }

  const { data: ledgerRows } = await service
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", invoice.user_id)
    .neq("entry_type", "reservation");

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

/**
 * Whop counterpart — refund.created / dispute.created carry `payment`
 * (pay_*) which joins invoices.whop_payment_id. Same capped-reversal +
 * referral-clawback semantics as the Creem path.
 */
export async function handleWhopRefund(
  refund: WhopRefundObject,
  isDispute = false
): Promise<void> {
  const paymentId =
    typeof refund.payment === "string"
      ? refund.payment
      : (refund.payment?.id ?? null);
  if (!refund.id || !paymentId) {
    console.error("[handleWhopRefund] refund missing id or payment");
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
    console.log(`[handleWhopRefund] already processed refund ${refund.id}`);
    return;
  }

  const { data: invoice } = await service
    .from("invoices")
    .select("id, user_id, credit_ledger_entry_id, plan_id")
    .eq("whop_payment_id", paymentId)
    .maybeSingle();

  if (!invoice) {
    console.error(`[handleWhopRefund] no invoice for whop payment ${paymentId}`);
    return;
  }

  let grantedCredits = 0;
  if (invoice.credit_ledger_entry_id) {
    const { data: grant } = await service
      .from("credit_ledger")
      .select("amount")
      .eq("id", invoice.credit_ledger_entry_id)
      .maybeSingle();
    grantedCredits = Math.max(0, Number(grant?.amount ?? 0));
  }

  const { data: ledgerRows } = await service
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", invoice.user_id)
    .neq("entry_type", "reservation");

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
      whop_refund_id: refund.id,
      whop_payment_id: paymentId,
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
      orderId: paymentId,
      refundId: refund.id,
    });
  } catch (err) {
    console.error(
      `[handleWhopRefund] referral reversal failed:`,
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log(
    `[handleWhopRefund] reversed ${reversal}/${grantedCredits} credits for payment ${paymentId}` +
      (unrecovered > 0 ? ` (${unrecovered} already spent, recorded as loss)` : "")
  );
}
