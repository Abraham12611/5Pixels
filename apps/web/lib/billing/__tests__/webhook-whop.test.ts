import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { FakeServiceClient } from "./helpers/fake-service-client";

const fake = new FakeServiceClient();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

vi.mock("@/lib/growsurf/sync", () => ({
  awardOrHoldReferrerShare: vi.fn(async () => null),
  reverseReferrerShareForRefund: vi.fn(async () => null),
}));

vi.mock("@/lib/offers/conversions", () => ({
  recordOfferConversion: vi.fn(async () => null),
}));

// Keep the real signature verifier; stub only the membership API fetch used
// when a payment arrives before its membership event.
vi.mock("@/lib/billing/whop-client", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/billing/whop-client")>();
  return {
    ...actual,
    getWhopMembership: vi.fn(async (id: string) => ({
      id,
      status: "active",
      renewal_period_start: "2026-10-01T00:00:00.000Z",
      renewal_period_end: "2026-11-01T00:00:00.000Z",
      plan: { id: "plan_monthly_whop" },
      manage_url: "https://whop.com/billing/manage/" + id,
      metadata: { user_id: "user-1" },
      created_at: "2026-10-01T00:00:00.000Z",
    })),
  };
});

import { POST } from "@/app/api/webhooks/whop/route";

// Whop signs with the ws_ secret verbatim — the whole string is the key.
const SECRET = "ws_0123456789abcdef0123456789abcdef";
process.env.WHOP_WEBHOOK_SECRET = SECRET;
process.env.WHOP_API_KEY = "whop_test_dummy";

function sign(
  body: string,
  webhookId: string,
  timestampSeconds: number
): Record<string, string> {
  const sig = createHmac("sha256", SECRET)
    .update(`${webhookId}.${timestampSeconds}.${body}`)
    .digest("base64");
  return {
    "webhook-id": webhookId,
    "webhook-timestamp": String(timestampSeconds),
    "webhook-signature": `v1,${sig}`,
  };
}

function post(body: string, headers?: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/webhooks/whop", {
      method: "POST",
      body,
      headers,
    }) as never
  );
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function packPaymentEvent() {
  return {
    id: "evt_1",
    type: "payment.succeeded",
    timestamp: "2026-10-05T00:00:00.000Z",
    data: {
      id: "pay_1",
      billing_reason: "one_time",
      status: "paid",
      subtotal: 10,
      total: 10,
      usd_total: 10,
      currency: "usd",
      plan: { id: "plan_pack_whop" },
      user: { id: "user_whop_1", email: "u@example.com" },
      checkout_configuration_id: "ch_1",
      metadata: { user_id: "user-1", plan_id: "plan-pack" },
    },
  };
}

function subscriptionPaymentEvent() {
  return {
    id: "evt_2",
    type: "payment.succeeded",
    timestamp: "2026-10-05T00:00:00.000Z",
    data: {
      id: "pay_sub_1",
      billing_reason: "subscription_create",
      subtotal: 30,
      total: 30,
      usd_total: 30,
      currency: "usd",
      plan: { id: "plan_monthly_whop" },
      membership: { id: "mem_1", status: "active" },
      user: { id: "user_whop_1", email: "u@example.com" },
      checkout_configuration_id: "ch_2",
      metadata: { user_id: "user-1", plan_id: "plan-monthly" },
    },
  };
}

beforeEach(() => {
  fake.db.clear();
  fake.seed("profiles", [{ id: "user-1", email: "u@example.com" }]);
  fake.seed("plans", [
    {
      id: "plan-pack",
      slug: "credits-1000",
      name: "1,000 Credits",
      type: "extra_credit",
      credits_grant: 1000,
      price_cents: 1000,
      credit_drip_months: 1,
      metadata: { whop_variant_id_live: "plan_pack_whop" },
    },
    {
      id: "plan-monthly",
      slug: "monthly-pro",
      name: "Pro Monthly",
      type: "monthly",
      credits_grant: 5000,
      price_cents: 3000,
      credit_drip_months: 1,
      metadata: { whop_variant_id_live: "plan_monthly_whop" },
    },
  ]);
});

describe("whop webhook route", () => {
  it("accepts a validly-signed payment.succeeded and grants pack credits", async () => {
    const body = JSON.stringify(packPaymentEvent());
    const res = await post(body, sign(body, "msg_1", now()));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(1);
    // Fixed pack: the configured grant is authoritative, not the amount.
    expect(entries[0].amount).toBe(1000);
    expect(fake.table("invoices")[0].whop_payment_id).toBe("pay_1");
    expect(fake.table("profiles")[0].whop_user_id).toBe("user_whop_1");
  });

  it("rejects an invalid signature with 401 and writes nothing", async () => {
    const body = JSON.stringify(packPaymentEvent());
    const res = await post(body, {
      "webhook-id": "msg_1",
      "webhook-timestamp": String(now()),
      "webhook-signature": "v1,deadbeef",
    });
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("invoices")).toHaveLength(0);
  });

  it("rejects a signature over a tampered body", async () => {
    const body = JSON.stringify(packPaymentEvent());
    const tampered = body.replace("pay_1", "pay_9");
    const res = await post(tampered, sign(body, "msg_1", now()));
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects a stale timestamp (replay window)", async () => {
    const body = JSON.stringify(packPaymentEvent());
    const stale = now() - 10 * 60;
    const res = await post(body, sign(body, "msg_1", stale));
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects a missing signature", async () => {
    const body = JSON.stringify(packPaymentEvent());
    const res = await post(body);
    expect(res.status).toBe(401);
  });

  it("replayed payment.succeeded produces exactly one ledger entry", async () => {
    const body = JSON.stringify(packPaymentEvent());
    const headers = sign(body, "msg_1", now());
    for (let i = 0; i < 3; i++) {
      const res = await post(body, headers);
      expect(res.status).toBe(200);
    }
    expect(fake.table("credit_ledger")).toHaveLength(1);
    expect(fake.table("invoices")).toHaveLength(1);
  });

  it("a subscription charge grants the plan credits once per period", async () => {
    const body = JSON.stringify(subscriptionPaymentEvent());
    const res = await post(body, sign(body, "msg_2", now()));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(5000);
    expect(entries[0].idempotency_key).toBe(
      "subscription:mem_1:2026-11-01T00:00:00.000Z"
    );

    const sub = fake.table("subscriptions")[0];
    expect(sub.whop_membership_id).toBe("mem_1");
    expect(sub.status).toBe("active");
    expect(sub.whop_manage_url).toBe(
      "https://whop.com/billing/manage/mem_1"
    );
    expect(fake.table("invoices")[0].whop_membership_id).toBe("mem_1");
  });

  it("membership.deactivated cancels the local subscription", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub_row_1",
        user_id: "user-1",
        plan_id: "plan-monthly",
        status: "active",
        whop_membership_id: "mem_1",
      },
    ]);

    const body = JSON.stringify({
      id: "evt_3",
      type: "membership.deactivated",
      timestamp: "2026-10-05T00:00:00.000Z",
      data: {
        id: "mem_1",
        status: "canceled",
        user: { id: "user_whop_1", email: "u@example.com" },
      },
    });
    const res = await post(body, sign(body, "msg_3", now()));
    expect(res.status).toBe(200);
    expect(fake.table("subscriptions")[0].status).toBe("cancelled");
  });

  it("a successful refund reverses the granted credits", async () => {
    const payBody = JSON.stringify(packPaymentEvent());
    await post(payBody, sign(payBody, "msg_4", now()));
    expect(fake.table("credit_ledger")).toHaveLength(1);

    const refundBody = JSON.stringify({
      id: "evt_4",
      type: "refund.created",
      timestamp: "2026-10-05T00:00:00.000Z",
      data: { id: "rf_1", status: "succeeded", payment: { id: "pay_1" } },
    });
    const res = await post(refundBody, sign(refundBody, "msg_4b", now()));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(2);
    expect(entries[1].amount).toBe(-1000);
    expect(entries[1].idempotency_key).toBe("refund:rf_1");
    expect(fake.table("invoices")[0].status).toBe("refunded");
  });
});
