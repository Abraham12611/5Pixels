"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createPolarClient } from "./polar-client";
import { initializeSubscriptionDrip } from "./drip";
import { recordOfferConversion } from "@/lib/offers/conversions";
import { grantReferrerPaymentShare } from "@/lib/referrals/rewards";
import type { Order } from "@polar-sh/sdk/models/components/order.js";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js";

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  credits_grant: number;
  price_cents: number;
  credit_drip_months: number;
  polar_product_id: string | null;
}

interface UserMapping {
  userId: string;
  customerId: string;
}

interface SubscriptionInfo {
  subscriptionId: string;
  productId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  currency: string;
  isTrial: boolean;
  status: Subscription["status"];
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  endedAt: string | null;
  metadata: Record<string, unknown>;
}

function creditCostToCredits(plan: PlanRow, amountCents: number): number {
  if (plan.type === "extra_credit") {
    // 1 credit = $0.01 of purchasing power.
    return Math.max(0, Math.floor(amountCents));
  }
  return plan.credits_grant;
}

async function resolveUser(
  polarCustomerId: string,
  customerEmail: string | null | undefined,
  customerExternalId: string | null | undefined,
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
      return { userId: profile.id as string, customerId: polarCustomerId };
    }
  }

  if (polarCustomerId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("polar_customer_id", polarCustomerId)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, customerId: polarCustomerId };
    }
  }

  // Polar checkouts stamp our user id as external_customer_id.
  if (customerExternalId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", customerExternalId)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, customerId: polarCustomerId };
    }
  }

  if (customerEmail) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, customerId: polarCustomerId };
    }
  }

  return null;
}

function toPlanRow(data: Record<string, unknown>): PlanRow {
  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    type: data.type as string,
    credits_grant: Number(data.credits_grant),
    price_cents: Number(data.price_cents),
    credit_drip_months: Number(data.credit_drip_months ?? 1),
    polar_product_id:
      (data.metadata as { polar_product_id?: string })?.polar_product_id ??
      null,
  };
}

async function getPlanById(planId: string): Promise<PlanRow | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("plans")
    .select(
      "id, slug, name, type, credits_grant, price_cents, credit_drip_months, metadata"
    )
    .eq("id", planId)
    .maybeSingle();

  if (error || !data) {
    console.error(`[getPlanById] no plan ${planId}: ${error?.message ?? ""}`);
    return null;
  }

  return toPlanRow(data);
}

async function getPlanByPolarProductId(
  polarProductId: string
): Promise<PlanRow | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("plans")
    .select(
      "id, slug, name, type, credits_grant, price_cents, credit_drip_months, metadata"
    )
    .filter("metadata->>polar_product_id", "eq", polarProductId)
    .maybeSingle();

  if (error || !data) {
    console.error(
      `[getPlanByPolarProductId] no plan for polar product ${polarProductId}: ${
        error?.message ?? "not found"
      }`
    );
    return null;
  }

  return { ...toPlanRow(data), polar_product_id: polarProductId };
}

async function recordCustomer(userId: string, customerId: string) {
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ polar_customer_id: customerId })
    .eq("id", userId);
  if (error) {
    console.error(`[recordCustomer] failed: ${error.message}`);
  }
}

async function findInvoiceByOrderId(polarOrderId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, polar_order_id, polar_subscription_id, metadata")
    .eq("polar_order_id", polarOrderId)
    .maybeSingle();
  return data ? { id: data.id as string } : null;
}

async function findInvoiceByPeriod(
  polarSubscriptionId: string,
  currentPeriodEnd: string
) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, amount_cents, polar_order_id, polar_subscription_id, metadata")
    .eq("polar_subscription_id", polarSubscriptionId)
    .filter("metadata->>current_period_end", "eq", currentPeriodEnd)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        amountCents: Number(data.amount_cents),
        polarOrderId: data.polar_order_id as string | null,
        polarSubscriptionId: data.polar_subscription_id as string,
        currentPeriodEnd: (data.metadata as { current_period_end?: string })
          ?.current_period_end,
      }
    : null;
}

async function findSubscriptionByPolarId(polarSubscriptionId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("subscriptions")
    .select(
      "id, status, current_period_start, current_period_end, cancel_at_period_end, plan_id, trial, polar_customer_id, drips_granted, next_drip_at, metadata"
    )
    .eq("polar_subscription_id", polarSubscriptionId)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        status: data.status as string,
        currentPeriodStart: data.current_period_start as string | null,
        currentPeriodEnd: data.current_period_end as string | null,
        cancelAtPeriodEnd: data.cancel_at_period_end as boolean,
        planId: data.plan_id as string,
        trial: data.trial as boolean,
        polarCustomerId: data.polar_customer_id as string | null,
        dripsGranted: Number(data.drips_granted ?? 0),
        nextDripAt: data.next_drip_at as string | null,
        metadata: data.metadata as Record<string, unknown>,
      }
    : null;
}

async function upsertSubscription(
  userId: string,
  info: SubscriptionInfo,
  polarCustomerId: string
): Promise<{ id: string; isNew: boolean }> {
  const service = createServiceClient();

  const existing = await findSubscriptionByPolarId(info.subscriptionId);
  const plan = await getPlanByPolarProductId(info.productId);
  const planId = plan?.id;
  const status = mapSubscriptionStatus(info.status);

  if (existing) {
    const { error } = await service
      .from("subscriptions")
      .update({
        user_id: userId,
        plan_id: planId,
        status,
        current_period_start: info.currentPeriodStart,
        current_period_end: info.currentPeriodEnd,
        cancel_at_period_end: info.cancelAtPeriodEnd,
        trial: info.isTrial,
        ended_at: info.endedAt,
        polar_customer_id: polarCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to update subscription: ${error.message}`);
    return { id: existing.id, isNew: false };
  }

  const isDripped = (plan?.credit_drip_months ?? 1) > 1;

  const { data, error } = await service
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id: planId,
      status,
      trial: info.isTrial,
      started_at: info.createdAt,
      ended_at: info.endedAt,
      current_period_start: info.currentPeriodStart,
      current_period_end: info.currentPeriodEnd,
      cancel_at_period_end: info.cancelAtPeriodEnd,
      polar_subscription_id: info.subscriptionId,
      polar_customer_id: polarCustomerId,
      // Dripped (annual) plans get their first grant immediately below and
      // the remaining 11 from the drip scheduler.
      drips_granted: 0,
      next_drip_at: isDripped ? info.currentPeriodStart : null,
      metadata: info.metadata,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to insert subscription: ${error?.message ?? "unknown"}`
    );
  }

  return { id: data.id as string, isNew: true };
}

function mapSubscriptionStatus(
  status: Subscription["status"]
): "active" | "cancelled" | "expired" | "past_due" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "cancelled";
    case "incomplete_expired":
      return "expired";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "paused":
      return "active";
    default:
      return "active";
  }
}

function toSubscriptionInfo(subscription: Subscription): SubscriptionInfo {
  const now = new Date().toISOString();
  return {
    subscriptionId: subscription.id,
    productId: subscription.productId,
    currentPeriodStart:
      subscription.currentPeriodStart?.toISOString?.() ??
      String(subscription.currentPeriodStart ?? now),
    currentPeriodEnd:
      subscription.currentPeriodEnd?.toISOString?.() ??
      String(subscription.currentPeriodEnd ?? now),
    currency: subscription.currency,
    isTrial:
      subscription.status === "trialing" ||
      (subscription.trialEnd != null &&
        new Date(subscription.trialEnd).getTime() > Date.now()),
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt:
      subscription.createdAt?.toISOString?.() ??
      String(subscription.createdAt ?? now),
    endedAt: subscription.endedAt
      ? subscription.endedAt.toISOString?.() ?? String(subscription.endedAt)
      : null,
    metadata: (subscription.metadata ?? {}) as Record<string, unknown>,
  };
}

async function buildSubscriptionInfoFromOrder(
  order: Order
): Promise<SubscriptionInfo | null> {
  const polarSubscriptionId = order.subscriptionId;
  if (!polarSubscriptionId) return null;

  // Prefer the local DB record (created by a subscription.* event).
  const local = await findSubscriptionByPolarId(polarSubscriptionId);
  if (local?.planId) {
    const plan = await getPlanById(local.planId);
    if (plan?.polar_product_id && local.currentPeriodEnd) {
      console.log(
        `[buildSubscriptionInfoFromOrder] using local subscription record for ${polarSubscriptionId}`
      );
      return {
        subscriptionId: polarSubscriptionId,
        productId: plan.polar_product_id,
        currentPeriodStart:
          local.currentPeriodStart ?? order.createdAt?.toISOString?.() ?? new Date().toISOString(),
        currentPeriodEnd: local.currentPeriodEnd,
        currency: order.currency,
        isTrial: local.trial,
        status: "active" as Subscription["status"],
        cancelAtPeriodEnd: local.cancelAtPeriodEnd,
        createdAt: order.createdAt?.toISOString?.() ?? new Date().toISOString(),
        endedAt: null,
        metadata: local.metadata,
      };
    }
  }

  // Fall back to the Polar API.
  try {
    const polar = createPolarClient();
    const remote = await polar.subscriptions.get({ id: polarSubscriptionId });
    console.log(
      `[buildSubscriptionInfoFromOrder] fetched Polar subscription for ${polarSubscriptionId}`
    );
    return toSubscriptionInfo(remote);
  } catch (err) {
    console.error(
      `[buildSubscriptionInfoFromOrder] failed to fetch Polar subscription ${polarSubscriptionId}:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

async function ensureCreditsForBillingPeriod(
  userId: string,
  plan: PlanRow,
  polarSubscriptionId: string | undefined,
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
        ...(polarSubscriptionId
          ? { subscription_id: polarSubscriptionId }
          : {}),
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
  info: SubscriptionInfo,
  order: Order | null,
  amountCents: number
) {
  const service = createServiceClient();
  const currentPeriodEnd = info.currentPeriodEnd;

  const invoice = await findInvoiceByPeriod(
    info.subscriptionId,
    currentPeriodEnd
  );

  if (invoice) {
    // Update with order details if this is the matching order.
    if (order && !invoice.polarOrderId) {
      await service
        .from("invoices")
        .update({
          plan_id: plan?.id,
          amount_cents: order.totalAmount,
          status: "paid",
          polar_order_id: order.id,
          polar_checkout_id: order.checkoutId ?? null,
          metadata: {
            ...((invoice.currentPeriodEnd
              ? { current_period_end: invoice.currentPeriodEnd }
              : {}) as object),
            order_metadata: order.metadata,
          },
        })
        .eq("id", invoice.id);
    }
    return invoice.id;
  }

  const dbSubscription = await findSubscriptionByPolarId(info.subscriptionId);

  const { data, error } = await service
    .from("invoices")
    .insert({
      user_id: userId,
      plan_id: plan?.id,
      subscription_id: dbSubscription?.id,
      amount_cents: order?.totalAmount ?? amountCents,
      currency: order?.currency ?? info.currency,
      status: "paid",
      polar_order_id: order?.id ?? null,
      polar_checkout_id: order?.checkoutId ?? null,
      polar_subscription_id: info.subscriptionId,
      metadata: {
        current_period_end: currentPeriodEnd,
        ...(order?.metadata ? { order_metadata: order.metadata } : {}),
        ...pickAttributionMetadata(info.metadata),
      },
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

const ATTRIBUTION_KEYS = [
  "experiment_key",
  "variant_key",
  "ladder_stage",
  "growsurf_participant_id",
] as const;

function pickAttributionMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of ATTRIBUTION_KEYS) {
    if (typeof metadata[key] === "string") {
      picked[key] = metadata[key];
    }
  }
  return picked;
}

export async function fulfillPolarOneTimeOrder(order: Order) {
  console.log(`[fulfillPolarOneTimeOrder] order ${order.id}`);

  const productId = order.productId;
  if (!productId) {
    console.error(`[fulfillPolarOneTimeOrder] no product on order`);
    return;
  }

  const plan = await getPlanByPolarProductId(productId);
  if (!plan) {
    console.error(
      `[fulfillPolarOneTimeOrder] no plan for polar product ${productId}`
    );
    return;
  }

  const mapping = await resolveUser(
    order.customerId,
    order.customer?.email,
    order.customer?.externalId,
    order.metadata as Record<string, unknown>
  );
  if (!mapping) {
    console.error(
      `[fulfillPolarOneTimeOrder] could not resolve user for order ${order.id}`
    );
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  if (await findInvoiceByOrderId(order.id)) {
    console.log(`[fulfillPolarOneTimeOrder] already processed`);
    return;
  }

  const service = createServiceClient();
  const { data: invoice, error: invoiceError } = await service
    .from("invoices")
    .insert({
      user_id: mapping.userId,
      plan_id: plan.id,
      amount_cents: order.totalAmount,
      currency: order.currency,
      status: "paid",
      polar_order_id: order.id,
      polar_checkout_id: order.checkoutId ?? null,
      metadata: order.metadata,
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
    `purchase:payment:${order.id}`,
    order.totalAmount
  );

  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoice.id);

  await recordOfferConversion(
    mapping.userId,
    order.metadata as Record<string, unknown>,
    order.id,
    order.totalAmount
  );

  try {
    await grantReferrerPaymentShare(mapping.userId, plan, order.id);
  } catch (err) {
    // Referral rewards must never break fulfillment — log and move on.
    console.error(
      "[fulfillPolarOneTimeOrder] referral reward failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log(
    `[fulfillPolarOneTimeOrder] granted ${plan.credits_grant} credits to user ${mapping.userId}`
  );
}

export async function fulfillPolarSubscriptionOrder(order: Order) {
  console.log(
    `[fulfillPolarSubscriptionOrder] order ${order.id} subscription ${order.subscriptionId}`
  );

  if (!order.subscriptionId) {
    console.error(`[fulfillPolarSubscriptionOrder] missing subscription_id`);
    return;
  }

  const mapping = await resolveUser(
    order.customerId,
    order.customer?.email,
    order.customer?.externalId,
    order.metadata as Record<string, unknown>
  );
  if (!mapping) {
    console.error(
      `[fulfillPolarSubscriptionOrder] could not resolve user for order ${order.id}`
    );
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  const info = await buildSubscriptionInfoFromOrder(order);
  if (!info) {
    console.error(
      `[fulfillPolarSubscriptionOrder] could not build subscription info for order ${order.id}; will retry on subscription event`
    );
    return;
  }

  await upsertSubscription(mapping.userId, info, order.customerId);

  const plan = await getPlanByPolarProductId(info.productId);
  if (!plan) {
    console.error(
      `[fulfillPolarSubscriptionOrder] no plan for subscription product ${info.productId}`
    );
    return;
  }

  const invoiceId = await ensureInvoiceForSubscriptionPeriod(
    mapping.userId,
    plan,
    info,
    order,
    plan.price_cents
  );

  await recordOfferConversion(
    mapping.userId,
    order.metadata as Record<string, unknown>,
    order.id,
    order.totalAmount
  );

  try {
    await grantReferrerPaymentShare(mapping.userId, plan, order.id);
  } catch (err) {
    console.error(
      "[fulfillPolarSubscriptionOrder] referral reward failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (plan.credit_drip_months > 1) {
    // Annual plans: credits are granted by the monthly drip, not per billing
    // event. Drip 1 was granted at subscription creation.
    console.log(
      `[fulfillPolarSubscriptionOrder] plan ${plan.slug} is credit-dripped; skipping per-period grant`
    );
    return;
  }

  const idempotencyKey = `subscription:${info.subscriptionId}:${info.currentPeriodEnd}`;
  const ledgerEntryId = await ensureCreditsForBillingPeriod(
    mapping.userId,
    plan,
    info.subscriptionId,
    invoiceId,
    idempotencyKey,
    order.totalAmount
  );

  const service = createServiceClient();
  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoiceId);

  console.log(
    `[fulfillPolarSubscriptionOrder] granted ${plan.credits_grant} credits to user ${mapping.userId} for period ${info.currentPeriodEnd}`
  );
}

export async function fulfillPolarSubscriptionEvent(
  subscription: Subscription
) {
  console.log(
    `[fulfillPolarSubscriptionEvent] subscription ${subscription.id} status ${subscription.status}`
  );

  const mapping = await resolveUser(
    subscription.customerId,
    subscription.customer?.email,
    subscription.customer?.externalId,
    (subscription.metadata ?? {}) as Record<string, unknown>
  );
  if (!mapping) {
    console.error(
      `[fulfillPolarSubscriptionEvent] could not resolve user for subscription ${subscription.id}`
    );
    return;
  }

  await recordCustomer(mapping.userId, mapping.customerId);

  const info = toSubscriptionInfo(subscription);

  const { id: subscriptionId, isNew } = await upsertSubscription(
    mapping.userId,
    info,
    subscription.customerId
  );

  if (
    subscription.status !== "active" &&
    subscription.status !== "trialing"
  ) {
    console.log(
      `[fulfillPolarSubscriptionEvent] subscription ${subscription.id} is not active/trialing, skipping credits`
    );
    return;
  }

  const plan = await getPlanByPolarProductId(info.productId);
  if (!plan) {
    console.error(
      `[fulfillPolarSubscriptionEvent] no plan for product ${info.productId}`
    );
    return;
  }

  const invoiceAmount = info.isTrial ? 0 : plan.price_cents;

  const invoiceId = await ensureInvoiceForSubscriptionPeriod(
    mapping.userId,
    plan,
    info,
    null,
    invoiceAmount
  );

  const service = createServiceClient();

  if (plan.credit_drip_months > 1) {
    // Annual plan: grant drip 1 immediately and leave the rest to the
    // scheduler. Idempotent via the drips_granted counter.
    const sub = await findSubscriptionByPolarId(info.subscriptionId);
    if (sub && sub.dripsGranted === 0) {
      await initializeSubscriptionDrip({
        subscriptionRowId: subscriptionId,
        userId: mapping.userId,
        plan,
        polarSubscriptionId: info.subscriptionId,
        periodStart: info.currentPeriodStart,
        invoiceId,
      });
    }
    return;
  }

  const idempotencyKey = `subscription:${info.subscriptionId}:${info.currentPeriodEnd}`;
  const ledgerEntryId = await ensureCreditsForBillingPeriod(
    mapping.userId,
    plan,
    info.subscriptionId,
    invoiceId,
    idempotencyKey,
    invoiceAmount
  );

  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoiceId);

  if (isNew || subscription.status === "active") {
    await service
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", subscriptionId);
  }

  console.log(
    `[fulfillPolarSubscriptionEvent] granted ${plan.credits_grant} credits to user ${mapping.userId} for period ${info.currentPeriodEnd}`
  );
}

export async function markPolarSubscriptionPastDue(polarSubscriptionId: string) {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("polar_subscription_id", polarSubscriptionId);
}

export async function markPolarSubscriptionCancelled(
  polarSubscriptionId: string
) {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({
      status: "cancelled",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("polar_subscription_id", polarSubscriptionId);
}
