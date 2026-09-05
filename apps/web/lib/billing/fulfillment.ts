"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createDodoClient } from "./dodo-client";
import type { Payment, Subscription } from "dodopayments/resources/index";

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  credits_grant: number;
  price_cents: number;
}

interface UserMapping {
  userId: string;
  customerId: string;
}

function creditCostToCredits(plan: PlanRow, amountCents: number): number {
  if (plan.type === "extra_credit") {
    // 1 credit = $0.01 of purchasing power.
    return Math.max(0, Math.floor(amountCents));
  }
  return plan.credits_grant;
}

async function resolveUser(
  dodoCustomerId: string,
  customerEmail: string,
  metadata: Record<string, unknown>
): Promise<UserMapping | null> {
  const service = createServiceClient();

  if (metadata && typeof metadata.user_id === "string") {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", metadata.user_id)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, customerId: dodoCustomerId };
    }
  }

  if (dodoCustomerId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("dodo_customer_id", dodoCustomerId)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, customerId: dodoCustomerId };
    }
  }

  if (customerEmail) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, customerId: dodoCustomerId };
    }
  }

  return null;
}

async function getPlanByDodoProductId(
  dodoProductId: string
): Promise<PlanRow | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("plans")
    .select("id, slug, name, type, credits_grant, price_cents")
    .filter("metadata->>dodo_product_id", "eq", dodoProductId)
    .maybeSingle();

  if (error || !data) {
    console.error(
      `[getPlanByDodoProductId] no plan for dodo product ${dodoProductId}: ${
        error?.message ?? "not found"
      }`
    );
    return null;
  }

  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    type: data.type as string,
    credits_grant: Number(data.credits_grant),
    price_cents: Number(data.price_cents),
  };
}

async function recordCustomer(userId: string, customerId: string) {
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ dodo_customer_id: customerId })
    .eq("id", userId);
  if (error) {
    console.error(`[recordCustomer] failed: ${error.message}`);
  }
}

async function findInvoiceByPaymentId(dodoPaymentId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, dodo_payment_id, dodo_subscription_id, metadata")
    .eq("dodo_payment_id", dodoPaymentId)
    .maybeSingle();
  return data ? { id: data.id as string } : null;
}

async function findInvoiceByPeriod(
  dodoSubscriptionId: string,
  nextBillingDate: string
) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, amount_cents, dodo_payment_id, dodo_subscription_id, metadata")
    .eq("dodo_subscription_id", dodoSubscriptionId)
    .filter("metadata->>next_billing_date", "eq", nextBillingDate)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        amountCents: Number(data.amount_cents),
        dodoPaymentId: data.dodo_payment_id as string | null,
        dodoSubscriptionId: data.dodo_subscription_id as string,
        nextBillingDate: (data.metadata as { next_billing_date?: string })
          ?.next_billing_date,
      }
    : null;
}

async function findSubscriptionByDodoId(dodoSubscriptionId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("subscriptions")
    .select("id, status, current_period_end")
    .eq("dodo_subscription_id", dodoSubscriptionId)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        status: data.status as string,
        currentPeriodEnd: data.current_period_end as string | null,
      }
    : null;
}

async function upsertSubscription(
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
        user_id: userId,
        plan_id: planId,
        status,
        current_period_start: subscription.previous_billing_date,
        current_period_end: subscription.next_billing_date,
        cancel_at_period_end: subscription.cancel_at_next_billing_date,
        trial: subscription.trial_period_days > 0,
        dodo_customer_id: dodoCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to update subscription: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await service
    .from("subscriptions")
    .insert({
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
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to insert subscription: ${error?.message ?? "unknown"}`
    );
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

async function ensureCreditsForBillingPeriod(
  userId: string,
  plan: PlanRow,
  dodoSubscriptionId: string | undefined,
  invoiceId: string,
  idempotencyKey: string,
  amountCents: number
) {
  const service = createServiceClient();
  const credits = creditCostToCredits(plan, amountCents);

  const { data: existing } = await service
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    console.log(
      `[ensureCreditsForBillingPeriod] credits already granted: ${idempotencyKey}`
    );
    return existing.id as string;
  }

  const { data: ledger, error: ledgerError } = await service
    .from("credit_ledger")
    .insert({
      user_id: userId,
      entry_type: "purchase",
      amount: credits,
      currency_unit: "credits",
      idempotency_key: idempotencyKey,
      metadata: {
        invoice_id: invoiceId,
        plan_id: plan.id,
        ...(dodoSubscriptionId ? { subscription_id: dodoSubscriptionId } : {}),
      },
    })
    .select("id")
    .single();

  if (ledgerError || !ledger) {
    if (ledgerError?.message?.includes("duplicate key")) {
      const { data: dup } = await service
        .from("credit_ledger")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      return dup?.id as string;
    }
    throw new Error(
      `Failed to insert credit_ledger: ${ledgerError?.message ?? "unknown"}`
    );
  }

  return ledger.id as string;
}

async function ensureInvoiceForSubscriptionPeriod(
  userId: string,
  plan: PlanRow | null,
  subscription: Subscription,
  payment: Payment | null,
  amountCents: number
) {
  const service = createServiceClient();
  const nextBillingDate = subscription.next_billing_date;

  const invoice = await findInvoiceByPeriod(
    subscription.subscription_id,
    nextBillingDate
  );

  if (invoice) {
    // Update with payment details if this is the matching payment.
    if (payment && !invoice.dodoPaymentId) {
      await service
        .from("invoices")
        .update({
          plan_id: plan?.id,
          amount_cents: payment.total_amount,
          status: "paid",
          dodo_payment_id: payment.payment_id,
          dodo_checkout_session_id: payment.checkout_session_id ?? null,
          metadata: {
            ...((invoice.nextBillingDate
              ? { next_billing_date: invoice.nextBillingDate }
              : {}) as object),
            payment_metadata: payment.metadata,
          },
        })
        .eq("id", invoice.id);
    }
    return invoice.id;
  }

  const { data, error } = await service
    .from("invoices")
    .insert({
      user_id: userId,
      plan_id: plan?.id,
      subscription_id: (await findSubscriptionByDodoId(subscription.subscription_id))?.id,
      amount_cents: payment?.total_amount ?? amountCents,
      currency: subscription.currency,
      status: "paid",
      dodo_payment_id: payment?.payment_id ?? null,
      dodo_checkout_session_id: payment?.checkout_session_id ?? null,
      dodo_subscription_id: subscription.subscription_id,
      metadata: { next_billing_date: nextBillingDate },
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to insert invoice: ${error?.message ?? "unknown"}`
    );
  }

  return data.id as string;
}

export async function fulfillOneTimePayment(payment: Payment) {
  console.log(`[fulfillOneTimePayment] payment ${payment.payment_id}`);

  if (payment.is_update_payment_method) {
    console.log(
      `[fulfillOneTimePayment] skipping update-payment-method payment ${payment.payment_id}`
    );
    return;
  }

  const productCart = payment.product_cart;
  if (!productCart || productCart.length === 0) {
    console.error(`[fulfillOneTimePayment] no product cart`);
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

  const mapping = await resolveUser(
    payment.customer.customer_id,
    payment.customer.email,
    payment.metadata
  );
  if (!mapping) {
    console.error(
      `[fulfillOneTimePayment] could not resolve user for payment ${payment.payment_id}`
    );
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  if (await findInvoiceByPaymentId(payment.payment_id)) {
    console.log(`[fulfillOneTimePayment] already processed`);
    return;
  }

  const service = createServiceClient();
  const { data: invoice, error: invoiceError } = await service
    .from("invoices")
    .insert({
      user_id: mapping.userId,
      plan_id: plan.id,
      amount_cents: payment.total_amount,
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

  const ledgerEntryId = await ensureCreditsForBillingPeriod(
    mapping.userId,
    plan,
    undefined,
    invoice.id,
    `purchase:payment:${payment.payment_id}`,
    payment.total_amount
  );

  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoice.id);

  console.log(
    `[fulfillOneTimePayment] granted ${plan.credits_grant} credits to user ${mapping.userId}`
  );
}

export async function fulfillSubscriptionPayment(payment: Payment) {
  console.log(
    `[fulfillSubscriptionPayment] payment ${payment.payment_id} subscription ${payment.subscription_id}`
  );

  if (!payment.subscription_id) {
    console.error(`[fulfillSubscriptionPayment] missing subscription_id`);
    return;
  }

  if (payment.is_update_payment_method) {
    console.log(
      `[fulfillSubscriptionPayment] skipping update-payment-method payment ${payment.payment_id}`
    );
    return;
  }

  const mapping = await resolveUser(
    payment.customer.customer_id,
    payment.customer.email,
    payment.metadata
  );
  if (!mapping) {
    console.error(
      `[fulfillSubscriptionPayment] could not resolve user for payment ${payment.payment_id}`
    );
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  let subscription: Subscription;
  try {
    const dodo = createDodoClient();
    subscription = await dodo.subscriptions.retrieve(payment.subscription_id);
  } catch (err) {
    console.error(
      `[fulfillSubscriptionPayment] failed to fetch subscription`,
      err instanceof Error ? err.message : String(err)
    );
    return;
  }

  await upsertSubscription(
    mapping.userId,
    subscription,
    payment.customer.customer_id
  );

  const plan = await getPlanByDodoProductId(subscription.product_id);
  if (!plan) {
    console.error(
      `[fulfillSubscriptionPayment] no plan for subscription product ${subscription.product_id}`
    );
    return;
  }

  const invoiceId = await ensureInvoiceForSubscriptionPeriod(
    mapping.userId,
    plan,
    subscription,
    payment,
    plan.price_cents
  );

  const idempotencyKey = `subscription:${subscription.subscription_id}:${subscription.next_billing_date}`;
  const ledgerEntryId = await ensureCreditsForBillingPeriod(
    mapping.userId,
    plan,
    subscription.subscription_id,
    invoiceId,
    idempotencyKey,
    payment.total_amount
  );

  const service = createServiceClient();
  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoiceId);

  console.log(
    `[fulfillSubscriptionPayment] granted ${plan.credits_grant} credits to user ${mapping.userId} for period ${subscription.next_billing_date}`
  );
}

export async function fulfillSubscriptionLifecycleEvent(
  subscription: Subscription
) {
  console.log(
    `[fulfillSubscriptionLifecycleEvent] subscription ${subscription.subscription_id} status ${subscription.status}`
  );

  const mapping = await resolveUser(
    subscription.customer.customer_id,
    subscription.customer.email,
    subscription.metadata
  );
  if (!mapping) {
    console.error(
      `[fulfillSubscriptionLifecycleEvent] could not resolve user for subscription ${subscription.subscription_id}`
    );
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  const subscriptionId = await upsertSubscription(
    mapping.userId,
    subscription,
    subscription.customer.customer_id
  );

  if (subscription.status !== "active" && subscription.status !== "pending") {
    console.log(
      `[fulfillSubscriptionLifecycleEvent] subscription ${subscription.subscription_id} is not active/pending, skipping credits`
    );
    return;
  }

  const plan = await getPlanByDodoProductId(subscription.product_id);
  if (!plan) {
    console.error(
      `[fulfillSubscriptionLifecycleEvent] no plan for product ${subscription.product_id}`
    );
    return;
  }

  const isTrial = subscription.trial_period_days > 0;
  const invoiceAmount = isTrial ? 0 : plan.price_cents;

  const invoiceId = await ensureInvoiceForSubscriptionPeriod(
    mapping.userId,
    plan,
    subscription,
    null,
    invoiceAmount
  );

  const idempotencyKey = `subscription:${subscription.subscription_id}:${subscription.next_billing_date}`;
  const ledgerEntryId = await ensureCreditsForBillingPeriod(
    mapping.userId,
    plan,
    subscription.subscription_id,
    invoiceId,
    idempotencyKey,
    invoiceAmount
  );

  const service = createServiceClient();
  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoiceId);

  await service
    .from("subscriptions")
    .update({ status: "active" })
    .eq("id", subscriptionId);

  console.log(
    `[fulfillSubscriptionLifecycleEvent] granted ${plan.credits_grant} credits to user ${mapping.userId} for period ${subscription.next_billing_date}`
  );
}

export async function markSubscriptionPastDue(dodoSubscriptionId: string) {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("dodo_subscription_id", dodoSubscriptionId);
}
