"use server";

import { createClient } from "@/lib/supabase/server";
import { createDodoClient } from "./dodo-client";
import {
  canPurchaseExtraCredits,
  canPurchaseTrial,
  getActivePlan,
} from "./entitlements";

export interface CheckoutResult {
  checkoutUrl?: string;
  error?: string;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function createPlanCheckoutSession(
  planId: string,
  returnPath = "/app/billing"
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

  const dodoProductId = (plan.metadata as { dodo_product_id?: string })
    ?.dodo_product_id;
  if (!dodoProductId) {
    return { error: "This plan is not available for purchase yet." };
  }

  if (plan.type === "weekly_trial") {
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
    return_url: `${siteUrl()}/checkout/success?return=${encodeURIComponent(
      returnPath
    )}`,
    cancel_url: `${siteUrl()}/checkout/cancel?return=${encodeURIComponent(
      returnPath
    )}`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
    },
  });

  return { checkoutUrl: session.checkout_url ?? undefined };
}

export async function createExtraCreditsCheckoutSession(
  cents: number,
  returnPath = "/app/billing"
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

  const activePlan = await getActivePlan(user.id);
  const markup = activePlan?.markupMultiplier ?? plan.markup_multiplier;
  const credits = Math.floor(cents * 1.0); // 1 credit = $0.01 = 1 cent, no markup on purchase

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
    return_url: `${siteUrl()}/checkout/success?return=${encodeURIComponent(
      returnPath
    )}`,
    cancel_url: `${siteUrl()}/checkout/cancel?return=${encodeURIComponent(
      returnPath
    )}`,
    metadata: {
      user_id: user.id,
      plan_id: plan.id,
      credits: String(credits),
      markup_multiplier: String(markup),
    },
  });

  return { checkoutUrl: session.checkout_url ?? undefined };
}
