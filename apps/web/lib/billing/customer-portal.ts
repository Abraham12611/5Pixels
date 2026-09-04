"use server";

import { createClient } from "@/lib/supabase/server";
import { createDodoClient } from "./dodo-client";

export interface CustomerPortalResult {
  url?: string;
  error?: string;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.dodo_customer_id) {
    return { error: "You do not have an active billing account to manage." };
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const client = createDodoClient();
  const session = await client.customers.customerPortal.create(
    profile.dodo_customer_id,
    {
      return_url: `${siteUrl}${returnPath}`,
    }
  );

  return { url: session.link };
}
