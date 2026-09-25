"use server";

import { createClient } from "@/lib/supabase/server";
import { createDodoClient } from "./dodo-client";
import { createPolarClient } from "./polar-client";
import { getPaymentProvider } from "./payment-provider";
import { getSiteUrl } from "./site-url";

export interface CustomerPortalResult {
  url?: string;
  error?: string;
}

async function createPolarPortalSession(
  userId: string,
  returnPath: string
): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("polar_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.polar_customer_id) {
    return { error: "You do not have an active billing account to manage." };
  }

  const client = createPolarClient();
  const session = await client.customerSessions.create({
    customerId: profile.polar_customer_id,
    returnUrl: `${getSiteUrl()}${returnPath}`,
  });

  return { url: session.customerPortalUrl };
}

async function createDodoPortalSession(
  userId: string,
  returnPath: string
): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.dodo_customer_id) {
    return { error: "You do not have an active billing account to manage." };
  }

  const client = createDodoClient();
  const session = await client.customers.customerPortal.create(
    profile.dodo_customer_id,
    {
      return_url: `${getSiteUrl()}${returnPath}`,
    }
  );

  return { url: session.link };
}

export async function createCustomerPortalSession(
  returnPath = "/app/billing"
): Promise<CustomerPortalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  if (getPaymentProvider() === "dodo") {
    return createDodoPortalSession(user.id, returnPath);
  }
  return createPolarPortalSession(user.id, returnPath);
}
