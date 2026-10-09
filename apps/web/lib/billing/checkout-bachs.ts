"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createBachsCheckoutSession,
  isBachsConfigured,
  resolveBachsProductId,
} from "./bachs-client";
import { getSiteUrl } from "./site-url";
import type { CheckoutAttribution, CheckoutResult } from "./checkout-shared";
import { attributionMetadata } from "./checkout-shared";
import {
  canPurchaseExtraCredits,
  canPurchaseTrial,
  canPurchaseWeeklyPass,
} from "./entitlements";

/**
 * Bachs checkout — a fresh checkout session per purchase so user_id /
 * plan_id / attribution land on the charge (and, for recurring products,
 * are copied onto the subscription). Bachs checkout is hosted on
 * checkout.bachs.io; success_url is where the buyer returns after paying.
 * Fulfillment never trusts the redirect — only signed webhooks.
 */
export async function createBachsPlanCheckoutSession(
  planId: string,
  returnPath = "/app/billing",
  attribution?: CheckoutAttribution
): Promise<CheckoutResult> {
  if (!isBachsConfigured()) {
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
    .select("email, display_name, bachs_customer_id")
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

  const productId = resolveBachsProductId(plan.metadata, plan.slug);
  if (!productId) {
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

  const siteUrl = getSiteUrl();
  const successUrl = `${siteUrl}/checkout/success?return=${encodeURIComponent(
    returnPath
  )}`;

  try {
    const session = await createBachsCheckoutSession({
      productCart: [{ productId, quantity: 1 }],
      customer: profile.bachs_customer_id
        ? { customerId: profile.bachs_customer_id as string }
        : {
            email: profile.email,
            name: (profile.display_name as string | null) ?? undefined,
          },
      // Keep buyers in our customer directory so the portal and renewal
      // events can resolve them by cust_* id.
      customerCreation: "always",
      successUrl,
      cancelUrl: siteUrl + returnPath,
      reference: `5px-${plan.slug}-${user.id}-${Date.now()}`,
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        ...attributionMetadata(attribution),
      },
    });

    return { checkoutUrl: session.checkout_url };
  } catch (err) {
    console.error("Bachs checkout session create failed:", err);
    return { error: "Checkout could not be started — try again." };
  }
}
