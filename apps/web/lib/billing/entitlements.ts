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

  return {
    planId: plan.id as string,
    slug: plan.slug as string,
    name: plan.name as string,
    type: plan.type as string,
    markupMultiplier: Number(plan.markup_multiplier),
    currentPeriodEnd: null,
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
