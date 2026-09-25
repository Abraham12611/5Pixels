import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { FakeServiceClient } from "./helpers/fake-service-client";

const fake = new FakeServiceClient();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

// Mock the SDK's validateEvent but keep real signature semantics: the
// standardwebhooks scheme is base64(hmac-sha256(secret, `${id}.${ts}.${body}`))
// sent as `webhook-signature: v1,<sig>`.
vi.mock("@polar-sh/sdk/webhooks", () => ({
  WebhookVerificationError: class extends Error {},
  validateEvent(
    body: string,
    headers: Record<string, string>,
    secret: string
  ) {
    const id = headers["webhook-id"];
    const ts = headers["webhook-timestamp"];
    const presented = headers["webhook-signature"] ?? "";
    const expected =
      "v1," +
      createHmac("sha256", secret)
        .update(`${id}.${ts}.${body}`)
        .digest("base64");
    if (!id || !ts || presented !== expected) {
      throw new Error("Invalid signature");
    }
    return JSON.parse(body);
  },
}));

import { POST } from "@/app/api/webhooks/polar/route";

const SECRET = "whsec-test";
process.env.POLAR_WEBHOOK_SECRET = SECRET;

function sign(body: string, id = "msg_1") {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig =
    "v1," + createHmac("sha256", SECRET).update(`${id}.${ts}.${body}`).digest("base64");
  return { id, ts, sig };
}

function post(body: string, headers: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/webhooks/polar", {
      method: "POST",
      body,
      headers,
    }) as never
  );
}

function orderPaidEvent() {
  return {
    type: "order.paid",
    data: {
      id: "order_1",
      subscriptionId: null,
      productId: "polar_prod_extra",
      totalAmount: 3000,
      currency: "usd",
      checkoutId: "chk_1",
      customerId: "pcust_1",
      customer: { id: "pcust_1", email: "u@example.com", externalId: "user-1" },
      metadata: { user_id: "user-1", plan_id: "plan-extra" },
      billingReason: "purchase",
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
      metadata: { polar_product_id: "polar_prod_extra" },
    },
  ]);
});

describe("polar webhook route", () => {
  it("accepts a validly-signed event and fulfils the order", async () => {
    const body = JSON.stringify(orderPaidEvent());
    const { id, ts, sig } = sign(body);
    const res = await post(body, {
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": sig,
    });
    expect(res.status).toBe(200);
    const entries = fake.table("credit_ledger");
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(3000);
  });

  it("rejects an invalid signature with 401 and writes nothing", async () => {
    const body = JSON.stringify(orderPaidEvent());
    const res = await post(body, {
      "webhook-id": "msg_1",
      "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      "webhook-signature": "v1,bogus",
    });
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects a signature over a tampered body", async () => {
    const body = JSON.stringify(orderPaidEvent());
    const { id, ts, sig } = sign(body);
    const tampered = body.replace("3000", "9000");
    const res = await post(tampered, {
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": sig,
    });
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("replayed delivery produces exactly one ledger entry", async () => {
    const body = JSON.stringify(orderPaidEvent());
    const { id, ts, sig } = sign(body);
    const headers = {
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": sig,
    };
    for (let i = 0; i < 3; i++) {
      const res = await post(body, headers);
      expect(res.status).toBe(200);
    }
    expect(fake.table("credit_ledger")).toHaveLength(1);
    expect(fake.table("invoices")).toHaveLength(1);
  });

  it("handles subscription.past_due by flagging the subscription", async () => {
    fake.seed("subscriptions", [
      {
        id: "sub-local",
        user_id: "user-1",
        status: "active",
        polar_subscription_id: "sub_1",
      },
    ]);
    const body = JSON.stringify({
      type: "subscription.past_due",
      data: { id: "sub_1" },
    });
    const { id, ts, sig } = sign(body, "msg_2");
    const res = await post(body, {
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": sig,
    });
    expect(res.status).toBe(200);
    expect(fake.table("subscriptions")[0].status).toBe("past_due");
  });
});
