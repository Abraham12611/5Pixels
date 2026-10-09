"use server";

import { createClient } from "@/lib/supabase/server";
import { createCreemPortalLink } from "./creem-client";
import { getWhopMembership } from "./whop-client";
import { createBachsPortalSession } from "./bachs-client";
import { getPaymentProvider } from "./payment-provider";

export interface CustomerPortalResult {
  url?: string;
  error?: string;
}

/**
 * Whop's billing portal is hosted on whop.com — each membership carries a
 * `manage_url` where the buyer cancels/updates cards. We persist it on the
 * subscription row at fulfillment time; when it's missing (older rows) we
 * fetch the membership fresh.
 */
async function createWhopPortalSession(
  userId: string
): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("whop_membership_id, whop_manage_url")
    .eq("user_id", userId)
    .not("whop_membership_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.whop_membership_id) {
    return { error: "You do not have an active billing account to manage." };
  }

  if (subscription.whop_manage_url) {
    return { url: subscription.whop_manage_url as string };
  }

  try {
    const membership = (await getWhopMembership(
      subscription.whop_membership_id as string
    )) as { manage_url?: string | null };
    if (membership.manage_url) {
      return { url: membership.manage_url };
    }
  } catch (err) {
    console.error(
      "[createWhopPortalSession] membership fetch failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
  return { error: "Billing management is temporarily unavailable." };
}

async function createCreemPortalSession(
  userId: string
): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("creem_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.creem_customer_id) {
    return { error: "You do not have an active billing account to manage." };
  }

  const session = await createCreemPortalLink(profile.creem_customer_id);

  return { url: session.customer_portal_link };
}

/**
 * Bachs portal — mint a short-lived portal session per request and
 * redirect the customer to its URL (portal.bachs.io). The bachs_customer_id
 * is stored on the profile at fulfillment time (customer_creation: always).
 */
async function createBachsPortalSessionForUser(
  userId: string
): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("bachs_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.bachs_customer_id) {
    return { error: "You do not have an active billing account to manage." };
  }

  try {
    const session = await createBachsPortalSession(
      profile.bachs_customer_id as string
    );
    return { url: session.url };
  } catch (err) {
    console.error(
      "[createBachsPortalSessionForUser] session create failed:",
      err instanceof Error ? err.message : String(err)
    );
    return { error: "Billing management is temporarily unavailable." };
  }
}

// Whop and Bachs manage billing on their own hosted portals — there is no
// return-url parameter to forward.
export async function createCustomerPortalSession(): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  const provider = getPaymentProvider();
  if (provider === "creem") {
    return createCreemPortalSession(user.id);
  }
  if (provider === "whop") {
    return createWhopPortalSession(user.id);
  }
  return createBachsPortalSessionForUser(user.id);
}
