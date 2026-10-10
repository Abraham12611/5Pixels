"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getActivePricingPolicy } from "@/lib/pricing/policy";
import { topUpCreditsForCents } from "@/lib/pricing/types";
import { createCreemCheckout, resolveCreemProductId } from "./creem-client";
import { getSiteUrl } from "./site-url";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import { attributionMetadata } from "./checkout-shared";
import {
  canPurchaseExtraCredits,
  canPurchaseTrial,
  canPurchaseWeeklyPass,
} from "./entitlements";

export async function createCreemPlanCheckoutSession(
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
    .select("email, display_name, creem_customer_id")
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

  const creemProductId = resolveCreemProductId(plan.metadata, plan.slug);
  if (!creemProductId) {
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

  const checkout = await createCreemCheckout({
    productId: creemProductId,
    requestId: `plan:${plan.id}:${user.id}:${Date.now()}`,
    ...(profile.creem_customer_id
      ? { customer: { id: profile.creem_customer_id as string } }
      : {
          customer: {
            email: profile.email,
            name: profile.display_name ?? profile.email,
          },
        }),
    successUrl: `${getSiteUrl()}/checkout/success?return=${encodeURIComponent(
      returnPath
    )}`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      ...attributionMetadata(attribution),
    },
  });

  return { checkoutUrl: checkout.checkout_url ?? undefined };
}

export async function createCreemExtraCreditsCheckoutSession(
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

  // The legacy variable-price row (not the fixed credit packs).
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("type", "extra_credit")
    .eq("slug", "extra-credits")
    .single();

  if (!plan) {
    return { error: "Extra credits are not configured." };
  }

  const creemProductId = resolveCreemProductId(plan.metadata, plan.slug);
  if (!creemProductId) {
    return { error: "Extra credits are not available for purchase yet." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, creem_customer_id")
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

  const checkout = await createCreemCheckout({
    productId: creemProductId,
    requestId: `topup:${user.id}:${Date.now()}`,
    // Creem models variable top-ups as custom_price on a one-time product;
    // the amount is set server-side here, never by the client.
    customPrice: cents,
    units: 1,
    ...(profile.creem_customer_id
      ? { customer: { id: profile.creem_customer_id as string } }
      : {
          customer: {
            email: profile.email,
            name: profile.display_name ?? profile.email,
          },
        }),
    successUrl: `${getSiteUrl()}/checkout/success?return=${encodeURIComponent(
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

  return { checkoutUrl: checkout.checkout_url ?? undefined };
}
