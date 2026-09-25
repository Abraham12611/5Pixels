"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentProvider } from "@/lib/billing/payment-provider";
import { resolvePolarProductId } from "@/lib/billing/polar-client";

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
  /** Product id exists for the active payment provider — safe to offer. */
  checkout_ready: boolean;
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

  const provider = getPaymentProvider();
  return data.map((plan) => ({
    ...plan,
    checkout_ready:
      provider === "polar"
        ? Boolean(resolvePolarProductId(plan.metadata))
        : Boolean(
            (plan.metadata as { dodo_product_id?: string })?.dodo_product_id
          ),
  })) as PlanForPurchase[];
}
