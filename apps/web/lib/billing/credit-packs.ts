import type { PlanForPurchase } from "@/lib/db/plans";

export interface CreditPack {
  /** Local plans row — the checkout POST carries only this id. */
  planId: string;
  priceCents: number;
  credits: number;
  checkoutReady: boolean;
}

/**
 * Fixed credit packs — each `extra_credit` plans row maps to one provider
 * product; the checkout POST carries `plan_id` only, never an amount.
 */
export function creditPackOptions(plans: PlanForPurchase[]): CreditPack[] {
  return plans
    .filter((p) => p.type === "extra_credit")
    .sort((a, b) => a.price_cents - b.price_cents)
    .map((p) => ({
      planId: p.id,
      priceCents: p.price_cents,
      credits: Math.floor(Number(p.credits_grant)),
      checkoutReady: p.checkout_ready,
    }));
}
