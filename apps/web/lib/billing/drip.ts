"use server";

import { createServiceClient } from "@/lib/supabase/service";

interface DrippablePlan {
  id: string;
  credits_grant: number;
  credit_drip_months: number;
}

/**
 * Drip keys are scoped by the term anchor (the immutable start of the
 * annual term) so a year-two renewal can never collide with year-one
 * keys. The unscoped legacy format is still consulted on every grant, but
 * only counts as idempotent when the legacy row was created inside the
 * current term — a prior-term legacy row must not suppress a new term's
 * drip.
 */
function dripIdempotencyKeys(
  providerSubscriptionId: string,
  termAnchor: string,
  dripIndex: number
): { scoped: string; legacy: string } {
  return {
    scoped: `subscription:${providerSubscriptionId}:${termAnchor}:drip:${dripIndex}`,
    legacy: `subscription:${providerSubscriptionId}:drip:${dripIndex}`,
  };
}

/** Anchor + n months, clamped to the last valid day (Jan 31 +1mo => Feb 28/29). */
function addMonthsClamped(anchorIso: string, months: number): string {
  const a = new Date(anchorIso);
  const day = a.getUTCDate();
  const target = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + months, 1,
    a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds(), a.getUTCMilliseconds()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString();
}

async function grantDripCredits(
  userId: string,
  plan: DrippablePlan,
  providerSubscriptionId: string,
  termAnchor: string,
  dripIndex: number,
  invoiceId?: string | null
): Promise<string> {
  const service = createServiceClient();
  const keys = dripIdempotencyKeys(providerSubscriptionId, termAnchor, dripIndex);

  // The unscoped legacy key is only idempotent within the term it was
  // granted in — a year-1 `subscription:X:drip:1` row must NOT suppress
  // the year-2 scoped grant. Fetch both keys and check the legacy row's
  // created_at against this term's anchor.
  const { data: candidates } = await service
    .from("credit_ledger")
    .select("id, idempotency_key, created_at")
    .in("idempotency_key", [keys.scoped, keys.legacy]);
  const rows = candidates ?? [];
  const scopedRow = rows.find((r) => r.idempotency_key === keys.scoped);
  const legacyRow = rows.find((r) => r.idempotency_key === keys.legacy);
  if (scopedRow) {
    return scopedRow.id as string;
  }
  if (
    legacyRow &&
    new Date(legacyRow.created_at as string) >= new Date(termAnchor)
  ) {
    return legacyRow.id as string;
  }

  const { data: ledger, error } = await service
    .from("credit_ledger")
    .insert({
      user_id: userId,
      entry_type: "purchase",
      amount: plan.credits_grant,
      currency_unit: "credits",
      idempotency_key: keys.scoped,
      metadata: {
        plan_id: plan.id,
        subscription_id: providerSubscriptionId,
        drip_index: dripIndex,
        term_anchor: termAnchor,
        ...(invoiceId ? { invoice_id: invoiceId } : {}),
      },
    })
    .select("id")
    .single();

  if (error || !ledger) {
    if (error?.message?.includes("duplicate key")) {
      // The insert raced a concurrent grant of THIS term's scoped key.
      const { data: dup } = await service
        .from("credit_ledger")
        .select("id")
        .eq("idempotency_key", keys.scoped)
        .limit(1);
      if (dup && dup.length > 0) return dup[0].id as string;
    }
    throw new Error(
      `Failed to insert drip credit_ledger: ${error?.message ?? "unknown"}`
    );
  }

  return ledger.id as string;
}

/**
 * Latest paid invoice for a subscription's current term — i.e. the
 * invoice that opened the term. Looked up by the internal subscription
 * FK first; falls back to a per-user scan of the provider columns for
 * invoices written before the FK was stamped. Drip grants stamp it in
 * metadata so a refund can find and reverse every instalment of the
 * term, not just drip 1.
 */
async function findTermInvoiceId(
  subscriptionRowId: string,
  userId: string,
  providerSubscriptionId: string
): Promise<string | null> {
  const service = createServiceClient();

  // Primary: the internal subscription FK — provider-independent and can't
  // drift outside a global top-N window as volume grows.
  const { data: linked } = await service
    .from("invoices")
    .select("id")
    .eq("subscription_id", subscriptionRowId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1);
  if (linked && linked.length > 0) {
    return linked[0].id as string;
  }

  // Fallback for invoices written before the FK was stamped: match the
  // provider subscription column, bounded to this user's own invoices.
  const { data: mine } = await service
    .from("invoices")
    .select(
      "id, polar_subscription_id, creem_subscription_id, dodo_subscription_id"
    )
    .eq("user_id", userId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(50);
  const match = (mine ?? []).find(
    (i) =>
      i.polar_subscription_id === providerSubscriptionId ||
      i.creem_subscription_id === providerSubscriptionId ||
      i.dodo_subscription_id === providerSubscriptionId
  );
  return (match?.id as string | undefined) ?? null;
}

/**
 * Grants drip 1 for a newly created dripped (annual) subscription and points
 * next_drip_at one month out. Idempotent: guarded by drips_granted and the
 * per-drip idempotency key.
 */
export async function initializeSubscriptionDrip(args: {
  subscriptionRowId: string;
  userId: string;
  plan: DrippablePlan;
  providerSubscriptionId: string;
  periodStart: string;
  invoiceId?: string | null;
}): Promise<void> {
  const {
    subscriptionRowId,
    userId,
    plan,
    providerSubscriptionId,
    periodStart,
    invoiceId,
  } = args;
  const service = createServiceClient();

  const { data: sub } = await service
    .from("subscriptions")
    .select("drips_granted")
    .eq("id", subscriptionRowId)
    .maybeSingle();

  if (sub && Number(sub.drips_granted) > 0) {
    return;
  }

  await grantDripCredits(
    userId,
    plan,
    providerSubscriptionId,
    periodStart,
    1,
    invoiceId
  );

  const nextDripAt =
    plan.credit_drip_months > 1 ? addMonthsClamped(periodStart, 1) : null;

  await service
    .from("subscriptions")
    .update({
      drips_granted: 1,
      drip_anchor_at: periodStart,
      next_drip_at: nextDripAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionRowId);
}

export interface DripRunResult {
  scanned: number;
  granted: number;
  errors: string[];
}

/**
 * Daily-cron entry point: grants one monthly credit instalment to every
 * active dripped subscription whose next_drip_at has passed. Idempotent on
 * (subscription, drip_index) via the credit_ledger idempotency key, so a
 * re-run never double-grants.
 *
 * Deliberately one drip per subscription per run: after a multi-day cron
 * outage the backlog self-heals one day at a time. Do NOT "optimise" this
 * into a catch-up loop — bulk-granting missed months dumps several months of
 * credit liability at once, which is exactly what the drip exists to prevent.
 */
export async function runCreditDrip(now: Date = new Date()): Promise<DripRunResult> {
  const service = createServiceClient();
  const result: DripRunResult = { scanned: 0, granted: 0, errors: [] };

  const { data: due, error } = await service
    .from("subscriptions")
    .select(
      "id, user_id, plan_id, drips_granted, next_drip_at, drip_anchor_at, current_period_start, polar_subscription_id, creem_subscription_id, dodo_subscription_id, plans(id, credits_grant, credit_drip_months)"
    )
    .eq("status", "active")
    .not("next_drip_at", "is", null)
    .lte("next_drip_at", now.toISOString());

  if (error) {
    throw new Error(`Failed to load due drips: ${error.message}`);
  }

  for (const row of due ?? []) {
    result.scanned += 1;
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    const dripsGranted = Number(row.drips_granted ?? 0);
    const dripMonths = Number(plan?.credit_drip_months ?? 1);
    const providerSubscriptionId =
      (row.polar_subscription_id as string | null) ??
      (row.creem_subscription_id as string | null) ??
      (row.dodo_subscription_id as string | null);

    if (!plan || !providerSubscriptionId) {
      continue;
    }

    if (dripsGranted >= dripMonths) {
      // Term fully dripped; clear the schedule.
      await service
        .from("subscriptions")
        .update({ next_drip_at: null, updated_at: now.toISOString() })
        .eq("id", row.id as string);
      continue;
    }

    const dripIndex = dripsGranted + 1;
    // The anchor is the immutable term start, so drip N's date is a pure
    // function of (anchor, N) — clamping can shift a date within a month but
    // never accumulates drift across drips.
    const anchor =
      (row.drip_anchor_at as string | null) ??
      (row.current_period_start as string | null) ??
      (row.next_drip_at as string);
    try {
      const termInvoiceId = await findTermInvoiceId(
        row.id as string,
        row.user_id as string,
        providerSubscriptionId
      );
      await grantDripCredits(
        row.user_id as string,
        {
          id: plan.id as string,
          credits_grant: Number(plan.credits_grant),
          credit_drip_months: dripMonths,
        },
        providerSubscriptionId,
        anchor,
        dripIndex,
        termInvoiceId
      );

      const isLast = dripIndex >= dripMonths;
      await service
        .from("subscriptions")
        .update({
          drips_granted: dripIndex,
          next_drip_at: isLast
            ? null
            : addMonthsClamped(anchor, dripIndex),
          updated_at: now.toISOString(),
        })
        .eq("id", row.id as string);

      result.granted += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[runCreditDrip] subscription ${row.id}: ${message}`);
      result.errors.push(`${row.id}: ${message}`);
    }
  }

  return result;
}
