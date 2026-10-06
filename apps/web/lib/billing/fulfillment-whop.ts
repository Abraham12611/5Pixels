"use server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  whopPlanKeyForVariantId,
  getWhopMembership,
} from "./whop-client";
import { initializeSubscriptionDrip } from "./drip";
import { recordOfferConversion } from "@/lib/offers/conversions";
import { awardOrHoldReferrerShare } from "@/lib/growsurf/sync";

/**
 * Whop fulfillment — mirrors fulfillment-creem.ts against Whop webhook
 * payloads (Standard Webhooks; docs.whop.com/api-reference/webhooks).
 *
 * Event model differences vs Creem:
 * - payment.succeeded carries the charge for BOTH one-time packs and
 *   subscription charges; `billing_reason` distinguishes them
 *   ("one_time" | "subscription_create" | "subscription_cycle" | ...).
 * - A Whop *membership* is the subscription analogue (mem_*). payment
 *   payloads embed membership {id, status} only — full period dates come
 *   from the membership API or the local row.
 * - Credits grant once per (membership, renewal_period_end) so
 *   payment.succeeded + membership.activated covering the same first
 *   period can never double-grant.
 * - refunds/disputes link back via the payment id (pay_*).
 */

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  credits_grant: number;
  price_cents: number;
  credit_drip_months: number;
  whop_variant_id: string | null;
}

interface UserMapping {
  userId: string;
  whopUserId: string;
}

interface MembershipInfo {
  membershipId: string;
  variantId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  currency: string;
  isTrial: boolean;
  status: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  endedAt: string | null;
  manageUrl: string | null;
  metadata: Record<string, unknown>;
}

/** Whop embeds related resources as {id, ...} objects (never bare ids). */
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

/** `total`/`usd_total` are dollar floats (e.g. 6.9); we store cents. */
function dollarsToCents(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export interface WhopPaymentObject {
  id?: string;
  billing_reason?: string;
  status?: string;
  substatus?: string;
  total?: number;
  subtotal?: number;
  usd_total?: number;
  currency?: string;
  plan?: { id?: string; metadata?: Record<string, unknown> } | null;
  product?: { id?: string; metadata?: Record<string, unknown> } | null;
  membership?: { id?: string; status?: string } | null;
  user?: { id?: string; email?: string; name?: string; username?: string } | null;
  member?: { id?: string } | null;
  checkout_configuration_id?: string | null;
  metadata?: Record<string, unknown>;
  recovery_url?: string | null;
  failure_message?: string | null;
  decline_code?: string | null;
  paid_at?: string | null;
  created_at?: string;
}

export interface WhopMembershipObject {
  id?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  cancelation_status?: string | null;
  canceled_at?: string | null;
  renewal_period_start?: string | null;
  renewal_period_end?: string | null;
  plan?: { id?: string; metadata?: Record<string, unknown> } | null;
  product?: { id?: string; metadata?: Record<string, unknown> } | null;
  user?: { id?: string; email?: string; name?: string; username?: string } | null;
  member?: { id?: string } | null;
  metadata?: Record<string, unknown>;
  manage_url?: string | null;
  currency?: string | null;
  created_at?: string;
  expires_at?: string | null;
}

function creditCostToCredits(plan: PlanRow, amountCents: number): number {
  if (plan.type === "extra_credit") {
    // Fixed packs: the configured grant is authoritative; fall back to
    // 1 credit per cent for legacy variable-price rows.
    return plan.credits_grant > 0
      ? plan.credits_grant
      : Math.max(0, Math.floor(amountCents));
  }
  return plan.credits_grant;
}

async function resolveUser(
  whopUserId: string | null,
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
        whopUserId: whopUserId ?? "",
      };
    }
  }

  if (whopUserId) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("whop_user_id", whopUserId)
      .maybeSingle();
    if (profile) {
      return { userId: profile.id as string, whopUserId };
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
        whopUserId: whopUserId ?? "",
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
    whop_variant_id:
      (meta.whop_variant_id as string | undefined) ??
      (meta.whop_variant_id_sandbox as string | undefined) ??
      (meta.whop_variant_id_live as string | undefined) ??
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

async function getPlanByWhopVariantId(
  whopVariantId: string
): Promise<PlanRow | null> {
  const service = createServiceClient();
  // Plans are few — client-side match across all three metadata keys is
  // simpler than a multi-column .or() and picks the id regardless of which
  // environment scoped it.
  const { data, error } = await service.from("plans").select(PLAN_SELECT);
  if (error) {
    console.error(`[getPlanByWhopVariantId] query failed: ${error.message}`);
    return null;
  }

  const match = (data ?? []).find((row) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return (
      meta.whop_variant_id === whopVariantId ||
      meta.whop_variant_id_sandbox === whopVariantId ||
      meta.whop_variant_id_live === whopVariantId
    );
  }) ?? (() => {
    // Env-var override path: WHOP_VARIANT_ID_OVERRIDES keys a plan slug/id
    // to a variant id that may not appear in plans.metadata.
    const key = whopPlanKeyForVariantId(whopVariantId);
    if (!key) return undefined;
    return (data ?? []).find((row) => row.slug === key || row.id === key);
  })();

  if (!match) {
    console.error(
      `[getPlanByWhopVariantId] no plan for whop variant ${whopVariantId}`
    );
    return null;
  }
  return { ...toPlanRow(match), whop_variant_id: whopVariantId };
}

async function recordCustomer(userId: string, whopUserId: string) {
  if (!whopUserId) return;
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ whop_user_id: whopUserId })
    .eq("id", userId)
    .is("whop_user_id", null);
  if (error) {
    console.error(`[recordCustomer] failed: ${error.message}`);
  }
}

async function findInvoiceByPaymentId(whopPaymentId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, whop_payment_id, whop_membership_id, metadata")
    .eq("whop_payment_id", whopPaymentId)
    .maybeSingle();
  return data ? { id: data.id as string } : null;
}

async function findInvoiceByPeriod(
  whopMembershipId: string,
  currentPeriodEnd: string
) {
  const service = createServiceClient();
  const { data } = await service
    .from("invoices")
    .select("id, amount_cents, whop_payment_id, whop_membership_id, metadata")
    .eq("whop_membership_id", whopMembershipId)
    .filter("metadata->>current_period_end", "eq", currentPeriodEnd)
    .maybeSingle();
  return data
    ? {
        id: data.id as string,
        amountCents: Number(data.amount_cents),
        whopPaymentId: data.whop_payment_id as string | null,
        currentPeriodEnd: (data.metadata as { current_period_end?: string })
          ?.current_period_end,
      }
    : null;
}

async function findSubscriptionByWhopId(whopMembershipId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("subscriptions")
    .select(
      "id, status, current_period_start, current_period_end, cancel_at_period_end, plan_id, trial, whop_user_id, drips_granted, next_drip_at, metadata"
    )
    .eq("whop_membership_id", whopMembershipId)
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
        whopUserId: data.whop_user_id as string | null,
        dripsGranted: Number(data.drips_granted ?? 0),
        nextDripAt: data.next_drip_at as string | null,
        metadata: data.metadata as Record<string, unknown>,
      }
    : null;
}

async function upsertSubscription(
  userId: string,
  info: MembershipInfo,
  whopUserId: string
): Promise<{ id: string; isNew: boolean }> {
  const service = createServiceClient();

  const existing = await findSubscriptionByWhopId(info.membershipId);
  const plan = await getPlanByWhopVariantId(info.variantId);
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
        whop_user_id: whopUserId || undefined,
        whop_manage_url: info.manageUrl ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error)
      throw new Error(`Failed to update subscription: ${error.message}`);
    return { id: existing.id, isNew: false };
  }

  if (!planId) {
    throw new Error(
      `Cannot insert subscription: no plan for whop variant ${info.variantId}`
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
      whop_membership_id: info.membershipId,
      whop_user_id: whopUserId || null,
      whop_manage_url: info.manageUrl,
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
    case "canceling":
      return "active";
    case "canceled":
      return "cancelled";
    case "expired":
    case "completed":
      return "expired";
    case "past_due":
    case "unresolved":
      return "past_due";
    default:
      return "active";
  }
}

function toMembershipInfo(
  membership: WhopMembershipObject
): MembershipInfo {
  const now = new Date().toISOString();
  const status = membership.status ?? "active";
  const ended =
    membership.canceled_at &&
    ["canceled", "expired", "completed"].includes(status)
      ? membership.canceled_at
      : (membership.expires_at &&
            ["expired", "completed"].includes(status)
          ? membership.expires_at
          : null);
  return {
    membershipId: membership.id ?? "",
    variantId: refId(membership.plan) ?? "",
    currentPeriodStart:
      membership.renewal_period_start ?? membership.created_at ?? now,
    currentPeriodEnd:
      membership.renewal_period_end ??
      membership.renewal_period_start ??
      membership.expires_at ??
      now,
    currency: (membership.currency ?? "usd").toUpperCase(),
    isTrial: status === "trialing",
    status,
    cancelAtPeriodEnd:
      Boolean(membership.cancel_at_period_end) ||
      status === "canceling" ||
      membership.cancelation_status === "canceling",
    createdAt: membership.created_at ?? now,
    endedAt: ended,
    manageUrl: membership.manage_url ?? null,
    metadata: membership.metadata ?? {},
  };
}

/**
 * The payment object embeds membership {id, status} only — period dates
 * come from the local subscription row or a membership API fetch.
 */
async function buildMembershipInfoFromPayment(
  payment: WhopPaymentObject
): Promise<MembershipInfo | null> {
  const membershipId = refId(payment.membership);
  if (!membershipId) return null;

  // Prefer the local record (a membership.* event may have landed first).
  const local = await findSubscriptionByWhopId(membershipId);
  if (local?.planId) {
    const plan = await getPlanById(local.planId);
    if (plan?.whop_variant_id && local.currentPeriodEnd) {
      return {
        membershipId,
        variantId: plan.whop_variant_id,
        currentPeriodStart:
          local.currentPeriodStart ?? new Date().toISOString(),
        currentPeriodEnd: local.currentPeriodEnd,
        currency: "USD",
        isTrial: local.trial,
        status: local.status,
        cancelAtPeriodEnd: local.cancelAtPeriodEnd,
        createdAt: new Date().toISOString(),
        endedAt: null,
        manageUrl: null,
        metadata: local.metadata,
      };
    }
  }

  try {
    const remote = (await getWhopMembership(
      membershipId
    )) as WhopMembershipObject;
    const info = toMembershipInfo(remote);
    if (!info.variantId) {
      info.variantId = refId(payment.plan) ?? "";
    }
    return info;
  } catch (err) {
    console.error(
      `[buildMembershipInfoFromPayment] failed to fetch ${membershipId}:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

async function ensureCreditsForBillingPeriod(
  userId: string,
  plan: PlanRow,
  whopMembershipId: string | undefined,
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
        ...(whopMembershipId
          ? { subscription_id: whopMembershipId }
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
  info: MembershipInfo,
  paymentId: string | null,
  checkoutId: string | null,
  amountCents: number,
  currency: string
) {
  const service = createServiceClient();
  const currentPeriodEnd = info.currentPeriodEnd;

  const invoice = await findInvoiceByPeriod(
    info.membershipId,
    currentPeriodEnd
  );
  if (invoice) {
    if (paymentId && !invoice.whopPaymentId) {
      await service
        .from("invoices")
        .update({
          plan_id: plan?.id,
          amount_cents: amountCents,
          status: "paid",
          whop_payment_id: paymentId,
          whop_checkout_id: checkoutId,
          metadata: {
            current_period_end: currentPeriodEnd,
            ...pickAttributionMetadata(info.metadata),
          },
        })
        .eq("id", invoice.id);
    }
    return invoice.id;
  }

  const dbSubscription = await findSubscriptionByWhopId(info.membershipId);

  const { data, error } = await service
    .from("invoices")
    .insert({
      user_id: userId,
      plan_id: plan?.id,
      subscription_id: dbSubscription?.id,
      amount_cents: amountCents,
      currency,
      status: "paid",
      whop_payment_id: paymentId,
      whop_checkout_id: checkoutId,
      whop_membership_id: info.membershipId,
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

/** Grants + conversion + referral for one billing event on a membership. */
async function fulfillMembershipCharge(input: {
  mapping: UserMapping;
  info: MembershipInfo;
  paymentId: string | null;
  checkoutId: string | null;
  amountCents: number;
  currency: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const {
    mapping,
    info,
    paymentId,
    checkoutId,
    amountCents,
    currency,
    metadata,
  } = input;

  const { id: subscriptionRowId } = await upsertSubscription(
    mapping.userId,
    info,
    mapping.whopUserId
  );

  const plan =
    (typeof metadata.plan_id === "string"
      ? await getPlanById(metadata.plan_id)
      : null) ?? (await getPlanByWhopVariantId(info.variantId));
  if (!plan) {
    console.error(
      `[fulfillMembershipCharge] no plan for whop variant ${info.variantId}`
    );
    return;
  }

  const invoiceId = await ensureInvoiceForSubscriptionPeriod(
    mapping.userId,
    plan,
    info,
    paymentId,
    checkoutId,
    info.isTrial ? 0 : amountCents,
    currency
  );

  await recordOfferConversion(
    mapping.userId,
    metadata,
    paymentId ?? `membership:${info.membershipId}:${info.currentPeriodEnd}`,
    amountCents
  );

  try {
    await awardOrHoldReferrerShare({
      buyerUserId: mapping.userId,
      plan,
      orderId: paymentId ?? `${info.membershipId}:${info.currentPeriodEnd}`,
    });
  } catch (err) {
    console.error(
      "[fulfillMembershipCharge] referral reward failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  if (plan.credit_drip_months > 1) {
    // Annual plans: credits arrive via the monthly drip; drip 1 is granted
    // at membership activation by the membership.* handler.
    const sub = await findSubscriptionByWhopId(info.membershipId);
    if (sub && sub.dripsGranted === 0) {
      await initializeSubscriptionDrip({
        subscriptionRowId,
        userId: mapping.userId,
        plan,
        providerSubscriptionId: info.membershipId,
        periodStart: info.currentPeriodStart,
        invoiceId,
      });
    }
    return;
  }

  const idempotencyKey = `subscription:${info.membershipId}:${info.currentPeriodEnd}`;
  const ledgerEntryId = await ensureCreditsForBillingPeriod(
    mapping.userId,
    plan,
    info.membershipId,
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
    `[fulfillMembershipCharge] granted ${plan.credits_grant} credits to user ${mapping.userId} for period ${info.currentPeriodEnd}`
  );
}

/**
 * payment.succeeded — covers one-time credit packs/weekly passes AND every
 * subscription charge; `billing_reason` distinguishes them.
 */
export async function fulfillWhopPaymentSucceeded(
  payment: WhopPaymentObject
): Promise<void> {
  console.log(`[fulfillWhopPaymentSucceeded] payment ${payment.id}`);

  if (!payment.id) {
    console.error("[fulfillWhopPaymentSucceeded] payment has no id");
    return;
  }

  const whopUserId = refId(payment.user);
  const userEmail = refEmail(payment.user);
  const metadata = payment.metadata ?? {};

  const mapping = await resolveUser(whopUserId, userEmail, metadata);
  if (!mapping) {
    console.error(
      `[fulfillWhopPaymentSucceeded] could not resolve user for payment ${payment.id}`
    );
    return;
  }
  if (whopUserId) await recordCustomer(mapping.userId, whopUserId);

  const amountCents = dollarsToCents(
    payment.usd_total ?? payment.subtotal ?? payment.total
  );
  const currency = (payment.currency ?? "usd").toUpperCase();
  const billingReason = payment.billing_reason ?? "";
  const isSubscriptionCharge =
    Boolean(payment.membership?.id) &&
    billingReason !== "one_time" &&
    billingReason !== "manual";

  if (isSubscriptionCharge) {
    const info = await buildMembershipInfoFromPayment(payment);
    if (!info) {
      console.error(
        `[fulfillWhopPaymentSucceeded] could not build membership info for payment ${payment.id}; will retry on membership event`
      );
      return;
    }
    if (refId(payment.plan) && !info.variantId) {
      info.variantId = refId(payment.plan) ?? "";
    }
    await fulfillMembershipCharge({
      mapping,
      info,
      paymentId: payment.id,
      checkoutId: payment.checkout_configuration_id ?? null,
      amountCents,
      currency,
      metadata,
    });
    return;
  }

  // One-time purchase (credit pack or weekly pass).
  const variantId = refId(payment.plan);
  const plan =
    (typeof metadata.plan_id === "string"
      ? await getPlanById(metadata.plan_id)
      : null) ?? (variantId ? await getPlanByWhopVariantId(variantId) : null);
  if (!plan) {
    console.error(
      `[fulfillWhopPaymentSucceeded] no plan for whop variant ${variantId}`
    );
    return;
  }

  if (await findInvoiceByPaymentId(payment.id)) {
    console.log("[fulfillWhopPaymentSucceeded] already processed");
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
      whop_payment_id: payment.id,
      whop_checkout_id: payment.checkout_configuration_id ?? null,
      whop_membership_id: refId(payment.membership),
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
    refId(payment.membership) ?? undefined,
    invoice.id,
    `purchase:payment:${payment.id}`,
    amountCents
  );

  await service
    .from("invoices")
    .update({ credit_ledger_entry_id: ledgerEntryId })
    .eq("id", invoice.id);

  await recordOfferConversion(
    mapping.userId,
    metadata,
    payment.id,
    amountCents
  );

  try {
    await awardOrHoldReferrerShare({
      buyerUserId: mapping.userId,
      plan,
      orderId: payment.id,
    });
  } catch (err) {
    console.error(
      "[fulfillWhopPaymentSucceeded] referral reward failed:",
      err instanceof Error ? err.message : String(err)
    );
  }

  console.log(
    `[fulfillWhopPaymentSucceeded] granted credits to user ${mapping.userId} for payment ${payment.id}`
  );
}

/**
 * membership.activated / updated / trial_ending_soon /
 * cancel_at_period_end_changed — keep the local row in sync; credit grants
 * happen on payment.succeeded (or drip init here for annual plans).
 */
export async function fulfillWhopMembershipEvent(
  membership: WhopMembershipObject
): Promise<void> {
  console.log(
    `[fulfillWhopMembershipEvent] membership ${membership.id} status ${membership.status}`
  );

  const whopUserId = refId(membership.user);
  const mapping = await resolveUser(
    whopUserId,
    refEmail(membership.user),
    membership.metadata ?? {}
  );
  if (!mapping) {
    console.error(
      `[fulfillWhopMembershipEvent] could not resolve user for membership ${membership.id}`
    );
    return;
  }
  if (whopUserId) await recordCustomer(mapping.userId, whopUserId);

  const info = toMembershipInfo(membership);
  if (!info.membershipId) return;

  const { id: subscriptionRowId } = await upsertSubscription(
    mapping.userId,
    info,
    mapping.whopUserId
  );

  if (!["active", "trialing", "canceling"].includes(info.status)) return;

  // Dropped credit schedules need drip 1 here too: when the plan is
  // dripped (annual), payment.succeeded skips the per-period grant and the
  // drip init runs once, guarded by drips_granted.
  const plan =
    (typeof info.metadata.plan_id === "string"
      ? await getPlanById(info.metadata.plan_id)
      : null) ?? (await getPlanByWhopVariantId(info.variantId));
  if (plan && plan.credit_drip_months > 1) {
    const sub = await findSubscriptionByWhopId(info.membershipId);
    if (sub && sub.dripsGranted === 0) {
      const invoiceId = await ensureInvoiceForSubscriptionPeriod(
        mapping.userId,
        plan,
        info,
        null,
        null,
        0,
        info.currency
      );
      await initializeSubscriptionDrip({
        subscriptionRowId,
        userId: mapping.userId,
        plan,
        providerSubscriptionId: info.membershipId,
        periodStart: info.currentPeriodStart,
        invoiceId,
      });
    }
  }
}

export async function markWhopMembershipPastDue(
  whopMembershipId: string
): Promise<void> {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("whop_membership_id", whopMembershipId);
}

export async function markWhopMembershipCancelled(
  whopMembershipId: string,
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
    .eq("whop_membership_id", whopMembershipId);
}
