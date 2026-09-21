"use server";

import { createServiceClient } from "@/lib/supabase/service";

export interface PlanForPurchase {
  id: string;
  slug: string;
  name: string;
  type: string;
  price_cents: number;
  credits_grant: number;
  markup_multiplier: number;
  interval: string;
  is_trial: boolean;
  can_repurchase: boolean;
  dodo_product_id: string | null;
}

export async function getPlansForPurchase(): Promise<PlanForPurchase[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    console.error("[getPlansForPurchase] failed", error?.message);
    return [];
  }

  return data.map((plan) => ({
    ...plan,
    dodo_product_id:
      (plan.metadata as { dodo_product_id?: string })?.dodo_product_id ?? null,
  })) as PlanForPurchase[];
}
