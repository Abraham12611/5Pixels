import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const getActivePricingPolicy = vi.fn();
const getFreshSnapshot = vi.fn();
const getEndpointState = vi.fn();

vi.mock("@/lib/pricing/policy", () => ({
  getActivePricingPolicy: (...args: unknown[]) =>
    getActivePricingPolicy(...args),
}));
vi.mock("@/lib/pricing/snapshots", () => ({
  getFreshSnapshot: (...args: unknown[]) => getFreshSnapshot(...args),
  getEndpointState: (...args: unknown[]) => getEndpointState(...args),
}));

import { assertVersionQuotable } from "./route-publish-check";

const service = {} as SupabaseClient;

const NB2 = {
  primary_provider: "fal.ai",
  primary_model: "nano-banana-2/edit",
};

function version(overrides: Record<string, unknown> = {}) {
  return {
    provider_strategy: NB2,
    model_config: {},
    output_sizes: [{ width: 1024, height: 1536 }],
    ...overrides,
  };
}

/** Real snapshot payloads for the verified routes (per-image billing). */
const FLAT_PAYLOAD = {
  currency: "USD",
  pricing_type: "flat_per_request",
  unit_price: 0.08,
};
const CHEAP_PAYLOAD = {
  currency: "USD",
  pricing_type: "flat_per_request",
  unit_price: 0.04,
};
const EXPENSIVE_PAYLOAD = {
  currency: "USD",
  pricing_type: "flat_per_request",
  unit_price: 0.5,
};
const UNSAFE_PAYLOAD = {
  currency: "USD",
  pricing_type: "unsupported",
  unit_price: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  getActivePricingPolicy.mockResolvedValue({
    quoteMaxSlackFactor: 1.15,
  });
  getEndpointState.mockResolvedValue("active");
  getFreshSnapshot.mockResolvedValue({ payload: FLAT_PAYLOAD });
});

describe("assertVersionQuotable", () => {
  it("passes for a quotable primary route", async () => {
    await expect(
      assertVersionQuotable(service, version())
    ).resolves.toBeUndefined();
  });

  it("rejects when the primary model cannot resolve to an endpoint", async () => {
    await expect(
      assertVersionQuotable(
        service,
        version({
          provider_strategy: { primary_provider: "unknown", primary_model: "x" },
        })
      )
    ).rejects.toThrow(/does not resolve/);
  });

  it("rejects with no active pricing policy", async () => {
    getActivePricingPolicy.mockResolvedValue(null);
    await expect(
      assertVersionQuotable(service, version())
    ).rejects.toThrow(/no active pricing policy/i);
  });

  it("rejects a suspended endpoint", async () => {
    getEndpointState.mockResolvedValue("suspended");
    await expect(
      assertVersionQuotable(service, version())
    ).rejects.toThrow(/suspended/i);
  });

  it("rejects a route with no fresh pricing snapshot", async () => {
    getFreshSnapshot.mockResolvedValue(null);
    await expect(
      assertVersionQuotable(service, version())
    ).rejects.toThrow(/no fresh pricing snapshot/i);
  });

  it("rejects an unquotable pricing payload", async () => {
    getFreshSnapshot.mockResolvedValue({ payload: UNSAFE_PAYLOAD });
    await expect(
      assertVersionQuotable(service, version())
    ).rejects.toThrow(/not quotable/i);
  });

  it("rejects an unreachable declared fallback", async () => {
    getFreshSnapshot.mockImplementation(async (_s: unknown, _p: unknown, endpoint: string) =>
      endpoint === "fal-ai/nano-banana/edit" ? null : { payload: FLAT_PAYLOAD }
    );
    await expect(
      assertVersionQuotable(
        service,
        version({
          provider_strategy: {
            ...NB2,
            fallback_provider: "fal.ai",
            fallback_model: "nano-banana/edit",
          },
        })
      )
    ).rejects.toThrow(/fallback route.*unreachable/i);
  });

  it("rejects a fallback whose worst case exceeds the primary envelope", async () => {
    getFreshSnapshot.mockImplementation(async (_s: unknown, _p: unknown, endpoint: string) =>
      endpoint === "fal-ai/nano-banana-pro/edit"
        ? { payload: EXPENSIVE_PAYLOAD }
        : { payload: CHEAP_PAYLOAD }
    );
    await expect(
      assertVersionQuotable(
        service,
        version({
          provider_strategy: {
            ...NB2,
            fallback_provider: "fal.ai",
            fallback_model: "nano-banana-pro/edit",
          },
        })
      )
    ).rejects.toThrow(/price envelope/i);
  });

  it("accepts a cheaper fallback inside the primary envelope", async () => {
    getFreshSnapshot.mockImplementation(async (_s: unknown, _p: unknown, endpoint: string) =>
      endpoint === "fal-ai/nano-banana/edit"
        ? { payload: CHEAP_PAYLOAD }
        : { payload: FLAT_PAYLOAD }
    );
    await expect(
      assertVersionQuotable(
        service,
        version({
          provider_strategy: {
            ...NB2,
            fallback_provider: "fal.ai",
            fallback_model: "nano-banana/edit",
          },
        })
      )
    ).resolves.toBeUndefined();
  });
});
