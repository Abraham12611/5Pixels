"use server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  bachsPlanKeyForProductId,
  decimalToCents,
} from "./bachs-client";
import { initializeSubscriptionDrip } from "./drip";
import { recordOfferConversion } from "@/lib/offers/conversions";
import { awardOrHoldReferrerShare } from "@/lib/growsurf/sync";

/**
 * Bachs fulfillment — mirrors fulfillment-whop.ts against Bachs webhook
 * payloads (docs.bachs.io/guides/webhooks).
 *
 * Event model differences vs Whop:
 * - collection.succeeded carries the charge for BOTH one-time packs and
 *   the first subscription charge; product_cart/product ids + metadata
 *   distinguish them. It is the grant authority for one-time purchases.
 * - A Bachs *subscription* (sub_*) is the subscription analogue;
 *   customer.subscription.* events carry the full object including
 *   current_period_* — no second API fetch needed.
 * - invoice.paid is the grant authority for subscription periods (first
 *   period and every renewal). Credits grant once per
 *   (subscription, period_end) so collection.succeeded + invoice.paid +
 *   subscription.created covering the same first period can never
 *   double-grant.
 * - refunds/disputes link back via the charge id (ch_*).
 */

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  credits_grant: number;
  price_cents: number;
  interval: string;
  credit_drip_months: number;
  bachs_product_id: string | null;
}

interface UserMapping {
  userId: string;
  bachsCustomerId: string;
}

export interface BachsCollectionObject {
  charge_id?: string | null;
  checkout_id?: string | null;
  reference?: string | null;
  status?: string;
  amount?: string;
  currency?: string;
  product_cart?: { product_id?: string; quantity?: number }[] | null;
  customer?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface BachsSubscriptionObject {
  subscription_id?: string;
  customer?: {
    customer_id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  product_id?: string;
  status?: string;
  currency?: string;
  amount?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_billed_at?: string | null;
  trial_end?: string | null;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

export interface BachsInvoiceObject {
  invoice_id?: string;
  subscription?: { subscription_id?: string | null } | string | null;
  customer?: {
    customer_id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
  charge?: string | { id?: string | null } | null;
  status?: string;
  currency?: string;
  total?: string;
  amount_paid?: string;
  period_start?: string | null;
  period_end?: string | null;
  metadata?: Record<string, unknown>;
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

/** Bachs nests ids as {…_id} objects or bare strings depending on payload. */
function nestedId(v: unknown, key: string): string | null {
  if (typeof v === "string" && v) return v;
  if (v && typeof v === "object") {
    const id = (v as Record<string, unknown>)[key] ?? (v as { id?: unknown }).id;
    if (typeof id === "string" && id) return id;
  }
  return null;
}

function customerId(v: unknown): string | null {
  return nestedId(v, "customer_id");
}

function customerEmail(v: unknown): string | null {
  if (v && typeof v === "object") {
    const email = (v as { email?: unknown }).email;
    if (typeof email === "string" && email) return email;
  }
  return null;
}

async function resolveUser(
  bachsCustomerId: string | null,
  userEmail: string | null,
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
        bachsCustomerId: bachsCustomerId ?? "",
      };
    }
  }

  if (bachsCustomerId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("bachs_customer_id", bachsCustomerId)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, bachsCustomerId };
    }
  }

  if (userEmail) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();
    if (profile) {
      return {
        userId: profile.id as string,
        bachsCustomerId: bachsCustomerId ?? "",
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
    interval: (data.interval as string) ?? "one_time",
    credit_drip_months: Number(data.credit_drip_months ?? 1),
    bachs_product_id:
      (meta.bachs_product_id as string | undefined) ??
      (meta.bachs_product_id_sandbox as string | undefined) ??
      (meta.bachs_product_id_live as string | undefined) ??
      null,
  };
}

const PLAN_SELECT =
  "id, slug, name, type, credits_grant, price_cents, interval, credit_drip_months, metadata";

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

async function getPlanByBachsProductId(
  bachsProductId: string
): Promise<PlanRow | null> {
  const service = createServiceClient();
  // Plans are few — client-side match across all three metadata keys is
  // simpler than a multi-column .or() and picks the id regardless of which
  // environment scoped it.
  const { data, error } = await service.from("plans").select(PLAN_SELECT);
  if (error) {
    console.error(`[getPlanByBachsProductId] query failed: ${error.message}`);
    return null;
  }

  const match = (data ?? []).find((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return (
      meta.bachs_product_id === bachsProductId ||
      meta.bachs_product_id_sandbox === bachsProductId ||
      meta.bachs_product_id_live === bachsProductId
    );
  }) ?? (() => {
    // Env-var override path: BACHS_PRODUCT_ID_OVERRIDES keys a plan slug/id
    // to a product id that may not appear in plans.metadata.
    const key = bachsPlanKeyForProductId(bachsProductId);
    if (!key) return undefined;
    return (data ?? []).find((row) => row.slug === key || row.id === key);
  })();

  if (!match) {
    console.error(
      `[getPlanByBachsProductId] no plan for bachs product ${bachsProductId}`
    );
    return null;
  }
  return { ...toPlanRow(match), bachs_product_id: bachsProductId };
}

async function recordCustomer(userId: string, bachsCustomerId: string) {
  if (!bachsCustomerId) return;
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ bachs_customer_id: bachsCustomerId })
    .eq("id", userId)
    .is("bachs_customer_id", null);
  if (error) {
    console.error(`[recordCustomer] failed: ${error.message}`);
  }
}

async function findInvoiceByChargeId(bachsChargeId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, bachs_charge_id, bachs_subscription_id, metadata")
    .eq("bachs_charge_id", bachsChargeId)
    .maybeSingle();
  return data ? { id: data.id as string } : null;
}

async function findInvoiceByBachsInvoiceId(bachsInvoiceId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, amount_cents, bachs_charge_id, bachs_subscription_id")
    .eq("bachs_invoice_id", bachsInvoiceId)
    .maybeSingle();
  return data
    ? { id: data.id as string, chargeId: data.bachs_charge_id as string | null }
    : null;
}

async function findInvoiceByPeriod(
  bachsSubscriptionId: string,
  currentPeriodEnd: string
) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, amount_cents, bachs_charge_id, bachs_subscription_id, metadata")
    .eq("bachs_subscription_id", bachsSubscriptionId)
    .filter("metadata->>current_period_end", "eq", currentPeriodEnd)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        amountCents: Number(data.amount_cents),
        chargeId: data.bachs_charge_id as string | null,
      }
    : null;
}

async function findSubscriptionByBachsId(bachsSubscriptionId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("subscriptions")
    .select(
      "id, user_id, status, current_period_start, current_period_end, cancel_at_period_end, plan_id, trial, bachs_customer_id, drips_granted, next_drip_at, metadata"
    )
    .eq("bachs_subscription_id", bachsSubscriptionId)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        userId: data.user_id as string,
        status: data.status as string,
        currentPeriodStart: data.current_period_start as string | null,
        currentPeriodEnd: data.current_period_end as string | null,
        cancelAtPeriodEnd: data.cancel_at_period_end as boolean,
        planId: data.plan_id as string,
        trial: data.trial as boolean,
        bachsCustomerId: data.bachs_customer_id as string | null,
        dripsGranted: Number(data.drips_granted ?? 0),
        nextDripAt: data.next_drip_at as string | null,
        metadata: data.metadata as Record<string, unknown>,
      }
    : null;
}

function mapSubscriptionStatus(
  status: string | undefined
): "active" | "cancelled" | "expired" | "past_due" {
  switch (status) {
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "expired":
    case "completed":
      return "expired";
    case "past_due":
    case "in_recovery":
    case "unpaid":
    case "incomplete":
      return "past_due";
    default:
      return "active";
  }
}

async function upsertSubscription(
  userId: string,
  info: SubscriptionInfo,
  bachsCustomerId: string
): Promise<{ id: string; isNew: boolean }> {
  const service = createServiceClient();

  const existing = await findSubscriptionByBachsId(info.subscriptionId);
  const plan = await getPlanByBachsProductId(info.productId);
  const planId = plan?.id;
  const status = mapSubscriptionStatus(info.status);

  if (existing) {
    const { error } = await service
      .from("subscriptions")
      .update({
        user_id: userId,
        plan_id: planId ?? undefined,
        status,
        current_period_start: info.currentPeriodStart,
        current_period_end: info.currentPeriodEnd,
        cancel_at_period_end: info.cancelAtPeriodEnd,
        trial: info.isTrial,
        ended_at: info.endedAt,
        bachs_customer_id: bachsCustomerId || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error)
      throw new Error(`Failed to update subscription: ${error.message}`);
    return { id: existing.id, isNew: false };
  }

  if (!planId) {
    throw new Error(
      `Cannot insert subscription: no plan for bachs product ${info.productId}`
    );
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
      bachs_subscription_id: info.subscriptionId,
      bachs_customer_id: bachsCustomerId || null,
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

function toSubscriptionInfo(
  subscription: BachsSubscriptionObject
): SubscriptionInfo {
  const now = new Date().toISOString();
  const status = subscription.status ?? "active";
  const ended =
    subscription.canceled_at &&
    ["canceled", "cancelled", "expired", "completed"].includes(status)
      ? subscription.canceled_at
      : null;
  return {
    subscriptionId: subscription.subscription_id ?? "",
    productId: subscription.product_id ?? "",
    currentPeriodStart:
      subscription.current_period_start ?? subscription.created_at ?? now,
    currentPeriodEnd: subscription.current_period_end ?? now,
    currency: (subscription.currency ?? "USD").toUpperCase(),
    isTrial: Boolean(subscription.trial_end) || status === "trialing",
    status,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    createdAt: subscription.created_at ?? now,
    endedAt: ended,
    metadata: subscription.metadata ?? {},
  };
}

async function ensureCreditsForBillingPeriod(
  userId: string,
  plan: PlanRow,
  bachsSubscriptionId: string | undefined,
  invoiceId: string,
  idempotencyKey: string
) {
  const service = createServiceClient();
  // Fixed packs: the configured grant is authoritative; subscriptions and
  // weekly passes likewise grant the plan's configured credits.
  const credits = plan.credits_grant;

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
        ...(bachsSubscriptionId
          ? { subscription_id: bachsSubscriptionId }
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

async function ensureInvoiceForSubscriptionPeriod(input: {
  userId: string;
  plan: PlanRow | null;
  bachsSubscriptionId: string;
  bachsInvoiceId: string | null;
  chargeId: string | null;
  currentPeriodEnd: string;
  amountCents: number;
  currency: string;
  metadata: Record<string, unknown>;
}) {
  const {
    userId,
    plan,
    bachsSubscriptionId,
    bachsInvoiceId,
    chargeId,
    currentPeriodEnd,
    amountCents,
    currency,
    metadata,
  } = input;
  const service = createServiceClient();

  const invoice =
    (bachsInvoiceId ? await findInvoiceByBachsInvoiceId(bachsInvoiceId) : null) ??
    (await findInvoiceByPeriod(bachsSubscriptionId, currentPeriodEnd));
  if (invoice) {
    if (chargeId && !invoice.chargeId) {
      await service
        .from("invoices")
        .update({
          plan_id: plan?.id,
          amount_cents: amountCents,
          status: "paid",
          bachs_charge_id: chargeId,
          bachs_invoice_id: bachsInvoiceId ?? undefined,
          metadata: {
            current_period_end: currentPeriodEnd,
            ...pickAttributionMetadata(metadata),
          },
        })
        .eq("id", invoice.id);
    }
    return invoice.id;
  }

  const dbSubscription = await findSubscriptionByBachsId(bachsSubscriptionId);

  const { data, error } = await service
    .from("invoices")
    .insert({
      user_id: userId,
      plan_id: plan?.id,
      subscription_id: dbSubscription?.id,
      amount_cents: amountCents,
      currency,
      status: "paid",
      bachs_charge_id: chargeId,
      bachs_invoice_id: bachsInvoiceId,
      bachs_subscription_id: bachsSubscriptionId,
      metadata: {
        current_period_end: currentPeriodEnd,
        ...pickAttributionMetadata(metadata),
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
  bachsInvoiceId: string | null;
  chargeId: string | null;
  amountCents: number;
  currency: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const {
    mapping,
    info,
    bachsInvoiceId,
    chargeId,
    amountCents,
    currency,
    metadata,
  } = input;

  const plan =
    (typeof metadata.plan_id === "string"
      ? await getPlanById(metadata.plan_id)
      : null) ?? (await getPlanByBachsProductId(info.productId));
  if (!plan) {
    console.error(
      `[fulfillSubscriptionCharge] no plan for bachs product ${info.productId}`
    );
    return;
  }

  // info.productId can be empty on renewal invoices (the invoice object
  // has no product field); backfill it from the resolved plan so the
  // subscription upsert below can key the plan.
  if (!info.productId && plan.bachs_product_id) {
    info.productId = plan.bachs_product_id;
  }

  const { id: subscriptionRowId } = await upsertSubscription(
    mapping.userId,
    info,
    mapping.bachsCustomerId
  );

  const invoiceId = await ensureInvoiceForSubscriptionPeriod({
    userId: mapping.userId,
    plan,
    bachsSubscriptionId: info.subscriptionId,
    bachsInvoiceId,
    chargeId,
    currentPeriodEnd: info.currentPeriodEnd,
    amountCents: info.isTrial ? 0 : amountCents,
    currency,
    metadata,
  });

  await recordOfferConversion(
    mapping.userId,
    metadata,
    chargeId ?? `subscription:${info.subscriptionId}:${info.currentPeriodEnd}`,
    amountCents
  );

  try {
    await awardOrHoldReferrerShare({
      buyerUserId: mapping.userId,
      plan,
      orderId: chargeId ?? `${info.subscriptionId}:${info.currentPeriodEnd}`,
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
    const sub = await findSubscriptionByBachsId(info.subscriptionId);
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
    idempotencyKey
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
 * collection.succeeded — covers one-time credit packs/weekly passes AND
 * the first charge of a subscription checkout. product_cart/metadata
 * distinguish them: a subscription product defers credit grants to
 * invoice.paid (keyed per period), so the same first period can never
 * double-grant.
 */
export async function fulfillBachsCollectionSucceeded(
  collection: BachsCollectionObject
): Promise<void> {
  console.log(
    `[fulfillBachsCollectionSucceeded] charge ${collection.charge_id} checkout ${collection.checkout_id}`
  );

  const metadata = collection.metadata ?? {};
  const bachsCustomerId = customerId(collection.customer);
  const userEmail = customerEmail(collection.customer);

  const mapping = await resolveUser(bachsCustomerId, userEmail, metadata);
  if (!mapping) {
    console.error(
      `[fulfillBachsCollectionSucceeded] could not resolve user for charge ${collection.charge_id}`
    );
    return;
  }
  if (bachsCustomerId) await recordCustomer(mapping.userId, bachsCustomerId);

  const productId =
    collection.product_cart?.find((item) => item.product_id)?.product_id ??
    null;
  const plan =
    (typeof metadata.plan_id === "string"
      ? await getPlanById(metadata.plan_id)
      : null) ??
    (productId ? await getPlanByBachsProductId(productId) : null);
  if (!plan) {
    console.error(
      `[fulfillBachsCollectionSucceeded] no plan for bachs product ${productId}`
    );
    return;
  }

  if (plan.interval !== "one_time" && plan.type !== "extra_credit") {
    // Recurring product — subscription.created/invoice.paid own this
    // period's subscription row and credit grant.
    console.log(
      `[fulfillBachsCollectionSucceeded] recurring charge ${collection.charge_id}; deferring to invoice.paid`
    );
    return;
  }

  if (!collection.charge_id) {
    console.error(
      "[fulfillBachsCollectionSucceeded] one-time charge has no charge_id"
    );
    return;
  }
  const chargeId = collection.charge_id;

  if (await findInvoiceByChargeId(chargeId)) {
    console.log("[fulfillBachsCollectionSucceeded] already processed");
    return;
  }

  const amountCents = decimalToCents(collection.amount);
  const currency = (collection.currency ?? "USD").toUpperCase();

  const service = createServiceClient();
  const { data: invoice, error: invoiceError } = await service
    .from("invoices")
    .insert({
      user_id: mapping.userId,
      plan_id: plan.id,
      amount_cents: amountCents,
      currency,
      status: "paid",
      bachs_charge_id: chargeId,
      bachs_checkout_id: collection.checkout_id ?? null,
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
    `purchase:charge:${chargeId}`
  );

  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoice.id);

  await recordOfferConversion(mapping.userId, metadata, chargeId, amountCents);

  try {
    await awardOrHoldReferrerShare({
      buyerUserId: mapping.userId,
      plan,
      orderId: chargeId,
    });
  } catch (err) {
    console.error(
      "[fulfillBachsCollectionSucceeded] referral reward failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log(
    `[fulfillBachsCollectionSucceeded] granted credits to user ${mapping.userId} for charge ${chargeId}`
  );
}

/**
 * customer.subscription.created / updated — keep the local row in sync;
 * credit grants happen on invoice.paid (or drip init here for annual
 * plans).
 */
export async function fulfillBachsSubscriptionEvent(
  subscription: BachsSubscriptionObject
): Promise<void> {
  console.log(
    `[fulfillBachsSubscriptionEvent] subscription ${subscription.subscription_id} status ${subscription.status}`
  );

  const bachsCustomerId = customerId(subscription.customer);
  const mapping = await resolveUser(
    bachsCustomerId,
    customerEmail(subscription.customer),
    subscription.metadata ?? {}
  );
  if (!mapping) {
    console.error(
      `[fulfillBachsSubscriptionEvent] could not resolve user for subscription ${subscription.subscription_id}`
    );
    return;
  }
  if (bachsCustomerId) await recordCustomer(mapping.userId, bachsCustomerId);

  const info = toSubscriptionInfo(subscription);
  if (!info.subscriptionId) return;

  const { id: subscriptionRowId } = await upsertSubscription(
    mapping.userId,
    info,
    mapping.bachsCustomerId
  );

  if (mapSubscriptionStatus(info.status) !== "active") return;

  // Dripped credit schedules need drip 1 here too: when the plan is
  // dripped (annual), invoice.paid skips the per-period grant and the
  // drip init runs once, guarded by drips_granted.
  const plan =
    (typeof info.metadata.plan_id === "string"
      ? await getPlanById(info.metadata.plan_id)
      : null) ?? (await getPlanByBachsProductId(info.productId));
  if (plan && plan.credit_drip_months > 1) {
    const sub = await findSubscriptionByBachsId(info.subscriptionId);
    if (sub && sub.dripsGranted === 0) {
      const invoiceId = await ensureInvoiceForSubscriptionPeriod({
        userId: mapping.userId,
        plan,
        bachsSubscriptionId: info.subscriptionId,
        bachsInvoiceId: null,
        chargeId: null,
        currentPeriodEnd: info.currentPeriodEnd,
        amountCents: 0,
        currency: info.currency,
        metadata: info.metadata,
      });
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

/**
 * invoice.paid — the grant authority for subscription billing periods:
 * the first period and every renewal. Idempotent on
 * `subscription:{sub}:{period_end}`.
 */
export async function fulfillBachsInvoicePaid(
  invoice: BachsInvoiceObject
): Promise<void> {
  console.log(`[fulfillBachsInvoicePaid] invoice ${invoice.invoice_id}`);

  const subscriptionId = nestedId(invoice.subscription, "subscription_id");
  if (!subscriptionId) {
    console.error(
      `[fulfillBachsInvoicePaid] invoice ${invoice.invoice_id} has no subscription`
    );
    return;
  }

  const bachsCustomerId = customerId(invoice.customer);
  const metadata = invoice.metadata ?? {};

  let mapping = await resolveUser(
    bachsCustomerId,
    customerEmail(invoice.customer),
    metadata
  );
  if (!mapping) {
    // Renewal invoices may lack metadata.user_id if the checkout metadata
    // never copied — fall back to the local subscription row's owner.
    const local = await findSubscriptionByBachsId(subscriptionId);
    if (local?.userId) {
      mapping = {
        userId: local.userId,
        bachsCustomerId: bachsCustomerId ?? local.bachsCustomerId ?? "",
      };
    }
  }
  if (!mapping) {
    console.error(
      `[fulfillBachsInvoicePaid] could not resolve user for invoice ${invoice.invoice_id}`
    );
    return;
  }
  if (bachsCustomerId) await recordCustomer(mapping.userId, bachsCustomerId);

  const chargeId = nestedId(invoice.charge, "charge_id");

  // Subscription fields may be absent on renewal invoices — prefer the
  // local row for period dates/product, falling back to the event.
  const local = await findSubscriptionByBachsId(subscriptionId);
  const localPlan = local?.planId ? await getPlanById(local.planId) : null;

  const info: SubscriptionInfo = {
    subscriptionId,
    productId: localPlan?.bachs_product_id ?? "",
    currentPeriodStart:
      invoice.period_start ?? local?.currentPeriodStart ?? new Date().toISOString(),
    currentPeriodEnd:
      invoice.period_end ?? local?.currentPeriodEnd ?? new Date().toISOString(),
    currency: (invoice.currency ?? "USD").toUpperCase(),
    isTrial: local?.trial ?? false,
    status: "active",
    cancelAtPeriodEnd: local?.cancelAtPeriodEnd ?? false,
    createdAt: local?.currentPeriodStart ?? new Date().toISOString(),
    endedAt: null,
    metadata,
  };

  await fulfillSubscriptionCharge({
    mapping,
    info,
    bachsInvoiceId: invoice.invoice_id ?? null,
    chargeId,
    amountCents: decimalToCents(invoice.amount_paid ?? invoice.total),
    currency: info.currency,
    metadata,
  });
}

export async function markBachsSubscriptionPastDue(
  bachsSubscriptionId: string
): Promise<void> {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("bachs_subscription_id", bachsSubscriptionId);
}

export async function markBachsSubscriptionCancelled(
  bachsSubscriptionId: string,
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
    .eq("bachs_subscription_id", bachsSubscriptionId);
}
