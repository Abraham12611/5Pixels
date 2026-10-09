"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createWhopCheckoutConfiguration,
  isWhopConfigured,
  resolveWhopVariantId,
} from "./whop-client";
import { getSiteUrl } from "./site-url";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import { attributionMetadata } from "./checkout-shared";
import {
  canPurchaseExtraCredits,
  canPurchaseTrial,
  canPurchaseWeeklyPass,
} from "./entitlements";

/**
 * Whop checkout — a fresh checkout_configuration per purchase so user_id /
 * plan_id / attribution land on the payment and echo into every webhook.
 * Whop checkout is hosted on whop.com; redirect_url is the single return
 * destination Whop appends its outcome to.
 */
export async function createWhopPlanCheckoutSession(
  planId: string,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  if (!isWhopConfigured()) {
    return { error: "Billing is temporarily unavailable — try again in a moment." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, display_name")
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

  if (!plan?.is_active) {
    return { error: "That plan is no longer available." };
  }

  const variantId = resolveWhopVariantId(plan.metadata, plan.slug);
  if (!variantId) {
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
  } else if (plan.type === "extra_credit") {
    const can = await canPurchaseExtraCredits(user.id);
    if (!can.allowed) {
      return { error: can.reason };
    }
  }

  try {
    const config = await createWhopCheckoutConfiguration({
      planId: variantId,
      redirectUrl: `${getSiteUrl()}/checkout/success?return=${encodeURIComponent(
        returnPath
      )}`,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        ...attributionMetadata(attribution),
      },
    });

    return { checkoutUrl: config.purchase_url ?? undefined };
  } catch (err) {
    console.error("Whop checkout configuration create failed:", err);
    return { error: "Checkout could not be started — try again." };
  }
}
