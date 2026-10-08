import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "./helpers/fake-service-client";

const fake = new FakeServiceClient();

const dodoSessionsCreate = vi.fn();

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

vi.mock("@/lib/billing/dodo-client", () => ({
  createDodoClient: () => ({
    checkoutSessions: { create: dodoSessionsCreate },
  }),
}));

import { createDodoPlanCheckoutSession } from "../checkout-dodo";

const ANNUAL_PLAN = {
  id: "plan-annual",
  slug: "annual-creator",
  name: "Creator Annual",
  type: "annual",
  credits_grant: 2000,
  price_cents: 12000,
  markup_multiplier: 3,
  credit_drip_months: 12,
  metadata: { dodo_product_id: "dodo_prod_annual" },
};

const MONTHLY_PLAN = {
  id: "plan-monthly",
  slug: "monthly-creator",
  name: "Creator",
  type: "monthly",
  credits_grant: 2000,
  price_cents: 2000,
  markup_multiplier: 3,
  credit_drip_months: 1,
  metadata: { dodo_product_id: "dodo_prod_monthly" },
};

beforeEach(() => {
  vi.clearAllMocks();
  fake.seed("profiles", [
    { id: "user-1", email: "u@example.com", display_name: "U" },
  ]);
  dodoSessionsCreate.mockResolvedValue({
    checkout_url: "https://dodo.test/checkout/abc",
  });
});

describe("checkout gates (dodo)", () => {
  it("refuses dripped (annual) plans — Dodo has no drip schedule", async () => {
    fake.seed("plans", [ANNUAL_PLAN]);
    const res = await createDodoPlanCheckoutSession("plan-annual");
    expect(res.error).toBeTruthy();
    expect(dodoSessionsCreate).not.toHaveBeenCalled();
  });

  it("still sells non-dripped subscription plans", async () => {
    fake.seed("plans", [MONTHLY_PLAN]);
    const res = await createDodoPlanCheckoutSession("plan-monthly");
    expect(res.error).toBeUndefined();
    expect(res.checkoutUrl).toBe("https://dodo.test/checkout/abc");
  });
});
