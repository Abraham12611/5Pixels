"use server";

import { getPaymentProvider } from "./payment-provider";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import {
  createCreemExtraCreditsCheckoutSession,
  createCreemPlanCheckoutSession,
} from "./checkout-creem";
import {
  createDodoExtraCreditsCheckoutSession,
  createDodoPlanCheckoutSession,
} from "./checkout-dodo";
import {
  createPolarExtraCreditsCheckoutSession,
  createPolarPlanCheckoutSession,
} from "./checkout-polar";

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
  if (provider === "dodo") {
    return createDodoPlanCheckoutSession(planId, returnPath, attribution);
  }
  return createPolarPlanCheckoutSession(planId, returnPath, attribution);
}

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
  if (provider === "dodo") {
    return createDodoExtraCreditsCheckoutSession(cents, returnPath, attribution);
  }
  return createPolarExtraCreditsCheckoutSession(cents, returnPath, attribution);
}
