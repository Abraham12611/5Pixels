"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActivePlan {
  planId: string;
  slug: string;
  name: string;
  type: string;
  markupMultiplier: number;
  currentPeriodEnd: string | null;
}

export interface EntitlementResult {
  allowed: boolean;
  reason: string;
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
    .select("id, slug, name, type, markup_multiplier")
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
    markupMultiplier: Number(plan.markup_multiplier),
    currentPeriodEnd: (subscription?.current_period_end as string | null) ?? null,
  };
}

export async function getUserMarkupMultiplier(userId?: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const effectiveUserId = userId ?? user?.id;
  if (!effectiveUserId) return 4.0;

  const { data, error } = await supabase.rpc("get_user_markup_multiplier", {
    p_user_id: effectiveUserId,
  });

  if (error || data === null) {
    console.error("[getUserMarkupMultiplier] failed", error?.message);
    return 4.0;
  }

  return Number(data);
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

  // Existing weekly trial blocks a second one.
  const { count: trialCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", effectiveUserId)
    .eq("trial", true);

  if ((trialCount ?? 0) > 0) {
    return {
      allowed: false,
      reason: "You have already used a weekly trial.",
    };
  }

  return { allowed: true, reason: "" };
}

export async function canPurchaseExtraCredits(
  userId?: string
): Promise<EntitlementResult> {
  const effectiveUserId = userId;
  if (!effectiveUserId) {
    return { allowed: false, reason: "Please sign in to continue." };
  }

  const isSubscriber = await isMonthlySubscriber(effectiveUserId);
  if (!isSubscriber) {
    return {
      allowed: false,
      reason: "Extra credits are only available to active monthly subscribers.",
    };
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
