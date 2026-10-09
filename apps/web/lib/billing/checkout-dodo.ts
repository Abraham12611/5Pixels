"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getActivePricingPolicy } from "@/lib/pricing/policy";
import { topUpCreditsForCents } from "@/lib/pricing/types";
import { createDodoClient } from "./dodo-client";
import { getSiteUrl } from "./site-url";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import { attributionMetadata } from "./checkout-shared";
import {
  canPurchaseExtraCredits,
  canPurchaseTrial,
  canPurchaseWeeklyPass,
} from "./entitlements";

export async function createDodoPlanCheckoutSession(
  planId: string,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, dodo_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.email) {
    return { error: "Your profile is missing an email address." };
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) {
    return { error: "Plan not found." };
  }

  // Dripped (annual) plans are unsupported on Dodo: its fulfillment never
  // enters the monthly drip schedule, so an annual sale would grant one
  // month and silently stop. Dodo is a rollback provider — refuse the
  // checkout rather than under-fulfil a year-long purchase.
  if (Number(plan.credit_drip_months ?? 1) > 1) {
    return {
      error:
        "This plan is not available with the current payment option. Please try again later.",
    };
  }

  const dodoProductId = (plan.metadata as { dodo_product_id?: string })
    ?.dodo_product_id;
  if (!dodoProductId) {
    return { error: "This plan is not available for purchase yet." };
  }

  if (plan.type === "weekly_trial") {
    const can = await canPurchaseWeeklyPass(user.id);
    if (!can.allowed) {
      return { error: can.reason };
    }
  } else if (plan.is_trial) {
    const can = await canPurchaseTrial(user.id);
    if (!can.allowed) {
      return { error: can.reason };
    }
  }

  const client = createDodoClient();
  const session = await client.checkoutSessions.create({
    product_cart: [{ product_id: dodoProductId, quantity: 1 }],
    customer: {
      email: profile.email,
      name: profile.display_name ?? profile.email,
      ...(profile.dodo_customer_id
        ? { customer_id: profile.dodo_customer_id }
        : { create_new_customer: true }),
    },
    return_url: `${getSiteUrl()}/checkout/success?return=${encodeURIComponent(
      returnPath
    )}`,
    cancel_url: `${getSiteUrl()}/checkout/cancel?return=${encodeURIComponent(
      returnPath
    )}`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      ...attributionMetadata(attribution),
    },
  });

  return { checkoutUrl: session.checkout_url ?? undefined };
}

export async function createDodoExtraCreditsCheckoutSession(
  cents: number,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  const can = await canPurchaseExtraCredits(user.id);
  if (!can.allowed) {
    return { error: can.reason };
  }

  if (cents < 1000) {
    return { error: "The minimum extra-credit purchase is $10." };
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("type", "extra_credit")
    .single();

  if (!plan) {
    return { error: "Extra credits are not configured." };
  }

  const dodoProductId = (plan.metadata as { dodo_product_id?: string })
    ?.dodo_product_id;
  if (!dodoProductId) {
    return { error: "Extra credits are not available for purchase yet." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, dodo_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.email) {
    return { error: "Your profile is missing an email address." };
  }

  const policy = await getActivePricingPolicy(createServiceClient());
  if (!policy) {
    return {
      error: "Credit pricing is temporarily unavailable. Please try again later.",
    };
  }
  const credits = topUpCreditsForCents(cents, policy);

  const client = createDodoClient();
  const session = await client.checkoutSessions.create({
    product_cart: [
      { product_id: dodoProductId, quantity: 1, amount: cents },
    ],
    customer: {
      email: profile.email,
      name: profile.display_name ?? profile.email,
      ...(profile.dodo_customer_id
        ? { customer_id: profile.dodo_customer_id }
        : { create_new_customer: true }),
    },
    return_url: `${getSiteUrl()}/checkout/success?return=${encodeURIComponent(
      returnPath
    )}`,
    cancel_url: `${getSiteUrl()}/checkout/cancel?return=${encodeURIComponent(
      returnPath
    )}`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      credits: String(credits),
      pricing_policy_version: String(policy.version),
      ...attributionMetadata(attribution),
    },
  });

  return { checkoutUrl: session.checkout_url ?? undefined };
}
