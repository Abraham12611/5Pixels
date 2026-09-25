"use server";

import { createClient } from "@/lib/supabase/server";
import { createPolarClient, resolvePolarProductId } from "./polar-client";
import { getSiteUrl } from "./site-url";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import { attributionMetadata } from "./checkout-shared";
import {
  canPurchaseExtraCredits,
  canPurchaseTrial,
  getActivePlan,
} from "./entitlements";

export async function createPolarPlanCheckoutSession(
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
    .select("email, display_name, polar_customer_id")
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

  const polarProductId = resolvePolarProductId(plan.metadata);
  if (!polarProductId) {
    return { error: "This plan is not available for purchase yet." };
  }

  if (plan.type === "weekly_trial" || plan.is_trial) {
    const can = await canPurchaseTrial(user.id);
    if (!can.allowed) {
      return { error: can.reason };
    }
  }

  const client = createPolarClient();
  const checkout = await client.checkouts.create({
    products: [polarProductId],
    ...(profile.polar_customer_id
      ? { customerId: profile.polar_customer_id }
      : {
          externalCustomerId: user.id,
          customerEmail: profile.email,
          customerName: profile.display_name ?? profile.email,
        }),
    successUrl: `${getSiteUrl()}/checkout/success?return=${encodeURIComponent(
      returnPath
    )}`,
    returnUrl: `${getSiteUrl()}/checkout/cancel?return=${encodeURIComponent(
      returnPath
    )}`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      ...attributionMetadata(attribution),
    },
  });

  return { checkoutUrl: checkout.url ?? undefined };
}

export async function createPolarExtraCreditsCheckoutSession(
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

  const polarProductId = resolvePolarProductId(plan.metadata);
  if (!polarProductId) {
    return { error: "Extra credits are not available for purchase yet." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name, polar_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.email) {
    return { error: "Your profile is missing an email address." };
  }

  const activePlan = await getActivePlan(user.id);
  const markup = activePlan?.markupMultiplier ?? plan.markup_multiplier;
  const credits = Math.floor(cents * 1.0); // 1 credit = $0.01 = 1 cent, no markup on purchase

  const client = createPolarClient();
  const checkout = await client.checkouts.create({
    products: [polarProductId],
    // Polar models variable top-ups as a custom-amount price
    // (amount_type: "custom", minimum_amount: 1000); the amount is set
    // server-side here, never by the client.
    amount: cents,
    ...(profile.polar_customer_id
      ? { customerId: profile.polar_customer_id }
      : {
          externalCustomerId: user.id,
          customerEmail: profile.email,
          customerName: profile.display_name ?? profile.email,
        }),
    successUrl: `${getSiteUrl()}/checkout/success?return=${encodeURIComponent(
      returnPath
    )}`,
    returnUrl: `${getSiteUrl()}/checkout/cancel?return=${encodeURIComponent(
      returnPath
    )}`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      credits: String(credits),
      markup_multiplier: String(markup),
      ...attributionMetadata(attribution),
    },
  });

  return { checkoutUrl: checkout.url ?? undefined };
}
