"use server";

import { getPaymentProvider } from "./payment-provider";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import {
  createCreemExtraCreditsCheckoutSession,
  createCreemPlanCheckoutSession,
} from "./checkout-creem";
import { createWhopPlanCheckoutSession } from "./checkout-whop";
import { createBachsPlanCheckoutSession } from "./checkout-bachs";
import { createClient } from "@/lib/supabase/server";

export type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";

export async function createPlanCheckoutSession(
  planId: string,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  const provider = getPaymentProvider();
  if (provider === "creem") {
    return createCreemPlanCheckoutSession(planId, returnPath, attribution);
  }
  if (provider === "whop") {
    return createWhopPlanCheckoutSession(planId, returnPath, attribution);
  }
  return createBachsPlanCheckoutSession(planId, returnPath, attribution);
}

/**
 * Fixed credit packs only — `cents` selects the matching extra_credit plan
 * row (server-side price → pack lookup); the Bachs/Whop checkout charges
 * the pack's fixed price, never a client-supplied amount. Under the Creem
 * rollback path the variable-price checkout is still available.
 */
export async function createExtraCreditsCheckoutSession(
  cents: number,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  const provider = getPaymentProvider();
  if (provider === "creem") {
    return createCreemExtraCreditsCheckoutSession(
      cents,
      returnPath,
      attribution
    );
  }

  // Bachs/Whop: resolve the pack plan whose price matches the amount.
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
  if (provider === "whop") {
    return createWhopPlanCheckoutSession(pack.id, returnPath, attribution);
  }
  return createBachsPlanCheckoutSession(pack.id, returnPath, attribution);
}
