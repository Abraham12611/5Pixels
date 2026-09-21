import { createClient } from "@/lib/supabase/server";
import { createDodoClient } from "@/lib/billing/dodo-client";
import { mapLedgerRow, type CreditActivityEntry } from "@/lib/billing/ledger";

export type { CreditActivityEntry, CreditEntryKind } from "@/lib/billing/ledger";

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
      "id, status, trial, started_at, current_period_start, current_period_end, cancel_at_period_end, plan:plan_id(id, slug, name, type, price_cents, credits_grant, interval, markup_multiplier)"
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
    email: user.email ?? null,
    dodoCustomerId: profile?.dodo_customer_id as string | undefined,
    activeSubscription: activeSubscription ?? undefined,
    transactions: transactions ?? [],
    invoices: (invoices ?? []) as unknown as InvoiceWithPlan[],
  };
}

interface LedgerRow {
  id: string;
  entry_type: string;
  amount: number | string;
  created_at: string;
  generation_id: string | null;
  metadata: Record<string, unknown> | null;
  generation:
    | { product: { name: string | null } | null }
    | { product: { name: string | null } | null }[]
    | null;
}

function embeddedGenerationName(
  generation: LedgerRow["generation"]
): string | null {
  const row = Array.isArray(generation) ? generation[0] : generation;
  return row?.product?.name ?? null;
}

export async function getCreditActivity(
  limit = 60
): Promise<CreditActivityEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("credit_ledger")
    .select(
      "id, entry_type, amount, created_at, generation_id, metadata, generation:generation_id(product:product_id(name))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getCreditActivity] failed", error.message);
    return [];
  }

  const ledgerRows = (rows ?? []) as unknown as LedgerRow[];

  // Resolve plan names for purchase entries (metadata.plan_id).
  const planIds = [
    ...new Set(
      ledgerRows
        .map((r) => r.metadata?.plan_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const planNames = new Map<string, string>();
  if (planIds.length > 0) {
    const { data: plans } = await supabase
      .from("plans")
      .select("id, name")
      .in("id", planIds);
    for (const plan of plans ?? []) {
      planNames.set(plan.id as string, plan.name as string);
    }
  }

  return ledgerRows.map((row) => {
    const planId = row.metadata?.plan_id;
    return mapLedgerRow(row, {
      productName: embeddedGenerationName(row.generation),
      planName:
        typeof planId === "string" ? planNames.get(planId) : undefined,
    });
  });
}

export interface CreditPeriodSummary {
  periodStart: string;
  periodEnd: string | null;
  isBillingCycle: boolean;
  creditsUsed: number;
  transformations: number;
  creditsReleased: number;
  creditsAdded: number;
  balance: number;
}

export async function getCreditPeriodSummary(): Promise<CreditPeriodSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("current_period_start, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const periodStart =
    (subscription?.current_period_start as string | null) ??
    (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    })();
  const periodEnd =
    (subscription?.current_period_end as string | null) ?? null;

  const [ledgerResult, generationsResult, balanceResult] = await Promise.all([
    supabase
      .from("credit_ledger")
      .select("amount, entry_type")
      .eq("user_id", user.id)
      .gte("created_at", periodStart),
    supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("created_at", periodStart),
    supabase.rpc("get_available_balance"),
  ]);

  let creditsUsed = 0;
  let creditsReleased = 0;
  let creditsAdded = 0;
  for (const entry of ledgerResult.data ?? []) {
    const amount = Number(entry.amount) || 0;
    if (entry.entry_type === "debit") creditsUsed += Math.abs(amount);
    else if (entry.entry_type === "refund") creditsReleased += amount;
    else if (
      (entry.entry_type === "purchase" || entry.entry_type === "allocation") &&
      amount > 0
    )
      creditsAdded += amount;
  }

  return {
    periodStart,
    periodEnd,
    isBillingCycle: Boolean(subscription),
    creditsUsed: Math.round(creditsUsed * 100) / 100,
    transformations: generationsResult.count ?? 0,
    creditsReleased: Math.round(creditsReleased * 100) / 100,
    creditsAdded: Math.round(creditsAdded * 100) / 100,
    balance: Number(balanceResult.data ?? 0),
  };
}

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: string | null;
  expiryYear: string | null;
}

export async function getSavedPaymentMethods(): Promise<{
  methods: SavedPaymentMethod[];
  portalAvailable: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { methods: [], portalAvailable: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.dodo_customer_id as string | undefined;
  if (!customerId) return { methods: [], portalAvailable: false };

  try {
    const client = createDodoClient();
    const result = await client.customers.retrievePaymentMethods(customerId);
    const methods = (result.items ?? [])
      .filter(
        (item) =>
          item.payment_method === "card" &&
          item.card?.last4_digits != null
      )
      .map((item) => ({
        id: item.payment_method_id,
        brand: item.card?.card_network ?? "Card",
        last4: item.card?.last4_digits ?? "",
        expiryMonth: item.card?.expiry_month ?? null,
        expiryYear: item.card?.expiry_year ?? null,
      }));
    return { methods, portalAvailable: true };
  } catch (err) {
    console.error(
      "[getSavedPaymentMethods] failed",
      err instanceof Error ? err.message : String(err)
    );
    return { methods: [], portalAvailable: true };
  }
}
