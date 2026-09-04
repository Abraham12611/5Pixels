import { createClient } from "@/lib/supabase/server";

export interface InvoiceWithPlan {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  plan_name: string | null;
  plan_slug: string | null;
}

export async function getBillingData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", user.id)
    .single();

  const { data: activeSubscription } = await supabase
    .from("subscriptions")
    .select(
      "id, status, trial, started_at, current_period_start, current_period_end, cancel_at_period_end, plan:plan_id(id, slug, name, type, price_cents, credits_grant)"
    )
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("credit_ledger")
    .select("id, entry_type, amount, created_at, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, amount_cents, currency, status, created_at, plan:plan_id(name, slug)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    userId: user.id,
    dodoCustomerId: profile?.dodo_customer_id as string | undefined,
    activeSubscription: activeSubscription ?? undefined,
    transactions: transactions ?? [],
    invoices: (invoices ?? []) as unknown as InvoiceWithPlan[],
  };
}
