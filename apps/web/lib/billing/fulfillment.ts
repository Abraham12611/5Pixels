"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createDodoClient } from "./dodo-client";
import type { Payment, Subscription } from "dodopayments/resources/index";

interface PlanRow {
  id: string;
  slug: string;
  type: string;
  credits_grant: number;
}

interface UserMapping {
  userId: string;
  customerId: string;
}

async function resolveUserAndPlan(
  dodoCustomerId: string,
  customerEmail: string,
  paymentMetadata: Record<string, unknown>
): Promise<UserMapping | null> {
  const service = createServiceClient();

  // Prefer the user_id we wrote into checkout session metadata.
  if (paymentMetadata && typeof paymentMetadata.user_id === "string") {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", paymentMetadata.user_id)
      .single();
    if (profile) {
      return { userId: profile.id, customerId: dodoCustomerId };
    }
  }

  // Fall back to email lookup.
  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .eq("email", customerEmail)
    .single();

  return profile ? { userId: profile.id, customerId: dodoCustomerId } : null;
}

async function getPlanByDodoProductId(
  dodoProductId: string
): Promise<PlanRow | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("plans")
    .select("id, slug, type, credits_grant")
    .filter("metadata->>dodo_product_id", "eq", dodoProductId)
    .single();

  if (!data) return null;

  return {
    id: data.id as string,
    slug: data.slug as string,
    type: data.type as string,
    credits_grant: Number(data.credits_grant),
  };
}

async function recordCustomer(userId: string, customerId: string) {
  const service = createServiceClient();
  await service
    .from("profiles")
    .update({ dodo_customer_id: customerId })
    .eq("id", userId);
}

async function findInvoiceByDodoPaymentId(
  dodoPaymentId: string
): Promise<{ id: string } | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id")
    .eq("dodo_payment_id", dodoPaymentId)
    .maybeSingle();
  return data ? { id: data.id as string } : null;
}

async function findSubscriptionByDodoId(
  dodoSubscriptionId: string
): Promise<{ id: string } | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("subscriptions")
    .select("id")
    .eq("dodo_subscription_id", dodoSubscriptionId)
    .maybeSingle();
  return data ? { id: data.id as string } : null;
}

async function addPurchaseCredits(
  userId: string,
  plan: PlanRow,
  amountCents: number,
  invoiceId: string,
  dodoPaymentId: string
) {
  const service = createServiceClient();

  let credits: number;
  if (plan.type === "extra_credit") {
    // 1 credit = $0.01; extra credits spend exactly what they pay.
    credits = amountCents;
  } else {
    credits = plan.credits_grant;
  }

  const { data: ledger, error: ledgerError } = await service
    .from("credit_ledger")
    .insert({
      user_id: userId,
      entry_type: "purchase",
      amount: credits,
      currency_unit: "credits",
      idempotency_key: `purchase:${dodoPaymentId}`,
      metadata: { invoice_id: invoiceId, plan_id: plan.id },
    })
    .select("id")
    .single();

  if (ledgerError || !ledger) {
    throw new Error(
      `Failed to insert credit_ledger: ${ledgerError?.message ?? "unknown"}`
    );
  }

  return ledger.id as string;
}

export async function fulfillOneTimePayment(payment: Payment) {
  const service = createServiceClient();

  const productCart = payment.product_cart;
  if (!productCart || productCart.length === 0) {
    console.error("[fulfillOneTimePayment] no product cart");
    return;
  }

  const dodoProductId = productCart[0].product_id;
  const plan = await getPlanByDodoProductId(dodoProductId);
  if (!plan) {
    console.error(
      `[fulfillOneTimePayment] no plan for dodo product ${dodoProductId}`
    );
    return;
  }

  const mapping = await resolveUserAndPlan(
    payment.customer.customer_id,
    payment.customer.email,
    payment.metadata
  );
  if (!mapping) {
    console.error("[fulfillOneTimePayment] could not resolve user");
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  // Idempotency: already processed.
  if (await findInvoiceByDodoPaymentId(payment.payment_id)) {
    return;
  }

  const amountCents = payment.total_amount;

  const { data: invoice, error: invoiceError } = await service
    .from("invoices")
    .insert({
      user_id: mapping.userId,
      plan_id: plan.id,
      amount_cents: amountCents,
      currency: payment.currency,
      status: "paid",
      dodo_payment_id: payment.payment_id,
      dodo_checkout_session_id: payment.checkout_session_id ?? null,
      metadata: payment.metadata,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    throw new Error(
      `Failed to insert invoice: ${invoiceError?.message ?? "unknown"}`
    );
  }

  const ledgerEntryId = await addPurchaseCredits(
    mapping.userId,
    plan,
    amountCents,
    invoice.id,
    payment.payment_id
  );

  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoice.id);
}

export async function fulfillSubscriptionPayment(payment: Payment) {
  const service = createServiceClient();

  if (!payment.subscription_id) {
    console.error("[fulfillSubscriptionPayment] missing subscription_id");
    return;
  }

  const mapping = await resolveUserAndPlan(
    payment.customer.customer_id,
    payment.customer.email,
    payment.metadata
  );
  if (!mapping) {
    console.error("[fulfillSubscriptionPayment] could not resolve user");
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  // Ensure subscription exists with period dates.
  let subscriptionId = (await findSubscriptionByDodoId(payment.subscription_id))?.id;

  try {
    const dodo = createDodoClient();
    const sub = await dodo.subscriptions.retrieve(payment.subscription_id);
    subscriptionId = await upsertSubscription(
      mapping.userId,
      sub,
      payment.customer.customer_id
    );
  } catch (err) {
    console.error(
      "[fulfillSubscriptionPayment] failed to fetch subscription",
      err instanceof Error ? err.message : String(err)
    );
    return;
  }

  if (await findInvoiceByDodoPaymentId(payment.payment_id)) {
    return;
  }

  const { data: invoice, error: invoiceError } = await service
    .from("invoices")
    .insert({
      user_id: mapping.userId,
      plan_id: (await getPlanForSubscription(payment))?.id,
      subscription_id: subscriptionId,
      amount_cents: payment.total_amount,
      currency: payment.currency,
      status: "paid",
      dodo_payment_id: payment.payment_id,
      dodo_checkout_session_id: payment.checkout_session_id ?? null,
      dodo_subscription_id: payment.subscription_id,
      metadata: payment.metadata,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    throw new Error(
      `Failed to insert invoice: ${invoiceError?.message ?? "unknown"}`
    );
  }

  const plan = await getPlanForSubscription(payment);
  if (plan) {
    const ledgerEntryId = await addPurchaseCredits(
      mapping.userId,
      plan,
      payment.total_amount,
      invoice.id,
      payment.payment_id
    );

    await service
      .from("invoices")
      .update({ credit_ledger_entry_id: ledgerEntryId })
      .eq("id", invoice.id);
  }
}

async function getPlanForSubscription(payment: Payment): Promise<PlanRow | null> {
  const productCart = payment.product_cart;
  if (!productCart || productCart.length === 0) return null;

  const dodoProductId = productCart[0].product_id;
  return getPlanByDodoProductId(dodoProductId);
}

export async function upsertSubscription(
  userId: string,
  subscription: Subscription,
  dodoCustomerId: string
): Promise<string> {
  const service = createServiceClient();

  const existing = await findSubscriptionByDodoId(subscription.subscription_id);

  const plan = await getPlanByDodoProductId(subscription.product_id);
  const planId = plan?.id;

  const status = mapSubscriptionStatus(subscription.status);

  if (existing) {
    const { error } = await service
      .from("subscriptions")
      .update({
        plan_id: planId,
        status,
        current_period_start: subscription.previous_billing_date,
        current_period_end: subscription.next_billing_date,
        cancel_at_period_end: subscription.cancel_at_next_billing_date,
        dodo_customer_id: dodoCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    return existing.id;
  }

  const { data, error } = await service.from("subscriptions").insert({
    user_id: userId,
    plan_id: planId,
    status,
    trial: subscription.trial_period_days > 0,
    started_at: subscription.created_at,
    current_period_start: subscription.previous_billing_date,
    current_period_end: subscription.next_billing_date,
    cancel_at_period_end: subscription.cancel_at_next_billing_date,
    dodo_subscription_id: subscription.subscription_id,
    dodo_customer_id: dodoCustomerId,
    metadata: subscription.metadata,
  }).select("id").single();

  if (error || !data) {
    throw new Error(`Failed to insert subscription: ${error?.message ?? "unknown"}`);
  }

  return data.id as string;
}

function mapSubscriptionStatus(
  status: Subscription["status"]
): "active" | "cancelled" | "expired" | "past_due" {
  switch (status) {
    case "active":
    case "pending":
      return "active";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    case "on_hold":
    case "failed":
    case "past_due":
      return "past_due";
    case "paused":
      return "active";
    default:
      return "active";
  }
}

export async function markSubscriptionPastDue(dodoSubscriptionId: string) {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("dodo_subscription_id", dodoSubscriptionId);
}
