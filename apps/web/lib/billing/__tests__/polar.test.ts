import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "./helpers/fake-service-client";
import type { Order } from "@polar-sh/sdk/models/components/order.js";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js";
import type { Refund } from "@polar-sh/sdk/models/components/refund.js";

const fake = new FakeServiceClient();

const polarSubscriptionsGet = vi.fn();
const polarCheckoutsCreate = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
    from: (table: string) => fake.from(table),
    rpc: async () => ({ data: null, error: null }),
  }),
}));

vi.mock("@/lib/billing/polar-client", () => ({
  createPolarClient: () => ({
    checkouts: { create: polarCheckoutsCreate },
    subscriptions: { get: polarSubscriptionsGet },
  }),
  polarWebhookSecret: () => "test-secret",
  polarServer: () => "sandbox",
  polarOrganizationId: () => "org-1",
  // Mirrors the real sandbox-scoped resolution so the tests exercise the
  // same metadata shape production uses.
  resolvePolarProductId: (metadata: unknown) => {
    const meta = (metadata ?? {}) as Record<string, unknown>;
    const scoped = meta.polar_product_id_sandbox;
    if (typeof scoped === "string" && scoped.length > 0) return scoped;
    const legacy = meta.polar_product_id;
    return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
  },
}));

import {
  fulfillPolarOneTimeOrder,
  fulfillPolarSubscriptionOrder,
  fulfillPolarSubscriptionEvent,
  markPolarSubscriptionPastDue,
} from "../fulfillment-polar";
import { runCreditDrip } from "../drip";
import { handlePolarRefund } from "../refunds";
import {
  createPolarPlanCheckoutSession,
  createPolarExtraCreditsCheckoutSession,
} from "../checkout-polar";

const USER = { id: "user-1", email: "u@example.com", display_name: "U" };

const PLANS = [
  {
    id: "plan-extra",
    slug: "extra-credits",
    name: "Extra Credits",
    type: "extra_credit",
    credits_grant: 0,
    price_cents: 0,
    markup_multiplier: 1,
    credit_drip_months: 1,
    metadata: { polar_product_id: "polar_prod_extra" },
  },
  {
    id: "plan-monthly",
    slug: "monthly-creator",
    name: "Creator",
    type: "monthly",
    credits_grant: 2000,
    price_cents: 2000,
    markup_multiplier: 3,
    credit_drip_months: 1,
    metadata: { polar_product_id: "polar_prod_monthly" },
  },
  {
    id: "plan-annual",
    slug: "annual-creator",
    name: "Creator Annual",
    type: "annual",
    credits_grant: 2000,
    price_cents: 12000,
    markup_multiplier: 3,
    credit_drip_months: 12,
    metadata: { polar_product_id: "polar_prod_annual" },
  },
];

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order_1",
    subscriptionId: null,
    productId: "polar_prod_extra",
    totalAmount: 2500,
    currency: "usd",
    checkoutId: "chk_1",
    customerId: "pcust_1",
    customer: {
      id: "pcust_1",
      email: "u@example.com",
      externalId: "user-1",
    },
    metadata: {
      user_id: "user-1",
      plan_id: "plan-extra",
      credits: "2500",
      experiment_key: "exp_paywall",
      variant_key: "v1",
    },
    billingReason: "purchase",
    ...overrides,
  } as unknown as Order;
}

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  const start = new Date("2026-10-01T00:00:00Z");
  const end = new Date("2026-11-01T00:00:00Z");
  return {
    id: "sub_1",
    productId: "polar_prod_monthly",
    status: "active",
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    startedAt: start,
    createdAt: start,
    endedAt: null,
    customerId: "pcust_1",
    customer: {
      id: "pcust_1",
      email: "u@example.com",
      externalId: "user-1",
    },
    metadata: { user_id: "user-1", plan_id: "plan-monthly" },
    currency: "usd",
    ...overrides,
  } as unknown as Subscription;
}

function ledgerEntries() {
  return fake.table("credit_ledger");
}

beforeEach(() => {
  fake.db.clear();
  polarSubscriptionsGet.mockReset();
  polarCheckoutsCreate.mockReset();
  polarCheckoutsCreate.mockResolvedValue({
    url: "https://sandbox.polar.test/checkout/abc",
  });
  fake.seed("profiles", [{ ...USER }]);
  fake.seed("plans", PLANS.map((p) => ({ ...p })));
});

describe("fulfillPolarOneTimeOrder", () => {
  it("grants credits matching cents paid for a variable top-up", async () => {
    await fulfillPolarOneTimeOrder(order({ totalAmount: 2500 }));
    const entries = ledgerEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      user_id: "user-1",
      entry_type: "purchase",
      amount: 2500,
      idempotency_key: "purchase:payment:order_1",
    });
    const invoices = fake.table("invoices");
    expect(invoices).toHaveLength(1);
    expect(invoices[0].polar_order_id).toBe("order_1");
    expect(invoices[0].metadata.experiment_key).toBe("exp_paywall");
  });

  it("is idempotent: same order 3x yields one ledger entry", async () => {
    const o = order();
    await fulfillPolarOneTimeOrder(o);
    await fulfillPolarOneTimeOrder(o);
    await fulfillPolarOneTimeOrder(o);
    expect(ledgerEntries()).toHaveLength(1);
    expect(fake.table("invoices")).toHaveLength(1);
  });
});

describe("fulfillPolarSubscriptionEvent", () => {
  it("creates subscription, invoice, and credits for a monthly plan", async () => {
    await fulfillPolarSubscriptionEvent(subscription());
    const subs = fake.table("subscriptions");
    expect(subs).toHaveLength(1);
    expect(subs[0].status).toBe("active");
    expect(subs[0].polar_subscription_id).toBe("sub_1");
    const entries = ledgerEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(2000);
    expect(entries[0].idempotency_key).toMatch(/^subscription:sub_1:/);
  });

  it("is idempotent across redelivery", async () => {
    const s = subscription();
    await fulfillPolarSubscriptionEvent(s);
    await fulfillPolarSubscriptionEvent(s);
    await fulfillPolarSubscriptionEvent(s);
    expect(ledgerEntries()).toHaveLength(1);
    expect(fake.table("subscriptions")).toHaveLength(1);
    expect(fake.table("invoices")).toHaveLength(1);
  });

  it("annual plan grants drip 1 only and schedules the rest", async () => {
    await fulfillPolarSubscriptionEvent(
      subscription({
        productId: "polar_prod_annual",
        currentPeriodEnd: new Date("2027-10-01T00:00:00Z"),
        metadata: { user_id: "user-1", plan_id: "plan-annual" },
      })
    );
    const entries = ledgerEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].idempotency_key).toBe("subscription:sub_1:drip:1");
    expect(entries[0].amount).toBe(2000);
    const sub = fake.table("subscriptions")[0];
    expect(sub.drips_granted).toBe(1);
    expect(sub.next_drip_at).toBeTruthy();
    expect(new Date(sub.next_drip_at).getUTCMonth()).toBe(10); // Nov
  });
});

describe("fulfillPolarSubscriptionOrder", () => {
  it("renews via order.paid with subscription metadata", async () => {
    await fulfillPolarSubscriptionEvent(subscription());
    const renewal = subscription();
    renewal.currentPeriodStart = new Date("2026-11-01T00:00:00Z");
    renewal.currentPeriodEnd = new Date("2026-12-01T00:00:00Z");
    fake.table("subscriptions")[0].current_period_start =
      "2026-11-01T00:00:00.000Z";
    fake.table("subscriptions")[0].current_period_end =
      "2026-12-01T00:00:00.000Z";

    await fulfillPolarSubscriptionOrder(
      order({
        id: "order_2",
        subscriptionId: "sub_1",
        productId: "polar_prod_monthly",
        totalAmount: 2000,
        billingReason: "subscription_cycle",
        metadata: { user_id: "user-1" },
      })
    );
    expect(ledgerEntries()).toHaveLength(2);
    expect(ledgerEntries()[1].amount).toBe(2000);
  });
});

describe("runCreditDrip", () => {
  it("grants 12 monthly drips over an annual term, idempotent, stops at 12", async () => {
    await fulfillPolarSubscriptionEvent(
      subscription({
        productId: "polar_prod_annual",
        currentPeriodEnd: new Date("2027-10-01T00:00:00Z"),
        metadata: { user_id: "user-1", plan_id: "plan-annual" },
      })
    );

    // 11 remaining drips (drip 1 already granted).
    let now = new Date("2026-11-02T00:00:00Z");
    for (let i = 0; i < 11; i++) {
      const r = await runCreditDrip(now);
      expect(r.granted).toBe(1);
      now = new Date(now);
      now.setUTCMonth(now.getUTCMonth() + 1);
    }

    const entries = ledgerEntries();
    expect(entries).toHaveLength(12);
    const keys = entries.map((e) => e.idempotency_key);
    expect(new Set(keys).size).toBe(12);
    expect(keys).toContain("subscription:sub_1:drip:12");

    const sub = fake.table("subscriptions")[0];
    expect(sub.drips_granted).toBe(12);
    expect(sub.next_drip_at).toBeNull();

    // Re-run: nothing more is due.
    const again = await runCreditDrip(now);
    expect(again.granted).toBe(0);
    expect(ledgerEntries()).toHaveLength(12);
  });

  it("clamps a Jan 31 anchor without skipping months or drifting", async () => {
    await fulfillPolarSubscriptionEvent(
      subscription({
        productId: "polar_prod_annual",
        currentPeriodStart: new Date("2026-01-31T00:00:00Z"),
        currentPeriodEnd: new Date("2027-01-31T00:00:00Z"),
        metadata: { user_id: "user-1", plan_id: "plan-annual" },
      })
    );
    const sub = fake.table("subscriptions")[0];
    expect(sub.drip_anchor_at).toBe("2026-01-31T00:00:00.000Z");
    expect(sub.next_drip_at).toBe("2026-02-28T00:00:00.000Z");

    // Expected due dates for drips 2..11 (next_drip_at after each grant).
    const expected = [
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
      "2026-06-30",
      "2026-07-31",
      "2026-08-31",
      "2026-09-30",
      "2026-10-31",
      "2026-11-30",
      "2026-12-31",
    ];
    for (const dateStr of expected) {
      const due = fake.table("subscriptions")[0].next_drip_at;
      expect(due.startsWith(dateStr)).toBe(true);
      const runAt = new Date(due);
      runAt.setUTCDate(runAt.getUTCDate() + 1);
      const r = await runCreditDrip(runAt);
      expect(r.granted).toBe(1);
    }

    expect(ledgerEntries()).toHaveLength(12);
    // Drip 12 was due 2026-12-31 — inside the term ending 2027-01-31.
    expect(fake.table("subscriptions")[0].drips_granted).toBe(12);
    expect(fake.table("subscriptions")[0].next_drip_at).toBeNull();
  });

  it("clamps to Feb 29 in a leap year", async () => {
    await fulfillPolarSubscriptionEvent(
      subscription({
        productId: "polar_prod_annual",
        currentPeriodStart: new Date("2028-01-31T00:00:00Z"),
        currentPeriodEnd: new Date("2029-01-31T00:00:00Z"),
        metadata: { user_id: "user-1", plan_id: "plan-annual" },
      })
    );
    expect(fake.table("subscriptions")[0].next_drip_at).toBe(
      "2028-02-29T00:00:00.000Z"
    );
  });

  it("does not double-grant if run twice in the same window", async () => {
    await fulfillPolarSubscriptionEvent(
      subscription({
        productId: "polar_prod_annual",
        currentPeriodEnd: new Date("2027-10-01T00:00:00Z"),
        metadata: { user_id: "user-1", plan_id: "plan-annual" },
      })
    );
    const now = new Date("2026-11-02T00:00:00Z");
    await runCreditDrip(now);
    const r = await runCreditDrip(now);
    expect(r.granted).toBe(0);
    expect(ledgerEntries()).toHaveLength(2);
  });
});

describe("handlePolarRefund", () => {
  it("reverses unspent credits with a negative ledger entry", async () => {
    await fulfillPolarOneTimeOrder(order({ totalAmount: 2500 }));
    const refund = {
      id: "refund_1",
      orderId: "order_1",
      status: "succeeded",
      dispute: null,
      metadata: {},
    } as unknown as Refund;

    await handlePolarRefund(refund);
    const entries = ledgerEntries();
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      entry_type: "debit",
      amount: -2500,
      idempotency_key: "refund:refund_1",
    });
    expect(fake.table("invoices")[0].status).toBe("refunded");
  });

  it("caps the reversal at the available balance and records the loss", async () => {
    await fulfillPolarOneTimeOrder(order({ totalAmount: 2500 }));
    fake.table("credit_ledger").push({
      id: "spend",
      user_id: "user-1",
      entry_type: "debit",
      amount: -2000,
      idempotency_key: "spend:1",
    });
    const refund = {
      id: "refund_2",
      orderId: "order_1",
      status: "succeeded",
      dispute: null,
      metadata: {},
    } as unknown as Refund;

    await handlePolarRefund(refund);
    const entries = ledgerEntries();
    const reversal = entries.find(
      (e) => e.idempotency_key === "refund:refund_2"
    )!;
    expect(reversal.amount).toBe(-500);
    expect(reversal.metadata.unrecovered_credits).toBe(2000);
  });

  it("is idempotent on repeated refund events", async () => {
    await fulfillPolarOneTimeOrder(order({ totalAmount: 2500 }));
    const refund = {
      id: "refund_3",
      orderId: "order_1",
      status: "succeeded",
      dispute: null,
      metadata: {},
    } as unknown as Refund;
    await handlePolarRefund(refund);
    await handlePolarRefund(refund);
    expect(ledgerEntries()).toHaveLength(2);
  });
});

describe("subscription lifecycle", () => {
  it("marks past_due and cancelled", async () => {
    await fulfillPolarSubscriptionEvent(subscription());
    await markPolarSubscriptionPastDue("sub_1");
    expect(fake.table("subscriptions")[0].status).toBe("past_due");
    await fulfillPolarSubscriptionEvent(
      subscription({ status: "canceled", endedAt: new Date() })
    );
    expect(fake.table("subscriptions")[0].status).toBe("cancelled");
  });
});

describe("checkout gates (polar)", () => {
  it("blocks a trial checkout when the user already paid", async () => {
    fake.seed("plans", [
      ...PLANS,
      {
        id: "plan-trial",
        slug: "weekly-starter",
        name: "Starter",
        type: "weekly_trial",
        credits_grant: 500,
        price_cents: 500,
        markup_multiplier: 4,
        credit_drip_months: 1,
        metadata: { polar_product_id: "polar_prod_trial" },
      },
    ]);
    fake.seed("invoices", [
      { id: "inv-paid", user_id: "user-1", status: "paid" },
    ]);
    const res = await createPolarPlanCheckoutSession("plan-trial");
    expect(res.error).toBeTruthy();
    expect(polarCheckoutsCreate).not.toHaveBeenCalled();
  });

  it("blocks an annual trial after a weekly trial (one trial per user)", async () => {
    fake.seed("plans", [
      ...PLANS,
      {
        id: "plan-annual-trial",
        slug: "annual-creator-trial",
        name: "Creator Annual Trial",
        type: "annual",
        credits_grant: 2000,
        price_cents: 12000,
        markup_multiplier: 3,
        credit_drip_months: 12,
        is_trial: true,
        metadata: { polar_product_id: "polar_prod_annual_trial" },
      },
    ]);
    fake.seed("subscriptions", [
      { id: "sub-prior", user_id: "user-1", status: "expired", trial: true },
    ]);
    const res = await createPolarPlanCheckoutSession("plan-annual-trial");
    expect(res.error).toBeTruthy();
    expect(polarCheckoutsCreate).not.toHaveBeenCalled();
  });

  it("blocks a weekly trial after an annual trial", async () => {
    fake.seed("plans", [
      ...PLANS,
      {
        id: "plan-trial",
        slug: "weekly-starter",
        name: "Starter",
        type: "weekly_trial",
        credits_grant: 500,
        price_cents: 500,
        markup_multiplier: 4,
        credit_drip_months: 1,
        metadata: { polar_product_id: "polar_prod_trial" },
      },
    ]);
    fake.seed("subscriptions", [
      {
        id: "sub-annual-trial",
        user_id: "user-1",
        status: "expired",
        trial: true,
        plan_id: "plan-annual",
      },
    ]);
    const res = await createPolarPlanCheckoutSession("plan-trial");
    expect(res.error).toBeTruthy();
    expect(polarCheckoutsCreate).not.toHaveBeenCalled();
  });

  it("blocks extra credits for non-subscribers", async () => {
    const res = await createPolarExtraCreditsCheckoutSession(2000);
    expect(res.error).toMatch(/monthly subscribers/i);
    expect(polarCheckoutsCreate).not.toHaveBeenCalled();
  });

  it("enforces the $10 minimum on top-ups", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub-local",
        user_id: "user-1",
        status: "active",
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
      },
    ]);
    const res = await createPolarExtraCreditsCheckoutSession(500);
    expect(res.error).toMatch(/\$10/);
    expect(polarCheckoutsCreate).not.toHaveBeenCalled();
  });

  it("creates a custom-amount checkout server-side and stamps attribution metadata", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub-local",
        user_id: "user-1",
        status: "active",
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
      },
    ]);
    const res = await createPolarExtraCreditsCheckoutSession(2500, "/app/billing", {
      experimentKey: "exp_paywall",
      variantKey: "v1",
      ladderStage: "rungs_1",
      growsurfParticipantId: "gs_1",
    });
    expect(res.checkoutUrl).toBe("https://sandbox.polar.test/checkout/abc");
    const args = polarCheckoutsCreate.mock.calls[0][0];
    expect(args.products).toEqual(["polar_prod_extra"]);
    expect(args.amount).toBe(2500);
    expect(args.metadata).toMatchObject({
      user_id: "user-1",
      plan_id: "plan-extra",
      credits: "2500",
      experiment_key: "exp_paywall",
      variant_key: "v1",
      ladder_stage: "rungs_1",
      growsurf_participant_id: "gs_1",
    });
    expect(args.successUrl).toContain("/checkout/success");
    expect(args.returnUrl).toContain("/checkout/cancel");
  });
});
