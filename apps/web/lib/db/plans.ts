"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getPaymentProvider } from "@/lib/billing/payment-provider";
import { resolveWhopVariantId } from "@/lib/billing/whop-client";
import { resolveCreemProductId } from "@/lib/billing/creem-client";

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
  metadata?: Record<string, unknown> | null;
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
      provider === "creem"
        ? Boolean(resolveCreemProductId(plan.metadata))
        : Boolean(resolveWhopVariantId(plan.metadata, plan.slug)),
  })) as PlanForPurchase[];
}
