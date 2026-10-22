import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, rpc, from })),
}));

import {
  canPurchaseExtraCredits,
  getActivePlan,
  getAvailableBalance,
  hasEverPaid,
} from "@/lib/billing/entitlements";

/** Chainable query-builder stand-in that resolves `result` at any terminal. */
function chainFor(result: unknown) {
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) =>
          Promise.resolve(result).then(resolve);
      }
      if (prop === "single" || prop === "maybeSingle") {
        return () => Promise.resolve(result);
      }
      return () => self;
    },
  });
  return self;
}

function signIn(userId: string | null) {
  getUser.mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  from.mockImplementation(() => chainFor({ data: null, error: null }));
});

describe("getActivePlan", () => {
  it("returns null and never calls the RPC when signed out", async () => {
    signIn(null);
    expect(await getActivePlan()).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when userId does not match the session user", async () => {
    signIn("u1");
    expect(await getActivePlan("u2")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("queries the RPC for the session user and maps the plan", async () => {
    signIn("u1");
    rpc.mockResolvedValue({ data: "plan-1", error: null });
    from.mockImplementation((table: string) => {
      if (table === "plans") {
        return chainFor({
          data: {
            id: "plan-1",
            slug: "creator-monthly",
            name: "Creator",
            type: "monthly",
            credits_grant: 2000,
          },
          error: null,
        });
      }
      if (table === "subscriptions") {
        return chainFor({
          data: { current_period_end: "2030-01-01T00:00:00Z" },
          error: null,
        });
      }
      return chainFor({ data: null, error: null });
    });

    const plan = await getActivePlan();
    expect(rpc).toHaveBeenCalledWith("get_active_plan_id", {
      p_user_id: "u1",
    });
    expect(plan).toEqual({
      planId: "plan-1",
      slug: "creator-monthly",
      name: "Creator",
      type: "monthly",
      creditsGrant: 2000,
      currentPeriodEnd: "2030-01-01T00:00:00Z",
    });
  });

  it("accepts a userId equal to the session user", async () => {
    signIn("u1");
    rpc.mockResolvedValue({ data: null, error: null });
    await getActivePlan("u1");
    expect(rpc).toHaveBeenCalledWith("get_active_plan_id", {
      p_user_id: "u1",
    });
  });
});

describe("hasEverPaid", () => {
  it("fails closed to false when userId does not match the session user", async () => {
    signIn("u1");
    expect(await hasEverPaid("u2")).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("fails closed to false when signed out", async () => {
    signIn(null);
    expect(await hasEverPaid()).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
});

describe("getAvailableBalance", () => {
  it("fails closed to 0 when userId does not match the session user", async () => {
    signIn("u1");
    expect(await getAvailableBalance("u2")).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("canPurchaseExtraCredits", () => {
  it("fails closed when userId does not match the session user", async () => {
    signIn("u1");
    expect(await canPurchaseExtraCredits("u2")).toEqual({
      allowed: false,
      reason: "Please sign in to continue.",
    });
  });

  it("fails closed when signed out", async () => {
    signIn(null);
    expect(await canPurchaseExtraCredits("u1")).toEqual({
      allowed: false,
      reason: "Please sign in to continue.",
    });
  });

  it("allows the signed-in user", async () => {
    signIn("u1");
    expect(await canPurchaseExtraCredits("u1")).toEqual({
      allowed: true,
      reason: "",
    });
  });
});
