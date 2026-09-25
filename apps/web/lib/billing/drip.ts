"use server";

import { createServiceClient } from "@/lib/supabase/service";

interface DrippablePlan {
  id: string;
  credits_grant: number;
  credit_drip_months: number;
}

function dripIdempotencyKey(
  polarSubscriptionId: string,
  dripIndex: number
): string {
  return `subscription:${polarSubscriptionId}:drip:${dripIndex}`;
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
  polarSubscriptionId: string,
  dripIndex: number,
  invoiceId?: string | null
): Promise<string> {
  const service = createServiceClient();
  const idempotencyKey = dripIdempotencyKey(polarSubscriptionId, dripIndex);

  const { data: existing } = await service
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    return existing.id as string;
  }

  const { data: ledger, error } = await service
    .from("credit_ledger")
    .insert({
      user_id: userId,
      entry_type: "purchase",
      amount: plan.credits_grant,
      currency_unit: "credits",
      idempotency_key: idempotencyKey,
      metadata: {
        plan_id: plan.id,
        subscription_id: polarSubscriptionId,
        drip_index: dripIndex,
        ...(invoiceId ? { invoice_id: invoiceId } : {}),
      },
    })
    .select("id")
    .single();

  if (error || !ledger) {
    if (error?.message?.includes("duplicate key")) {
      const { data: dup } = await service
        .from("credit_ledger")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (dup) return dup.id as string;
    }
    throw new Error(
      `Failed to insert drip credit_ledger: ${error?.message ?? "unknown"}`
    );
  }

  return ledger.id as string;
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
  polarSubscriptionId: string;
  periodStart: string;
  invoiceId?: string | null;
}): Promise<void> {
  const {
    subscriptionRowId,
    userId,
    plan,
    polarSubscriptionId,
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
    polarSubscriptionId,
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
      "id, user_id, plan_id, drips_granted, next_drip_at, drip_anchor_at, current_period_start, polar_subscription_id, plans(id, credits_grant, credit_drip_months)"
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
    const polarSubscriptionId = row.polar_subscription_id as string | null;

    if (!plan || !polarSubscriptionId) {
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
      await grantDripCredits(
        row.user_id as string,
        {
          id: plan.id as string,
          credits_grant: Number(plan.credits_grant),
          credit_drip_months: dripMonths,
        },
        polarSubscriptionId,
        dripIndex
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
