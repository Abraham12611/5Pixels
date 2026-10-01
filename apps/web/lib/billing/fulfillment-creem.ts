"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCreemSubscription } from "./creem-client";
import { initializeSubscriptionDrip } from "./drip";
import { recordOfferConversion } from "@/lib/offers/conversions";
import { awardOrHoldReferrerShare } from "@/lib/growsurf/sync";

/**
 * Creem fulfillment — mirrors fulfillment-polar.ts against Creem webhook
 * payloads (snake_case, docs.creem.io/code/webhooks).
 *
 * Event model differences vs Polar:
 * - checkout.completed carries the order for BOTH one-time products and
 *   the first subscription charge (order.type "recurring", plus the
 *   subscription entity when present).
 * - subscription.paid fires per successful charge including renewals.
 *   Grants key on `subscription:{id}:{current_period_end_date}` so
 *   checkout.completed and subscription.paid covering the same first
 *   period can never double-grant.
 * - refunds arrive as refund.created { transaction: { order } }.
 */

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  credits_grant: number;
  price_cents: number;
  credit_drip_months: number;
  creem_product_id: string | null;
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
  status: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  endedAt: string | null;
  metadata: Record<string, unknown>;
}

/** Customer/subscription refs arrive as either embedded entities or ids. */
export interface CreemRef {
  id?: string;
  email?: string;
  name?: string;
}

function refId(v: unknown): string | null {
  if (typeof v === "string" && v) return v;
  if (v && typeof v === "object") {
    const id = (v as { id?: unknown }).id;
    if (typeof id === "string" && id) return id;
  }
  return null;
}

function refEmail(v: unknown): string | null {
  if (v && typeof v === "object") {
    const email = (v as { email?: unknown }).email;
    if (typeof email === "string" && email) return email;
  }
  return null;
}

export interface CreemCheckoutObject {
  id?: string;
  request_id?: string;
  status?: string;
  order?: {
    id?: string;
    amount?: number;
    amount_paid?: number;
    currency?: string;
    status?: string;
    type?: string;
    customer?: unknown;
    product?: unknown;
    transaction?: string;
  };
  product?: unknown;
  subscription?: unknown;
  customer?: unknown;
  metadata?: Record<string, unknown>;
}

export interface CreemSubscriptionObject {
  id?: string;
  product?: unknown;
  customer?: unknown;
  status?: string;
  current_period_start_date?: string;
  current_period_end_date?: string;
  last_transaction_id?: string;
  canceled_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

function creditCostToCredits(plan: PlanRow, amountCents: number): number {
  if (plan.type === "extra_credit") {
    // 1 credit = $0.01 of purchasing power.
    return Math.max(0, Math.floor(amountCents));
  }
  return plan.credits_grant;
}

async function resolveUser(
  creemCustomerId: string | null,
  customerEmail: string | null,
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
      return {
        userId: profile.id as string,
        customerId: creemCustomerId ?? "",
      };
    }
  }

  if (creemCustomerId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("creem_customer_id", creemCustomerId)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, customerId: creemCustomerId };
    }
  }

  if (customerEmail) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();
    if (profile) {
      return {
        userId: profile.id as string,
        customerId: creemCustomerId ?? "",
      };
    }
  }

  return null;
}

function toPlanRow(data: Record<string, unknown>): PlanRow {
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    type: data.type as string,
    credits_grant: Number(data.credits_grant),
    price_cents: Number(data.price_cents),
    credit_drip_months: Number(data.credit_drip_months ?? 1),
    creem_product_id:
      (meta.creem_product_id as string | undefined) ??
      (meta.creem_product_id_test as string | undefined) ??
      (meta.creem_product_id_live as string | undefined) ??
      null,
  };
}

const PLAN_SELECT =
  "id, slug, name, type, credits_grant, price_cents, credit_drip_months, metadata";

async function getPlanById(planId: string): Promise<PlanRow | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("plans")
    .select(PLAN_SELECT)
    .eq("id", planId)
    .maybeSingle();

  if (error || !data) {
    console.error(`[getPlanById] no plan ${planId}: ${error?.message ?? ""}`);
    return null;
  }
  return toPlanRow(data);
}

async function getPlanByCreemProductId(
  creemProductId: string
): Promise<PlanRow | null> {
  const service = createServiceClient();
  // Plans are few — client-side match across all three metadata keys is
  // simpler than a multi-column .or() and picks the id regardless of which
  // environment scoped it.
  const { data, error } = await service.from("plans").select(PLAN_SELECT);
  if (error) {
    console.error(`[getPlanByCreemProductId] query failed: ${error.message}`);
    return null;
  }

  const match = (data ?? []).find((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return (
      meta.creem_product_id === creemProductId ||
      meta.creem_product_id_test === creemProductId ||
      meta.creem_product_id_live === creemProductId
    );
  });

  if (!match) {
    console.error(
      `[getPlanByCreemProductId] no plan for creem product ${creemProductId}`
    );
    return null;
  }
  return { ...toPlanRow(match), creem_product_id: creemProductId };
}

async function recordCustomer(userId: string, customerId: string) {
  if (!customerId) return;
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ creem_customer_id: customerId })
    .eq("id", userId)
    .is("creem_customer_id", null);
  if (error) {
    console.error(`[recordCustomer] failed: ${error.message}`);
  }
}

async function findInvoiceByOrderId(creemOrderId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, creem_order_id, creem_subscription_id, metadata")
    .eq("creem_order_id", creemOrderId)
    .maybeSingle();
  return data ? { id: data.id as string } : null;
}

async function findInvoiceByPeriod(
  creemSubscriptionId: string,
  currentPeriodEnd: string
) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, amount_cents, creem_order_id, creem_subscription_id, metadata")
    .eq("creem_subscription_id", creemSubscriptionId)
    .filter("metadata->>current_period_end", "eq", currentPeriodEnd)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        amountCents: Number(data.amount_cents),
        creemOrderId: data.creem_order_id as string | null,
        currentPeriodEnd: (data.metadata as { current_period_end?: string })
          ?.current_period_end,
      }
    : null;
}

async function findSubscriptionByCreemId(creemSubscriptionId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("subscriptions")
    .select(
      "id, status, current_period_start, current_period_end, cancel_at_period_end, plan_id, trial, creem_customer_id, drips_granted, next_drip_at, metadata"
    )
    .eq("creem_subscription_id", creemSubscriptionId)
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
        creemCustomerId: data.creem_customer_id as string | null,
        dripsGranted: Number(data.drips_granted ?? 0),
        nextDripAt: data.next_drip_at as string | null,
        metadata: data.metadata as Record<string, unknown>,
      }
    : null;
}

async function upsertSubscription(
  userId: string,
  info: SubscriptionInfo,
  creemCustomerId: string
): Promise<{ id: string; isNew: boolean }> {
  const service = createServiceClient();

  const existing = await findSubscriptionByCreemId(info.subscriptionId);
  const plan = await getPlanByCreemProductId(info.productId);
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
        creem_customer_id: creemCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error)
      throw new Error(`Failed to update subscription: ${error.message}`);
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
      creem_subscription_id: info.subscriptionId,
      creem_customer_id: creemCustomerId,
      // Dripped (annual) plans get their first grant immediately and the
      // rest from the drip scheduler.
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
  status: string | undefined
): "active" | "cancelled" | "expired" | "past_due" {
  switch (status) {
    case "active":
    case "trialing":
    case "scheduled_cancel":
    case "paused":
      return "active";
    case "canceled":
      return "cancelled";
    case "expired":
      return "expired";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      return "active";
  }
}

function toSubscriptionInfo(
  subscription: CreemSubscriptionObject
): SubscriptionInfo {
  const now = new Date().toISOString();
  const status = subscription.status ?? "active";
  const ended =
    subscription.canceled_at &&
    (status === "canceled" || status === "expired")
      ? subscription.canceled_at
      : null;
  return {
    subscriptionId: subscription.id ?? "",
    productId: refId(subscription.product) ?? "",
    currentPeriodStart:
      subscription.current_period_start_date ?? subscription.created_at ?? now,
    currentPeriodEnd:
      subscription.current_period_end_date ??
      subscription.current_period_start_date ??
      now,
    currency: "USD",
    isTrial: status === "trialing",
    status,
    cancelAtPeriodEnd: status === "scheduled_cancel",
    createdAt: subscription.created_at ?? now,
    endedAt: ended,
    metadata: subscription.metadata ?? {},
  };
}

/** Loads the subscription entity when the checkout only carries its id. */
async function buildSubscriptionInfoFromCheckout(
  checkout: CreemCheckoutObject
): Promise<SubscriptionInfo | null> {
  const embedded = checkout.subscription;
  if (embedded && typeof embedded === "object") {
    return toSubscriptionInfo(embedded as CreemSubscriptionObject);
  }

  const subscriptionId = refId(embedded);
  if (!subscriptionId) return null;

  // Prefer the local record (a subscription.* event may have landed first).
  const local = await findSubscriptionByCreemId(subscriptionId);
  if (local?.planId) {
    const plan = await getPlanById(local.planId);
    if (plan?.creem_product_id && local.currentPeriodEnd) {
      return {
        subscriptionId,
        productId: plan.creem_product_id,
        currentPeriodStart: local.currentPeriodStart ?? new Date().toISOString(),
        currentPeriodEnd: local.currentPeriodEnd,
        currency: "USD",
        isTrial: local.trial,
        status: local.status,
        cancelAtPeriodEnd: local.cancelAtPeriodEnd,
        createdAt: new Date().toISOString(),
        endedAt: null,
        metadata: local.metadata,
      };
    }
  }

  try {
    const remote = (await getCreemSubscription(
      subscriptionId
    )) as CreemSubscriptionObject;
    return toSubscriptionInfo(remote);
  } catch (err) {
    console.error(
      `[buildSubscriptionInfoFromCheckout] failed to fetch ${subscriptionId}:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

async function ensureCreditsForBillingPeriod(
  userId: string,
  plan: PlanRow,
  creemSubscriptionId: string | undefined,
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
        ...(creemSubscriptionId
          ? { subscription_id: creemSubscriptionId }
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

const ATTRIBUTION_KEYS = [
  "experiment_key",
  "variant_key",
  "ladder_stage",
  "growsurf_participant_id",
  "campaign_id",
  "campaign_variant",
  "campaign_step",
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

async function ensureInvoiceForSubscriptionPeriod(
  userId: string,
  plan: PlanRow | null,
  info: SubscriptionInfo,
  orderId: string | null,
  checkoutId: string | null,
  amountCents: number,
  currency: string
) {
  const service = createServiceClient();
  const currentPeriodEnd = info.currentPeriodEnd;

  const invoice = await findInvoiceByPeriod(info.subscriptionId, currentPeriodEnd);
  if (invoice) {
    if (orderId && !invoice.creemOrderId) {
      await service
        .from("invoices")
        .update({
          plan_id: plan?.id,
          amount_cents: amountCents,
          status: "paid",
          creem_order_id: orderId,
          creem_checkout_id: checkoutId,
          metadata: {
            current_period_end: currentPeriodEnd,
            ...pickAttributionMetadata(info.metadata),
          },
        })
        .eq("id", invoice.id);
    }
    return invoice.id;
  }

  const dbSubscription = await findSubscriptionByCreemId(info.subscriptionId);

  const { data, error } = await service
    .from("invoices")
    .insert({
      user_id: userId,
      plan_id: plan?.id,
      subscription_id: dbSubscription?.id,
      amount_cents: amountCents,
      currency,
      status: "paid",
      creem_order_id: orderId,
      creem_checkout_id: checkoutId,
      creem_subscription_id: info.subscriptionId,
      metadata: {
        current_period_end: currentPeriodEnd,
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

/** Grants + conversion + referral for one billing event on a subscription. */
async function fulfillSubscriptionCharge(input: {
  mapping: UserMapping;
  info: SubscriptionInfo;
  orderId: string | null;
  checkoutId: string | null;
  amountCents: number;
  currency: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const { mapping, info, orderId, checkoutId, amountCents, currency, metadata } =
    input;

  const { id: subscriptionRowId } = await upsertSubscription(
    mapping.userId,
    info,
    mapping.customerId
  );

  const plan = await getPlanByCreemProductId(info.productId);
  if (!plan) {
    console.error(
      `[fulfillSubscriptionCharge] no plan for creem product ${info.productId}`
    );
    return;
  }

  const invoiceId = await ensureInvoiceForSubscriptionPeriod(
    mapping.userId,
    plan,
    info,
    orderId,
    checkoutId,
    info.isTrial ? 0 : amountCents,
    currency
  );

  await recordOfferConversion(
    mapping.userId,
    metadata,
    orderId ?? `subscription:${info.subscriptionId}:${info.currentPeriodEnd}`,
    amountCents
  );

  try {
    await awardOrHoldReferrerShare({
      buyerUserId: mapping.userId,
      plan,
      orderId: orderId ?? `${info.subscriptionId}:${info.currentPeriodEnd}`,
    });
  } catch (err) {
    console.error(
      "[fulfillSubscriptionCharge] referral reward failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (plan.credit_drip_months > 1) {
    // Annual plans: credits arrive via the monthly drip; drip 1 is granted
    // at subscription creation by the subscription.* handler.
    const sub = await findSubscriptionByCreemId(info.subscriptionId);
    if (sub && sub.dripsGranted === 0) {
      await initializeSubscriptionDrip({
        subscriptionRowId,
        userId: mapping.userId,
        plan,
        providerSubscriptionId: info.subscriptionId,
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
    amountCents
  );

  const service = createServiceClient();
  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoiceId);

  console.log(
    `[fulfillSubscriptionCharge] granted ${plan.credits_grant} credits to user ${mapping.userId} for period ${info.currentPeriodEnd}`
  );
}

/**
 * checkout.completed — covers one-time products AND the first charge of a
 * recurring order (order.type 'recurring' + embedded/linked subscription).
 */
export async function fulfillCreemCheckoutCompleted(
  checkout: CreemCheckoutObject
): Promise<void> {
  console.log(`[fulfillCreemCheckoutCompleted] checkout ${checkout.id}`);

  const order = checkout.order;
  if (!order?.id) {
    console.error("[fulfillCreemCheckoutCompleted] checkout has no order");
    return;
  }

  const customerId = refId(checkout.customer) ?? refId(order.customer);
  const customerEmail = refEmail(checkout.customer);
  const metadata = checkout.metadata ?? {};

  const mapping = await resolveUser(customerId, customerEmail, metadata);
  if (!mapping) {
    console.error(
      `[fulfillCreemCheckoutCompleted] could not resolve user for checkout ${checkout.id}`
    );
    return;
  }
  if (customerId) await recordCustomer(mapping.userId, customerId);

  const productId = refId(order.product) ?? refId(checkout.product);
  const amountCents = Number(order.amount_paid ?? order.amount ?? 0);
  const currency = order.currency ?? "USD";

  if (order.type === "recurring" || checkout.subscription) {
    const info = await buildSubscriptionInfoFromCheckout(checkout);
    if (!info) {
      console.error(
        `[fulfillCreemCheckoutCompleted] could not build subscription info for checkout ${checkout.id}; will retry on subscription event`
      );
      return;
    }
    // First subscription payment — but product/plan identity should come
    // from the subscription entity, not the checkout product.
    if (productId && !info.productId) info.productId = productId;
    await fulfillSubscriptionCharge({
      mapping,
      info,
      orderId: order.id,
      checkoutId: checkout.id ?? null,
      amountCents,
      currency,
      metadata,
    });
    return;
  }

  // One-time purchase.
  if (!productId) {
    console.error("[fulfillCreemCheckoutCompleted] no product on order");
    return;
  }
  const plan = await getPlanByCreemProductId(productId);
  if (!plan) {
    console.error(
      `[fulfillCreemCheckoutCompleted] no plan for creem product ${productId}`
    );
    return;
  }

  if (await findInvoiceByOrderId(order.id)) {
    console.log("[fulfillCreemCheckoutCompleted] already processed");
    return;
  }

  const service = createServiceClient();
  const { data: invoice, error: invoiceError } = await service
    .from("invoices")
    .insert({
      user_id: mapping.userId,
      plan_id: plan.id,
      amount_cents: amountCents,
      currency,
      status: "paid",
      creem_order_id: order.id,
      creem_checkout_id: checkout.id ?? null,
      metadata,
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
    `purchase:order:${order.id}`,
    amountCents
  );

  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoice.id);

  await recordOfferConversion(mapping.userId, metadata, order.id, amountCents);

  try {
    await awardOrHoldReferrerShare({
      buyerUserId: mapping.userId,
      plan,
      orderId: order.id,
    });
  } catch (err) {
    console.error(
      "[fulfillCreemCheckoutCompleted] referral reward failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log(
    `[fulfillCreemCheckoutCompleted] granted credits to user ${mapping.userId} for order ${order.id}`
  );
}

/**
 * subscription.paid — a subscription charge succeeded (first charge AND
 * renewals). Shares the `subscription:{id}:{periodEnd}` idempotency key
 * with the checkout.completed path, so double coverage of the first
 * period can't double-grant.
 */
export async function fulfillCreemSubscriptionPaid(
  subscription: CreemSubscriptionObject
): Promise<void> {
  console.log(
    `[fulfillCreemSubscriptionPaid] subscription ${subscription.id} status ${subscription.status}`
  );

  const customerId = refId(subscription.customer);
  const mapping = await resolveUser(
    customerId,
    refEmail(subscription.customer),
    subscription.metadata ?? {}
  );
  if (!mapping) {
    console.error(
      `[fulfillCreemSubscriptionPaid] could not resolve user for subscription ${subscription.id}`
    );
    return;
  }
  if (customerId) await recordCustomer(mapping.userId, customerId);

  const info = toSubscriptionInfo(subscription);
  if (!info.subscriptionId || !info.productId) {
    console.error(
      `[fulfillCreemSubscriptionPaid] subscription ${subscription.id} missing id/product`
    );
    return;
  }

  const plan = await getPlanByCreemProductId(info.productId);
  await fulfillSubscriptionCharge({
    mapping,
    info,
    orderId: null,
    checkoutId: null,
    amountCents: plan?.price_cents ?? 0,
    currency: "USD",
    metadata: subscription.metadata ?? {},
  });
}

/**
 * subscription.active / trialing / update / scheduled_cancel — keep the
 * local row in sync; credit grants happen on subscription.paid.
 */
export async function fulfillCreemSubscriptionEvent(
  subscription: CreemSubscriptionObject
): Promise<void> {
  console.log(
    `[fulfillCreemSubscriptionEvent] subscription ${subscription.id} status ${subscription.status}`
  );

  const customerId = refId(subscription.customer);
  const mapping = await resolveUser(
    customerId,
    refEmail(subscription.customer),
    subscription.metadata ?? {}
  );
  if (!mapping) {
    console.error(
      `[fulfillCreemSubscriptionEvent] could not resolve user for subscription ${subscription.id}`
    );
    return;
  }
  if (customerId) await recordCustomer(mapping.userId, customerId);

  const info = toSubscriptionInfo(subscription);
  if (!info.subscriptionId) return;

  const { id: subscriptionRowId } = await upsertSubscription(
    mapping.userId,
    info,
    mapping.customerId
  );

  if (info.status !== "active" && info.status !== "trialing") return;

  // Dropped credit schedules need drip 1 here too: when the product is
  // dripped (annual), subscription.paid skips the per-period grant and the
  // drip init runs once, guarded by drips_granted.
  const plan = await getPlanByCreemProductId(info.productId);
  if (plan && plan.credit_drip_months > 1) {
    const sub = await findSubscriptionByCreemId(info.subscriptionId);
    if (sub && sub.dripsGranted === 0) {
      const invoiceId = await ensureInvoiceForSubscriptionPeriod(
        mapping.userId,
        plan,
        info,
        null,
        null,
        0,
        "USD"
      );
      await initializeSubscriptionDrip({
        subscriptionRowId,
        userId: mapping.userId,
        plan,
        providerSubscriptionId: info.subscriptionId,
        periodStart: info.currentPeriodStart,
        invoiceId,
      });
    }
  }
}

export async function markCreemSubscriptionPastDue(
  creemSubscriptionId: string
): Promise<void> {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("creem_subscription_id", creemSubscriptionId);
}

export async function markCreemSubscriptionCancelled(
  creemSubscriptionId: string,
  status: "cancelled" | "expired" = "cancelled"
): Promise<void> {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({
      status,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("creem_subscription_id", creemSubscriptionId);
}
