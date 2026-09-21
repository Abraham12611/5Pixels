"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminOrOwner } from "./admin";
import { logAdminAction } from "./audit";

export interface UserSearchResult {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  isAdmin: boolean;
  isOwner: boolean;
  createdAt: string;
}

export interface SupportUserSummary {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  isAdmin: boolean;
  isOwner: boolean;
  createdAt: string;
  balance: number;
  activeSubscription: {
    id: string;
    status: string;
    planName: string;
    planSlug: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  recentGenerations: Array<{
    id: string;
    status: string;
    productName: string;
    productSlug: string;
    creditCost: number;
    createdAt: string;
  }>;
  recentLedger: Array<{
    id: string;
    entryType: string;
    amount: number;
    createdAt: string;
    idempotencyKey: string;
  }>;
  recentInvoices: Array<{
    id: string;
    amountCents: number;
    status: string;
    planName: string | null;
    createdAt: string;
  }>;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  await requireAdminOrOwner();

  const supabase = createServiceClient();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      query
    );

  let builder = supabase
    .from("profiles")
    .select("id, email, display_name, status, is_admin, is_owner, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (isUuid) {
    builder = builder.eq("id", query);
  } else {
    builder = builder.ilike("email", `%${query}%`);
  }

  const { data, error } = await builder;

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    displayName: (row.display_name as string | null) ?? null,
    status: row.status as string,
    isAdmin: (row.is_admin as boolean) ?? false,
    isOwner: (row.is_owner as boolean) ?? false,
    createdAt: row.created_at as string,
  }));
}

export async function getUserSupportSummary(
  userId: string
): Promise<SupportUserSummary | null> {
  await requireAdminOrOwner();

  const supabase = createServiceClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, status, is_admin, is_owner, created_at"
    )
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", userId);

  const balance = (ledger ?? []).reduce((sum, row) => sum + Number(row.amount), 0);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      plans(id, name, slug)
    `
    )
    .eq("user_id", userId)
    .in("status", ["active", "past_due", "trialing"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recentGenerations } = await supabase
    .from("generations")
    .select(
      `
      id,
      status,
      credit_cost,
      created_at,
      products(id, name, slug)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: recentLedger } = await supabase
    .from("credit_ledger")
    .select("id, entry_type, amount, created_at, idempotency_key")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: recentInvoices } = await supabase
    .from("invoices")
    .select(
      `
      id,
      amount_cents,
      status,
      created_at,
      plans(id, name, slug)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const plan = subscription?.plans as unknown as
    | Array<{ id: string; name: string; slug: string }>
    | null;
  const planData = plan?.[0];

  return {
    id: profile.id as string,
    email: profile.email as string,
    displayName: (profile.display_name as string | null) ?? null,
    status: profile.status as string,
    isAdmin: (profile.is_admin as boolean) ?? false,
    isOwner: (profile.is_owner as boolean) ?? false,
    createdAt: profile.created_at as string,
    balance,
    activeSubscription: subscription
      ? {
          id: subscription.id as string,
          status: subscription.status as string,
          planName: planData?.name ?? "Unknown",
          planSlug: planData?.slug ?? "",
          currentPeriodStart: subscription.current_period_start as string,
          currentPeriodEnd: subscription.current_period_end as string,
          cancelAtPeriodEnd: (subscription.cancel_at_period_end as boolean) ?? false,
        }
      : null,
    recentGenerations: (recentGenerations ?? []).map((row) => {
      const product = (row.products as unknown as
        | Array<{ id: string; name: string; slug: string }>
        | null)?.[0];
      return {
        id: row.id as string,
        status: row.status as string,
        productName: product?.name ?? "Unknown",
        productSlug: product?.slug ?? "",
        creditCost: Number(row.credit_cost ?? 0),
        createdAt: row.created_at as string,
      };
    }),
    recentLedger: (recentLedger ?? []).map((row) => ({
      id: row.id as string,
      entryType: row.entry_type as string,
      amount: Number(row.amount),
      createdAt: row.created_at as string,
      idempotencyKey: row.idempotency_key as string,
    })),
    recentInvoices: (recentInvoices ?? []).map((row) => {
      const plan = (row.plans as unknown as
        | Array<{ id: string; name: string; slug: string }>
        | null)?.[0];
      return {
        id: row.id as string,
        amountCents: row.amount_cents as number,
        status: row.status as string,
        planName: plan?.name ?? null,
        createdAt: row.created_at as string,
      };
    }),
  };
}

export interface CreditAdjustmentResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

export async function adjustUserCredits(
  userId: string,
  amount: number,
  reason: string,
  idempotencyKey: string
): Promise<CreditAdjustmentResult> {
  await requireAdminOrOwner();

  if (!Number.isFinite(amount) || amount === 0) {
    return { success: false, error: "Amount must be a non-zero number." };
  }

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 4) {
    return { success: false, error: "Reason must be at least 4 characters." };
  }

  const supabase = createServiceClient();

  // Fetch current balance so we can prevent over-deduction.
  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", userId);

  const currentBalance = (ledger ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  if (amount < 0 && currentBalance + amount < 0) {
    return {
      success: false,
      error: `Deduction would overdraw the user's balance. Current balance: ${currentBalance.toFixed(2)} credits.`,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { success: false, error: "User not found." };
  }

  const { error: insertError } = await supabase.from("credit_ledger").insert({
    user_id: userId,
    entry_type: "adjustment",
    amount,
    idempotency_key: idempotencyKey,
    metadata: {
      reason: trimmedReason,
      admin_adjustment: true,
      user_email: profile.email,
    },
  });

  if (insertError) {
    if (insertError.message?.includes("idx_credit_ledger_user_idempotency")) {
      return { success: false, error: "This adjustment was already processed." };
    }
    return { success: false, error: insertError.message };
  }

  await logAdminAction({
    action: "user.credits_adjust",
    entityType: "profile",
    entityId: userId,
    after: { amount, reason: trimmedReason, idempotency_key: idempotencyKey },
    reason: trimmedReason,
  });

  revalidatePath(`/admin/support/${userId}`);

  return { success: true, newBalance: currentBalance + amount };
}
