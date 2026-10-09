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

import { POST } from "@/app/api/webhooks/bachs/route";

const SECRET = "whsec_bachs_test_secret_0123456789";
process.env.BACHS_WEBHOOK_SECRET = SECRET;
process.env.BACHS_API_KEY = "sk_sandbox_test_dummy";
process.env.BACHS_ENVIRONMENT = "sandbox";

/** X-Bachs-Signature-V2 format: `t={ts},v1={hex}` */
function sign(
  body: string,
  timestampSeconds: number
): Record<string, string> {
  const sig = createHmac("sha256", SECRET)
    .update(`${timestampSeconds}.${body}`)
    .digest("hex");
  return {
    "x-bachs-signature-v2": `t=${timestampSeconds},v1=${sig}`,
  };
}

function post(body: string, headers?: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/webhooks/bachs", {
      method: "POST",
      body,
      headers,
    }) as never
  );
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function packCollectionEvent() {
  return {
    id: "evt_1",
    type: "collection.succeeded",
    created_at: "2026-10-08T00:00:00.000Z",
    data: {
      charge_id: "ch_pack1",
      checkout_id: "chk_1",
      status: "SUCCEEDED",
      amount: "10.00",
      currency: "USD",
      product_cart: [{ product_id: "prod_pack_bachs", quantity: 1 }],
      customer: { id: "cust_1", email: "u@example.com", name: "U" },
      metadata: { user_id: "user-1", plan_id: "plan-pack" },
    },
  };
}

function subscriptionCreatedEvent() {
  return {
    id: "evt_2",
    type: "customer.subscription.created",
    created_at: "2026-10-08T00:00:00.000Z",
    data: {
      subscription_id: "sub_1",
      customer: { customer_id: "cust_1", email: "u@example.com" },
      product_id: "prod_monthly_bachs",
      status: "active",
      currency: "USD",
      amount: "30.00",
      current_period_start: "2026-10-01T00:00:00.000Z",
      current_period_end: "2026-11-01T00:00:00.000Z",
      cancel_at_period_end: false,
      metadata: { user_id: "user-1", plan_id: "plan-monthly" },
    },
  };
}

function invoicePaidEvent() {
  return {
    id: "evt_3",
    type: "invoice.paid",
    created_at: "2026-10-08T00:00:00.000Z",
    data: {
      invoice_id: "inv_1",
      subscription: { subscription_id: "sub_1" },
      customer: { customer_id: "cust_1", email: "u@example.com" },
      charge: "ch_sub1",
      status: "paid",
      currency: "USD",
      amount_paid: "30.00",
      period_start: "2026-10-01T00:00:00.000Z",
      period_end: "2026-11-01T00:00:00.000Z",
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
      interval: "one_time",
      credit_drip_months: 1,
      metadata: { bachs_product_id_sandbox: "prod_pack_bachs" },
    },
    {
      id: "plan-monthly",
      slug: "monthly-pro",
      name: "Pro Monthly",
      type: "monthly",
      credits_grant: 5000,
      price_cents: 3000,
      interval: "month",
      credit_drip_months: 1,
      metadata: { bachs_product_id_sandbox: "prod_monthly_bachs" },
    },
  ]);
});

describe("bachs webhook route", () => {
  it("accepts a validly-signed collection.succeeded and grants pack credits", async () => {
    const body = JSON.stringify(packCollectionEvent());
    const res = await post(body, sign(body, now()));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(1000);
    expect(entries[0].idempotency_key).toBe("purchase:charge:ch_pack1");
    expect(fake.table("invoices")[0].bachs_charge_id).toBe("ch_pack1");
    expect(fake.table("invoices")[0].amount_cents).toBe(1000);
    expect(fake.table("profiles")[0].bachs_customer_id).toBe("cust_1");
  });

  it("rejects an invalid signature with 401 and writes nothing", async () => {
    const body = JSON.stringify(packCollectionEvent());
    const res = await post(body, {
      "x-bachs-signature-v2": `t=${now()},v1=deadbeef`,
    });
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("invoices")).toHaveLength(0);
  });

  it("rejects a signature over a tampered body", async () => {
    const body = JSON.stringify(packCollectionEvent());
    const tampered = body.replace("ch_pack1", "ch_pack9");
    const res = await post(tampered, sign(body, now()));
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects a stale timestamp (replay window)", async () => {
    const body = JSON.stringify(packCollectionEvent());
    const stale = now() - 10 * 60;
    const res = await post(body, sign(body, stale));
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects a missing signature", async () => {
    const body = JSON.stringify(packCollectionEvent());
    const res = await post(body);
    expect(res.status).toBe(401);
  });

  it("accepts the legacy X-Bachs-Signature + timestamp pair", async () => {
    const body = JSON.stringify(packCollectionEvent());
    const ts = now();
    const sig = createHmac("sha256", SECRET)
      .update(`${ts}.${body}`)
      .digest("hex");
    const res = await post(body, {
      "x-bachs-timestamp": String(ts),
      "x-bachs-signature": sig,
    });
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(1);
  });

  it("replayed collection.succeeded produces exactly one ledger entry", async () => {
    const body = JSON.stringify(packCollectionEvent());
    const headers = sign(body, now());
    for (let i = 0; i < 3; i++) {
      const res = await post(body, headers);
      expect(res.status).toBe(200);
    }
    expect(fake.table("credit_ledger")).toHaveLength(1);
    expect(fake.table("invoices")).toHaveLength(1);
  });

  it("subscription.created + invoice.paid grant the plan credits once per period", async () => {
    const subBody = JSON.stringify(subscriptionCreatedEvent());
    expect(await post(subBody, sign(subBody, now()))).toHaveProperty(
      "status",
      200
    );

    const invBody = JSON.stringify(invoicePaidEvent());
    const res = await post(invBody, sign(invBody, now()));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(5000);
    expect(entries[0].idempotency_key).toBe(
      "subscription:sub_1:2026-11-01T00:00:00.000Z"
    );

    const sub = fake.table("subscriptions")[0];
    expect(sub.bachs_subscription_id).toBe("sub_1");
    expect(sub.bachs_customer_id).toBe("cust_1");
    expect(sub.status).toBe("active");
    const invoice = fake.table("invoices")[0];
    expect(invoice.bachs_subscription_id).toBe("sub_1");
    expect(invoice.bachs_invoice_id).toBe("inv_1");
    expect(invoice.bachs_charge_id).toBe("ch_sub1");
  });

  it("invoice.paid alone (renewal) grants without a subscription event", async () => {
    const invBody = JSON.stringify(invoicePaidEvent());
    const res = await post(invBody, sign(invBody, now()));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(1);
    expect(fake.table("subscriptions")).toHaveLength(1);
  });

  it("duplicate invoice.paid deliveries do not double-grant", async () => {
    const invBody = JSON.stringify(invoicePaidEvent());
    const headers = sign(invBody, now());
    for (let i = 0; i < 2; i++) {
      expect((await post(invBody, headers)).status).toBe(200);
    }
    expect(fake.table("credit_ledger")).toHaveLength(1);
    expect(fake.table("invoices")).toHaveLength(1);
  });

  it("customer.subscription.deleted cancels the local subscription", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub_row_1",
        user_id: "user-1",
        plan_id: "plan-monthly",
        status: "active",
        bachs_subscription_id: "sub_1",
      },
    ]);

    const body = JSON.stringify({
      id: "evt_4",
      type: "customer.subscription.deleted",
      created_at: "2026-10-08T00:00:00.000Z",
      data: {
        subscription_id: "sub_1",
        status: "canceled",
        customer: { customer_id: "cust_1" },
      },
    });
    const res = await post(body, sign(body, now()));
    expect(res.status).toBe(200);
    expect(fake.table("subscriptions")[0].status).toBe("cancelled");
  });

  it("invoice.payment_failed marks the subscription past_due", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub_row_1",
        user_id: "user-1",
        plan_id: "plan-monthly",
        status: "active",
        bachs_subscription_id: "sub_1",
      },
    ]);

    const body = JSON.stringify({
      id: "evt_5",
      type: "invoice.payment_failed",
      created_at: "2026-10-08T00:00:00.000Z",
      data: {
        invoice_id: "inv_9",
        subscription: { subscription_id: "sub_1" },
        status: "open",
      },
    });
    const res = await post(body, sign(body, now()));
    expect(res.status).toBe(200);
    expect(fake.table("subscriptions")[0].status).toBe("past_due");
  });

  it("a paid refund reverses the granted credits", async () => {
    const payBody = JSON.stringify(packCollectionEvent());
    await post(payBody, sign(payBody, now()));
    expect(fake.table("credit_ledger")).toHaveLength(1);

    const refundBody = JSON.stringify({
      id: "evt_6",
      type: "refund.paid",
      created_at: "2026-10-08T00:00:00.000Z",
      data: {
        refund_id: "ref_1",
        charge_id: "ch_pack1",
        status: "paid",
        refunded_amount: "10.00",
      },
    });
    const res = await post(refundBody, sign(refundBody, now()));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(2);
    expect(entries[1].amount).toBe(-1000);
    expect(entries[1].idempotency_key).toBe("refund:ref_1");
    expect(fake.table("invoices")[0].status).toBe("refunded");
  });

  it("refund.created (processing) does not reverse credits", async () => {
    const payBody = JSON.stringify(packCollectionEvent());
    await post(payBody, sign(payBody, now()));

    const refundBody = JSON.stringify({
      id: "evt_7",
      type: "refund.created",
      created_at: "2026-10-08T00:00:00.000Z",
      data: { refund_id: "ref_1", charge_id: "ch_pack1", status: "processing" },
    });
    const res = await post(refundBody, sign(refundBody, now()));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(1);
  });

  it("collection.underpaid grants nothing", async () => {
    const body = JSON.stringify({
      id: "evt_8",
      type: "collection.underpaid",
      created_at: "2026-10-08T00:00:00.000Z",
      data: {
        charge_id: "ch_under1",
        status: "UNDERPAID",
        amount: "10.00",
        currency: "USD",
        product_cart: [{ product_id: "prod_pack_bachs" }],
        customer: { id: "cust_1", email: "u@example.com" },
        metadata: { user_id: "user-1", plan_id: "plan-pack" },
      },
    });
    const res = await post(body, sign(body, now()));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("invoices")).toHaveLength(0);
  });
});
