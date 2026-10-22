"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { grantSubsidyCredits } from "./subsidies";
import { RETENTION_CREDITS } from "./retention-shared";

/**
 * Grants the cancel-retention credit bonus. One-shot per subscription —
 * `retention:<subscription_id>` is the credit_ledger idempotency key, so a
 * second accept (double-click, reopen, replay) can never double-grant.
 * Only counts for an active, not-yet-cancelling recurring plan: the offer is
 * "stay", so a subscription already headed for expiry earns nothing.
 */
export async function claimRetentionCredits(): Promise<
  { ok: true; credits: number; already: boolean } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const service = createServiceClient();

  const { data: sub } = await service
    .from("subscriptions")
    .select("id, plan_id, cancel_at_period_end")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return { ok: false, error: "No active plan to keep." };
  if (sub.cancel_at_period_end) {
    return { ok: false, error: "Your plan is already set to end." };
  }

  const { data: plan } = await service
    .from("plans")
    .select("type")
    .eq("id", sub.plan_id as string)
    .maybeSingle();
  if (!plan || (plan.type !== "monthly" && plan.type !== "annual")) {
    return { ok: false, error: "This offer applies to recurring plans only." };
  }

  // Issue #110: retention credits are a real subsidy — the RPC spends
  // from the monthly `retention` budget, dedupes on the idempotency key,
  // and fails closed when the program cap is exhausted.
  const result = await grantSubsidyCredits(service, {
    userId: user.id,
    program: "retention",
    credits: RETENTION_CREDITS,
    idempotencyKey: `retention:${sub.id}`,
    metadata: {
      reason: "cancel_retention",
      subscription_id: sub.id,
    },
  });

  if (result.outcome === "duplicate") {
    return { ok: true, credits: RETENTION_CREDITS, already: true };
  }
  if (result.outcome === "budget_exhausted") {
    return {
      ok: false,
      error: "This offer isn't available right now — try again later.",
    };
  }

  return { ok: true, credits: RETENTION_CREDITS, already: false };
}
