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

import { POST } from "@/app/api/webhooks/creem/route";

const SECRET = "whsec-creem-test";
process.env.CREEM_WEBHOOK_SECRET = SECRET;
process.env.CREEM_API_KEY = "creem_test_dummy";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

function post(body: string, signature?: string) {
  return POST(
    new Request("http://localhost/api/webhooks/creem", {
      method: "POST",
      body,
      headers: signature ? { "creem-signature": signature } : {},
    }) as never
  );
}

function checkoutCompletedEvent() {
  return {
    id: "evt_1",
    eventType: "checkout.completed",
    object: {
      id: "ch_1",
      request_id: "topup:user-1:1",
      status: "completed",
      order: {
        id: "ord_1",
        amount: 3000,
        amount_paid: 3000,
        currency: "USD",
        status: "paid",
        type: "onetime",
        customer: "cust_1",
        product: "prod_extra",
      },
      product: { id: "prod_extra" },
      customer: { id: "cust_1", email: "u@example.com", name: "U" },
      metadata: { user_id: "user-1", plan_id: "plan-extra" },
    },
  };
}

function subscriptionPaidEvent() {
  return {
    id: "evt_2",
    eventType: "subscription.paid",
    object: {
      id: "sub_1",
      product: { id: "prod_monthly" },
      customer: { id: "cust_1", email: "u@example.com" },
      status: "active",
      current_period_start_date: "2026-10-01T00:00:00.000Z",
      current_period_end_date: "2026-11-01T00:00:00.000Z",
      last_transaction_id: "tr_1",
      metadata: { user_id: "user-1", plan_id: "plan-monthly" },
      created_at: "2026-10-01T00:00:00.000Z",
    },
  };
}

beforeEach(() => {
  fake.db.clear();
  fake.seed("profiles", [{ id: "user-1", email: "u@example.com" }]);
  fake.seed("plans", [
    {
      id: "plan-extra",
      slug: "extra-credits",
      name: "Extra Credits",
      type: "extra_credit",
      credits_grant: 0,
      price_cents: 0,
      credit_drip_months: 1,
      metadata: { creem_product_id_test: "prod_extra" },
    },
    {
      id: "plan-monthly",
      slug: "pro-monthly",
      name: "Pro Monthly",
      type: "monthly",
      credits_grant: 5000,
      price_cents: 1900,
      credit_drip_months: 1,
      metadata: { creem_product_id_test: "prod_monthly" },
    },
  ]);
  fake.seed("pricing_policies", [
    {
      id: "pol-1",
      version: 1,
      is_active: true,
      credit_capacity_usd: 0.001,
      top_up_budget_ratio: 0.606,
      quote_max_slack_factor: 1.15,
      quote_ttl_seconds: 600,
      snapshot_ttl_hours: 6,
    },
  ]);
});

describe("creem webhook route", () => {
  it("accepts a validly-signed checkout.completed and grants credits", async () => {
    const body = JSON.stringify(checkoutCompletedEvent());
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(1);
    // extra_credit grants policy-priced credits: $30 × 0.606 → 18,180.
    expect(entries[0].amount).toBe(18180);
    expect(fake.table("invoices")[0].creem_order_id).toBe("ord_1");
    expect(fake.table("profiles")[0].creem_customer_id).toBe("cust_1");
  });

  it("grants the checkout-pinned credits, not a policy re-derivation", async () => {
    // The checkout quoted 9,999 credits under an older policy; fulfillment
    // must honor the purchase, not today's top_up_budget_ratio.
    const event = checkoutCompletedEvent();
    event.object.metadata = {
      ...event.object.metadata,
      credits: "9999",
      pricing_policy_version: "0",
    } as typeof event.object.metadata;
    const body = JSON.stringify(event);
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")[0].amount).toBe(9999);
  });

  it("rejects an invalid signature with 401 and writes nothing", async () => {
    const body = JSON.stringify(checkoutCompletedEvent());
    const res = await post(body, "deadbeef");
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("invoices")).toHaveLength(0);
  });

  it("rejects a signature over a tampered body", async () => {
    const body = JSON.stringify(checkoutCompletedEvent());
    const tampered = body.replace("3000", "9000");
    const res = await post(tampered, sign(body));
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects a missing signature", async () => {
    const body = JSON.stringify(checkoutCompletedEvent());
    const res = await post(body);
    expect(res.status).toBe(401);
  });

  it("replayed checkout.completed produces exactly one ledger entry", async () => {
    const body = JSON.stringify(checkoutCompletedEvent());
    const sig = sign(body);
    for (let i = 0; i < 3; i++) {
      const res = await post(body, sig);
      expect(res.status).toBe(200);
    }
    expect(fake.table("credit_ledger")).toHaveLength(1);
    expect(fake.table("invoices")).toHaveLength(1);
  });

  it("subscription.paid grants the plan's credits once per period", async () => {
    const body = JSON.stringify(subscriptionPaidEvent());
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(5000);
    expect(entries[0].idempotency_key).toBe(
      "subscription:sub_1:2026-11-01T00:00:00.000Z"
    );

    const sub = fake.table("subscriptions")[0];
    expect(sub.creem_subscription_id).toBe("sub_1");
    expect(sub.status).toBe("active");
    expect(fake.table("invoices")[0].creem_subscription_id).toBe("sub_1");
  });

  it("checkout.completed + subscription.paid for the same period grant once", async () => {
    const sub = {
      id: "sub_1",
      product: { id: "prod_monthly" },
      customer: { id: "cust_1", email: "u@example.com" },
      status: "active",
      current_period_start_date: "2026-10-01T00:00:00.000Z",
      current_period_end_date: "2026-11-01T00:00:00.000Z",
      metadata: { user_id: "user-1" },
      created_at: "2026-10-01T00:00:00.000Z",
    };
    const checkoutBody = JSON.stringify({
      id: "evt_3",
      eventType: "checkout.completed",
      object: {
        id: "ch_2",
        order: {
          id: "ord_sub",
          amount: 1900,
          amount_paid: 1900,
          currency: "USD",
          status: "paid",
          type: "recurring",
          customer: "cust_1",
          product: "prod_monthly",
        },
        subscription: sub,
        customer: { id: "cust_1", email: "u@example.com" },
        metadata: { user_id: "user-1" },
      },
    });
    expect(await post(checkoutBody, sign(checkoutBody))).toHaveProperty(
      "status",
      200
    );

    const paidBody = JSON.stringify(subscriptionPaidEvent());
    expect(await post(paidBody, sign(paidBody))).toHaveProperty("status", 200);

    const grants = fake
      .table("credit_ledger")
      .filter((e) => e.amount === 5000);
    expect(grants).toHaveLength(1);
  });

  it("refund.created (succeeded) debits the granted credits", async () => {
    const checkoutBody = JSON.stringify(checkoutCompletedEvent());
    await post(checkoutBody, sign(checkoutBody));

    const refundBody = JSON.stringify({
      id: "evt_4",
      eventType: "refund.created",
      object: {
        id: "rf_1",
        status: "succeeded",
        refund_amount: 3000,
        refund_currency: "USD",
        transaction: { id: "tr_1", order: "ord_1" },
      },
    });
    const res = await post(refundBody, sign(refundBody));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(2);
    expect(entries[1].amount).toBe(-18180);
    expect(entries[1].metadata.reason).toBe("refund");
    expect(fake.table("invoices")[0].status).toBe("refunded");
  });

  it("refund.created with a non-succeeded status does nothing", async () => {
    const refundBody = JSON.stringify({
      id: "evt_5",
      eventType: "refund.created",
      object: {
        id: "rf_2",
        status: "pending",
        transaction: { id: "tr_1", order: "ord_1" },
      },
    });
    const res = await post(refundBody, sign(refundBody));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("dispute.created reverses credits with chargeback reason", async () => {
    const checkoutBody = JSON.stringify(checkoutCompletedEvent());
    await post(checkoutBody, sign(checkoutBody));

    const disputeBody = JSON.stringify({
      id: "evt_6",
      eventType: "dispute.created",
      object: {
        id: "dp_1",
        transaction: { id: "tr_1", order: "ord_1" },
      },
    });
    const res = await post(disputeBody, sign(disputeBody));
    expect(res.status).toBe(200);

    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(2);
    expect(entries[1].amount).toBe(-18180);
    expect(entries[1].metadata.reason).toBe("chargeback");
  });

  it("subscription.canceled marks the subscription cancelled", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub-local",
        user_id: "user-1",
        status: "active",
        creem_subscription_id: "sub_1",
      },
    ]);
    const body = JSON.stringify({
      id: "evt_7",
      eventType: "subscription.canceled",
      object: { id: "sub_1", status: "canceled" },
    });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("subscriptions")[0].status).toBe("cancelled");
    expect(fake.table("subscriptions")[0].ended_at).toBeTruthy();
  });

  it("subscription.past_due marks the subscription past_due", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub-local",
        user_id: "user-1",
        status: "active",
        creem_subscription_id: "sub_1",
      },
    ]);
    const body = JSON.stringify({
      id: "evt_8",
      eventType: "subscription.past_due",
      object: { id: "sub_1", status: "past_due" },
    });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("subscriptions")[0].status).toBe("past_due");
  });

  it("ignores unknown event types with 200", async () => {
    const body = JSON.stringify({ id: "evt_9", eventType: "some.new.event" });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
  });
});
