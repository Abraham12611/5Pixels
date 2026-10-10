"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActivePlan {
  planId: string;
  slug: string;
  name: string;
  type: string;
  creditsGrant: number;
  currentPeriodEnd: string | null;
}

export interface EntitlementResult {
  allowed: boolean;
  reason: string;
}

export type UserTier = "visitor" | "free" | "paid_active" | "paid_exhausted";

/**
 * Monotonic: once a user has ever paid (paid invoice) or held any subscription
 * row — including cancelled/expired — this stays true. Used to decide whether
 * monetization UI shows scarcity (never to first-timers) vs. normal surfaces.
 */
export async function hasEverPaid(userId?: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) return false;

  const [invoiceCount, subscriptionCount] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", effectiveUserId)
      .eq("status", "paid"),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", effectiveUserId),
  ]);

  return (
    (invoiceCount.count ?? 0) > 0 || (subscriptionCount.count ?? 0) > 0
  );
}

export async function getUserTier(userId?: string): Promise<UserTier> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) return "visitor";

  const [everPaid, activePlan, balance] = await Promise.all([
    hasEverPaid(effectiveUserId),
    getActivePlan(effectiveUserId),
    getAvailableBalance(effectiveUserId),
  ]);

  if (!everPaid && balance <= 0 && !activePlan) return "free";
  if (activePlan || balance > 0) return "paid_active";
  return "paid_exhausted";
}

export async function getAvailableBalance(userId?: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) return 0;

  const { data, error } = await supabase.rpc("get_available_balance");

  if (error || data === null) {
    console.error("[getAvailableBalance] failed", error?.message);
    return 0;
  }

  return Number(data);
}

export async function getActivePlan(userId?: string): Promise<ActivePlan | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) return null;

  const { data, error } = await supabase.rpc("get_active_plan_id", {
    p_user_id: effectiveUserId,
  });

  if (error || !data) {
    console.error("[getActivePlan] failed", error?.message);
    return null;
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, slug, name, type, credits_grant")
    .eq("id", data as string)
    .single();

  if (planError || !plan) {
    console.error("[getActivePlan] plan lookup failed", planError?.message);
    return null;
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", effectiveUserId)
    .eq("plan_id", plan.id)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    planId: plan.id as string,
    slug: plan.slug as string,
    name: plan.name as string,
    type: plan.type as string,
    creditsGrant: Number(plan.credits_grant ?? 0),
    currentPeriodEnd: (subscription?.current_period_end as string | null) ?? null,
  };
}

export async function isMonthlySubscriber(userId?: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) return false;

  const { count, error } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", effectiveUserId)
    .eq("status", "active")
    .gte("current_period_end", new Date().toISOString());

  if (error) {
    console.error("[isMonthlySubscriber] failed", error.message);
    return false;
  }

  return (count ?? 0) > 0;
}

export async function canPurchaseTrial(
  userId?: string
): Promise<EntitlementResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) {
    return { allowed: false, reason: "Please sign in to continue." };
  }

  // Any active subscription blocks a new weekly trial.
  const { count: activeCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", effectiveUserId)
    .eq("status", "active");

  if ((activeCount ?? 0) > 0) {
    return {
      allowed: false,
      reason: "You already have an active subscription. Trials are only for new users.",
    };
  }

  // Any paid invoice blocks a trial.
  const { count: paidCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", effectiveUserId)
    .eq("status", "paid");

  if ((paidCount ?? 0) > 0) {
    return {
      allowed: false,
      reason: "You have already made a purchase. Trials are one-time only.",
    };
  }

  // Any prior trial subscription — weekly or annual — blocks another trial.
  // One free trial per user across all plan types.
  const { count: trialCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", effectiveUserId)
    .eq("trial", true);

  if ((trialCount ?? 0) > 0) {
    return {
      allowed: false,
      reason: "You have already used a free trial.",
    };
  }

  return { allowed: true, reason: "" };
}

/**
 * Weekly passes are repurchasable for anyone who has never held a real
 * subscription ("Get another week" — 06 §6.2). Blocked while any subscription
 * is active and forever after any monthly/annual history or non-weekly paid
 * invoice — at that point the user is on the plan/top-up ladder instead.
 */
export async function canPurchaseWeeklyPass(
  userId?: string
): Promise<EntitlementResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) {
    return { allowed: false, reason: "Please sign in to continue." };
  }

  const { count: activeCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", effectiveUserId)
    .in("status", ["active", "past_due"])
    .gte("current_period_end", new Date().toISOString());

  if ((activeCount ?? 0) > 0) {
    return {
      allowed: false,
      reason: "You already have an active plan — weekly passes can't stack.",
    };
  }

  // Any non-weekly history (a real plan or a non-weekly paid invoice)
  // graduates the user off weekly passes — top-ups and plans are theirs.
  const [{ data: subs }, { data: paidInvoices }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", effectiveUserId),
    supabase
      .from("invoices")
      .select("plan_id")
      .eq("user_id", effectiveUserId)
      .eq("status", "paid"),
  ]);

  const planIds = [
    ...new Set(
      [...(subs ?? []), ...(paidInvoices ?? [])]
        .map((r) => r.plan_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (planIds.length === 0) return { allowed: true, reason: "" };

  const { data: planRows } = await supabase
    .from("plans")
    .select("id, type")
    .in("id", planIds);

  const graduated = (planRows ?? []).some(
    (p) => p.type !== "weekly_trial" && p.type !== "extra_credit"
  );

  if (graduated) {
    return {
      allowed: false,
      reason: "Weekly passes are only for first-time plans.",
    };
  }

  return { allowed: true, reason: "" };
}

export async function canPurchaseExtraCredits(
  userId?: string
): Promise<EntitlementResult> {
  // Top-ups are open to any signed-in user — the dedicated credits surface
  // sells them to subscribers, lapsed users, and free users alike.
  if (!userId) {
    return { allowed: false, reason: "Please sign in to continue." };
  }
  return { allowed: true, reason: "" };
}

export async function canGenerate(
  estimatedCredits: number,
  userId?: string
): Promise<EntitlementResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) {
    return { allowed: false, reason: "Please sign in to continue." };
  }

  const available = await getAvailableBalance(effectiveUserId);
  if (available < estimatedCredits) {
    return {
      allowed: false,
      reason: "Insufficient credits. Purchase a plan or top up to continue.",
    };
  }

  return { allowed: true, reason: "" };
}
