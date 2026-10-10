import { beforeEach, describe, expect, it } from "vitest";
import { FakeServiceClient } from "@/lib/billing/__tests__/helpers/fake-service-client";
import { quoteFal } from "../adapters/fal";
import { createGenerationQuote } from "../quote";
import { getActivePricingPolicy, resetPricingPolicyCache } from "../policy";
import { getEndpointState, getFreshSnapshot } from "../snapshots";
import { creditsForProviderCost, topUpCreditsForCents } from "../types";
import type { SnapshotPayload } from "../types";

const POLICY_ROW = {
  id: "pol-1",
  version: 1,
  is_active: true,
  credit_capacity_usd: 0.001,
  top_up_budget_ratio: 0.606,
  quote_max_slack_factor: 1.15,
  quote_ttl_seconds: 600,
  snapshot_ttl_hours: 6,
};

const SLACK = { quoteMaxSlackFactor: 1.15 };

function freshSnapshot(
  endpointId: string,
  payload: SnapshotPayload,
  expiresInMs = 6 * 3600_000
) {
  return {
    id: `snap-${endpointId}`,
    provider: "fal",
    endpoint_id: endpointId,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    payload,
  };
}

const FLAT = (): SnapshotPayload => ({
  pricing_type: "flat_per_request",
  unit_price: 0.08,
  currency: "USD",
});

const NANO = (): SnapshotPayload => ({
  pricing_type: "resolution_tier",
  currency: "USD",
  tier_map: "fal_resolution",
  tiers: { "0.5K": 0.06, "1K": 0.08, "2K": 0.12, "4K": 0.16 },
  modifiers: {
    enable_web_search: { true: 0.015 },
    thinking_level: { high: 0.002 },
  },
});

const QUOTE_INPUT = {
  userId: "user-1",
  productId: "prod-1",
  productVersionId: "ver-1",
  options: { size: "square" },
  outputWidth: 1024,
  outputHeight: 1024,
  provider: "fal",
  endpoint: "nano-banana-2/edit",
};

describe("credit math", () => {
  it("converts provider cost at $0.001/credit, ceiling", () => {
    expect(creditsForProviderCost(0.08)).toBe(80);
    expect(creditsForProviderCost(0.05268)).toBe(53);
    expect(creditsForProviderCost(0.0800001)).toBe(81);
  });

  it("prices top-ups through the policy budget ratio", () => {
    const policy = { topUpBudgetRatio: 0.606 };
    // $25 → $15.15 budget → 15,150 credits; float-safe at every amount.
    expect(topUpCreditsForCents(2500, policy)).toBe(15150);
    expect(topUpCreditsForCents(2000, policy)).toBe(12120);
    expect(topUpCreditsForCents(1000, policy)).toBe(6060);
  });
});

describe("quoteFal adapter", () => {
  it("applies the slack factor to a flat price's maximum", () => {
    const q = quoteFal(FLAT(), { width: 1024, height: 1024 }, SLACK);
    expect(q.kind).not.toBe("unsafe");
    if (q.kind === "unsafe") return;
    expect(q.expectedCostUsd).toBeCloseTo(0.08);
    // max = expected × 1.15 — the buffer settles downward, never upward.
    expect(q.maximumCostUsd).toBeCloseTo(0.092);
  });

  it("prices per-megapixel on the resolved envelope", () => {
    const q = quoteFal(
      { pricing_type: "per_megapixel", unit_price: 0.05, currency: "USD" },
      { width: 2048, height: 2048 },
      SLACK
    );
    if (q.kind === "unsafe") throw new Error(q.reason);
    expect(q.expectedCostUsd).toBeCloseTo(0.05 * 4.194304);
    expect(q.maximumCostUsd).toBeCloseTo(0.05 * 4.194304 * 1.15);
  });

  it.each([
    ["unsupported pricing type", { pricing_type: "unsupported", unit_price: 0.05 }],
    ["unknown pricing type", { pricing_type: "units" as never, unit_price: 0.05 }],
    ["nonpositive price", { pricing_type: "flat_per_request", unit_price: 0 }],
    ["non-USD price", { ...FLAT(), currency: "EUR" }],
    // Time billing has no provider-enforced runtime ceiling, so it is
    // quotable nowhere — even if a snapshot still carries a guessed cap.
    ["per-second billing", { pricing_type: "per_second" as never, unit_price: 0.01, max_seconds: 15 }],
  ])("refuses %s", (_label, payload) => {
    const q = quoteFal(payload as SnapshotPayload, { width: 1024, height: 1024 }, SLACK);
    expect(q.kind).toBe("unsafe");
  });
});

describe("resolution_tier pricing (nano-banana-2)", () => {
  it.each([
    [1024, 1024, "1K", 0.08],   // 1.0 MP
    [1820, 1024, "2K", 0.12],   // ~1.9 MP
    [4096, 4096, "4K", 0.16],   // 16.8 MP
  ])(
    "prices %dx%d at the %s tier ($%f)",
    (width, height, tier, price) => {
      const q = quoteFal(NANO(), { width, height }, SLACK);
      if (q.kind === "unsafe") throw new Error(q.reason);
      expect(q.expectedCostUsd).toBeCloseTo(price);
      expect(q.maximumCostUsd).toBeCloseTo(price * 1.15);
      expect(q.components.tier).toBe(tier);
      expect(q.components.resolved_price).toBeCloseTo(price);
    }
  );

  it("adds surcharged request params from the real config", () => {
    const q = quoteFal(
      NANO(),
      {
        width: 1024,
        height: 1024,
        requestConfig: { enable_web_search: true, thinking_level: "high" },
      },
      SLACK
    );
    if (q.kind === "unsafe") throw new Error(q.reason);
    // $0.08 + $0.015 + $0.002
    expect(q.expectedCostUsd).toBeCloseTo(0.097);
    expect(q.components.resolved_price).toBeCloseTo(0.097);
  });

  it("treats neutral param values as free", () => {
    const q = quoteFal(
      NANO(),
      {
        width: 1024,
        height: 1024,
        requestConfig: { enable_web_search: false, thinking_level: "low" },
      },
      SLACK
    );
    if (q.kind === "unsafe") throw new Error(q.reason);
    expect(q.expectedCostUsd).toBeCloseTo(0.08);
  });

  it.each([
    [
      "unknown tier map",
      { ...NANO(), tier_map: "made_up" },
      { width: 1024, height: 1024 },
    ],
    [
      "tier missing from the verified table",
      { ...NANO(), tiers: { "1K": 0.08 } },
      { width: 4096, height: 4096 },
    ],
    [
      "unpriced modifier value",
      NANO(),
      {
        width: 1024,
        height: 1024,
        requestConfig: { thinking_level: "ultra" },
      },
    ],
  ])("refuses %s", (_label, payload, envelope) => {
    const q = quoteFal(
      payload as SnapshotPayload,
      envelope as { width: number; height: number },
      SLACK
    );
    expect(q.kind).toBe("unsafe");
  });
});

describe("snapshots + endpoint state (fail closed)", () => {
  const fake = new FakeServiceClient();

  beforeEach(() => {
    fake.db.clear();
    resetPricingPolicyCache();
  });

  it("returns null for a missing snapshot", async () => {
    expect(
      await getFreshSnapshot(fake as never, "fal", "nano-banana-2/edit")
    ).toBeNull();
  });

  it("returns null when the newest snapshot is expired", async () => {
    fake.seed("provider_pricing_snapshots", [
      freshSnapshot("nano-banana-2/edit", FLAT(), -1000),
    ]);
    expect(
      await getFreshSnapshot(fake as never, "fal", "nano-banana-2/edit")
    ).toBeNull();
  });

  it("treats a suspended route as unavailable", async () => {
    fake.seed("provider_endpoint_state", [
      { provider: "fal", endpoint_id: "nano-banana-2/edit", status: "suspended" },
    ]);
    expect(
      await getEndpointState(fake as never, "fal", "nano-banana-2/edit")
    ).toBe("suspended");
  });

  it("returns null for the active policy when none exists", async () => {
    expect(await getActivePricingPolicy(fake as never)).toBeNull();
  });
});

describe("createGenerationQuote", () => {
  const fake = new FakeServiceClient();

  beforeEach(() => {
    fake.db.clear();
    fake.rpcHandlers.clear();
    fake.rpcHandlers.set("options_fingerprint", (args) =>
      `fp:${JSON.stringify(args.p_options)}`
    );
    resetPricingPolicyCache();
    fake.seed("pricing_policies", [POLICY_ROW]);
    fake.seed("provider_pricing_snapshots", [
      freshSnapshot("nano-banana-2/edit", FLAT()),
    ]);
  });

  function quotes() {
    return fake.table("generation_quotes");
  }

  it("creates a single-use quote reserving ceil(max × slack / $0.001)", async () => {
    const res = await createGenerationQuote(fake as never, QUOTE_INPUT);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // $0.08 × 1.15 = $0.092 → 92 credits reserved; 80 expected.
    expect(res.reserveCredits).toBe(92);
    expect(res.expectedCredits).toBe(80);
    expect(res.endpoint).toBe("nano-banana-2/edit");
    expect(res.eligibleFallbackEndpoint).toBeNull();

    const row = quotes()[0];
    expect(row.reserve_credits).toBe(92);
    expect(row.maximum_cost_usd).toBeCloseTo(0.092);
    expect(row.pricing_snapshot_id).toBe("snap-nano-banana-2/edit");
    expect(row.policy_version).toBe(1);
    expect(row.options_fingerprint).toContain("fp:");
    expect(row.consumed_at ?? null).toBeNull();
  });

  it("fails closed without an active policy", async () => {
    fake.seed("pricing_policies", [{ ...POLICY_ROW, is_active: false }]);
    resetPricingPolicyCache();
    const res = await createGenerationQuote(fake as never, QUOTE_INPUT);
    expect(res.ok).toBe(false);
    expect(quotes()).toHaveLength(0);
  });

  it("fails closed without a fresh snapshot", async () => {
    fake.seed("provider_pricing_snapshots", [
      freshSnapshot("nano-banana-2/edit", FLAT(), -60_000),
    ]);
    const res = await createGenerationQuote(fake as never, QUOTE_INPUT);
    expect(res.ok).toBe(false);
    expect(quotes()).toHaveLength(0);
  });

  it("fails closed on unsupported pricing (no approximation)", async () => {
    fake.seed("provider_pricing_snapshots", [
      freshSnapshot("nano-banana-2/edit", {
        pricing_type: "unsupported",
        unit_price: 0.05,
      }),
    ]);
    const res = await createGenerationQuote(fake as never, QUOTE_INPUT);
    expect(res.ok).toBe(false);
    expect(quotes()).toHaveLength(0);
  });

  it("fails closed when the endpoint is suspended", async () => {
    fake.seed("provider_endpoint_state", [
      { provider: "fal", endpoint_id: "nano-banana-2/edit", status: "suspended" },
    ]);
    const res = await createGenerationQuote(fake as never, QUOTE_INPUT);
    expect(res.ok).toBe(false);
    expect(quotes()).toHaveLength(0);
  });

  it("excludes a fallback whose bounded max exceeds the primary envelope", async () => {
    fake.seed("provider_pricing_snapshots", [
      freshSnapshot("nano-banana-2/edit", FLAT()),
      freshSnapshot("pricey/edit", {
        pricing_type: "flat_per_request",
        unit_price: 0.5,
        currency: "USD",
      }),
    ]);
    const res = await createGenerationQuote(fake as never, {
      ...QUOTE_INPUT,
      fallbackEndpoint: "pricey/edit",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.eligibleFallbackEndpoint).toBeNull();
    expect(quotes()[0].fallback_snapshot_id).toBeNull();
    expect(quotes()[0].allowed_endpoint_ids).toEqual(["nano-banana-2/edit"]);
  });

  it("admits an in-envelope fallback and pins its snapshot", async () => {
    fake.seed("provider_pricing_snapshots", [
      freshSnapshot("nano-banana-2/edit", FLAT()),
      freshSnapshot("cheap/edit", {
        pricing_type: "flat_per_request",
        unit_price: 0.05,
        currency: "USD",
      }),
    ]);
    const res = await createGenerationQuote(fake as never, {
      ...QUOTE_INPUT,
      fallbackEndpoint: "cheap/edit",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.eligibleFallbackEndpoint).toBe("cheap/edit");
    expect(quotes()[0].fallback_snapshot_id).toBe("snap-cheap/edit");
    expect(quotes()[0].allowed_endpoint_ids).toEqual([
      "nano-banana-2/edit",
      "cheap/edit",
    ]);
  });

  it("expires no later than the snapshots that authorized it", async () => {
    fake.seed("provider_pricing_snapshots", [
      // Primary snapshot expires in 60s — sooner than the 600s quote TTL.
      freshSnapshot("nano-banana-2/edit", FLAT(), 60_000),
    ]);
    const res = await createGenerationQuote(fake as never, QUOTE_INPUT);
    expect(res.ok).toBe(true);
    const ttl = new Date(quotes()[0].expires_at).getTime() - Date.now();
    expect(ttl).toBeLessThanOrEqual(61_000);
    expect(ttl).toBeGreaterThan(0);
  });
});
