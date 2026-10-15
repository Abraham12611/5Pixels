import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "./helpers/fake-service-client";

const fake = new FakeServiceClient();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/admin", () => ({
  requireAdminOrOwner: vi.fn(async () => undefined),
}));
vi.mock("@/lib/db/audit", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

import { claimRetentionCredits } from "../retention";
import { RETENTION_CREDITS } from "../retention-shared";
import { adjustUserCredits } from "@/lib/db/support";

type Row = Record<string, string | number | boolean | null>;
const rpcCalls: Array<{ fn: string; args: Row }> = [];

function stubSubsidy(outcome: "granted" | "duplicate" | "budget_exhausted") {
  fake.rpcHandlers.set("grant_subsidy_credits", (args) => {
    rpcCalls.push({ fn: "grant_subsidy_credits", args });
    return [{ outcome, ledger_id: outcome === "granted" ? "led-1" : null }];
  });
}

function seedActiveSub() {
  fake.seed("subscriptions", [
    {
      id: "sub-1",
      user_id: "user-1",
      plan_id: "plan-1",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: "2026-11-01T00:00:00Z",
    },
  ]);
  fake.seed("plans", [{ id: "plan-1", type: "monthly" }]);
}

beforeEach(() => {
  fake.db.clear();
  fake.rpcHandlers.clear();
  rpcCalls.length = 0;
});

describe("claimRetentionCredits", () => {
  it("grants through the retention subsidy budget", async () => {
    seedActiveSub();
    stubSubsidy("granted");

    const res = await claimRetentionCredits();

    expect(res).toEqual({ ok: true, credits: RETENTION_CREDITS, already: false });
    expect(rpcCalls[0].args).toMatchObject({
      p_user_id: "user-1",
      p_program: "retention",
      p_credits: RETENTION_CREDITS,
      p_idempotency_key: "retention:sub-1",
    });
  });

  it("treats a replay as already-claimed, not a second grant", async () => {
    seedActiveSub();
    stubSubsidy("duplicate");

    const res = await claimRetentionCredits();
    expect(res).toEqual({ ok: true, credits: RETENTION_CREDITS, already: true });
  });

  it("fails closed when the retention budget is exhausted", async () => {
    seedActiveSub();
    stubSubsidy("budget_exhausted");

    const res = await claimRetentionCredits();
    expect(res.ok).toBe(false);
  });

  it("refuses users whose plan is already cancelling", async () => {
    seedActiveSub();
    fake.db.set("subscriptions", [
      { ...fake.table("subscriptions")[0], cancel_at_period_end: true },
    ]);

    const res = await claimRetentionCredits();
    expect(res.ok).toBe(false);
    expect(rpcCalls).toHaveLength(0);
  });
});

describe("adjustUserCredits", () => {
  beforeEach(() => {
    fake.seed("profiles", [{ id: "user-1", email: "u@example.com" }]);
    fake.seed("credit_ledger", [
      { user_id: "user-1", amount: 100, entry_type: "allocation" },
    ]);
  });

  it("routes positive grants through the admin_manual budget", async () => {
    stubSubsidy("granted");

    const res = await adjustUserCredits("user-1", 25, "goodwill credit", "k1");

    expect(res.success).toBe(true);
    expect(rpcCalls[0].args).toMatchObject({
      p_user_id: "user-1",
      p_program: "admin_manual",
      p_credits: 25,
      p_idempotency_key: "k1",
    });
    expect(rpcCalls[0].args.p_metadata).toMatchObject({
      admin_adjustment: true,
      reason: "goodwill credit",
    });
  });

  it("fails closed when the manual-grant budget is exhausted", async () => {
    stubSubsidy("budget_exhausted");

    const res = await adjustUserCredits("user-1", 25, "goodwill credit", "k2");

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/budget/i);
  });

  it("reports a duplicate key as already processed", async () => {
    stubSubsidy("duplicate");

    const res = await adjustUserCredits("user-1", 25, "goodwill credit", "k3");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already processed/i);
  });

  it("deductions bypass the subsidy system entirely", async () => {
    const res = await adjustUserCredits("user-1", -40, "fraud reversal", "k4");

    expect(res.success).toBe(true);
    expect(rpcCalls).toHaveLength(0);
    expect(fake.table("credit_ledger").at(-1)).toMatchObject({
      amount: -40,
      entry_type: "adjustment",
    });
  });

  it("still refuses to overdraw on deductions", async () => {
    const res = await adjustUserCredits("user-1", -500, "fraud reversal", "k5");
    expect(res.success).toBe(false);
    expect(rpcCalls).toHaveLength(0);
  });
});
