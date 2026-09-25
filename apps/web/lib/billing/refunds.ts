"use server";

import { createServiceClient } from "@/lib/supabase/service";
import type { Refund } from "@polar-sh/sdk/models/components/refund.js";

/**
 * Reverses the credits granted by a refunded/charged-back order.
 *
 * The ledger is append-only: we never delete the grant, we add a negative
 * `debit` entry capped at the user's current available balance so
 * get_available_balance (a plain SUM over non-reservation entries) is never
 * pushed below zero. Any shortfall — credits already spent — is recorded in
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
      reason: refund.dispute ? "chargeback" : "refund",
      polar_refund_id: refund.id,
      polar_order_id: refund.orderId,
      invoice_id: invoice.id,
      granted_credits: grantedCredits,
      reversed_credits: reversal,
      unrecovered_credits: unrecovered,
      // TODO(03 §4): referral clawback hooks in here — if this purchase
      // qualified a referrer bonus, debit the referrer's ledger too.
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

  console.log(
    `[handlePolarRefund] reversed ${reversal}/${grantedCredits} credits for order ${refund.orderId}` +
      (unrecovered > 0 ? ` (${unrecovered} already spent, recorded as loss)` : "")
  );
}
