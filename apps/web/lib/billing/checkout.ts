"use server";

import { getPaymentProvider } from "./payment-provider";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import {
  createCreemExtraCreditsCheckoutSession,
  createCreemPlanCheckoutSession,
} from "./checkout-creem";
import { createWhopPlanCheckoutSession } from "./checkout-whop";
import { createClient } from "@/lib/supabase/server";

export type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";

export async function createPlanCheckoutSession(
  planId: string,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  if (getPaymentProvider() === "creem") {
    return createCreemPlanCheckoutSession(planId, returnPath, attribution);
  }
  return createWhopPlanCheckoutSession(planId, returnPath, attribution);
}

/**
 * Fixed credit packs only — `cents` selects the matching extra_credit plan
 * row (server-side price → pack lookup); the Whop checkout charges the
 * pack's fixed price, never a client-supplied amount. Under the Creem
 * rollback path the variable-price checkout is still available.
 */
export async function createExtraCreditsCheckoutSession(
  cents: number,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  if (getPaymentProvider() === "creem") {
    return createCreemExtraCreditsCheckoutSession(
      cents,
      returnPath,
      attribution
    );
  }

  // Whop: resolve the pack plan whose price matches the requested amount.
  const supabase = await createClient();
  const { data: pack } = await supabase
    .from("plans")
    .select("id")
    .eq("type", "extra_credit")
    .eq("is_active", true)
    .eq("price_cents", cents)
    .maybeSingle();

  if (!pack) {
    return { error: "Please choose one of the credit packs." };
  }
  return createWhopPlanCheckoutSession(pack.id, returnPath, attribution);
}
