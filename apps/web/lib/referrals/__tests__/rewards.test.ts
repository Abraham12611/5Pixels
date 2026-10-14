import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "../../billing/__tests__/helpers/fake-service-client";

const fake = new FakeServiceClient();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

import {
  grantReferrerSignupBonus,
  grantRefereeSignupBonus,
  grantReferrerPaymentShare,
  releaseDueReferralHolds,
  REFERRER_SIGNUP_BONUS,
  REFEREE_SIGNUP_BONUS,
} from "../rewards";

type Row = Record<string, string | number | boolean | null>;

const rpcCalls: Array<{ fn: string; args: Row }> = [];

function stubClaim(outcome: "claimed" | "capped" | "duplicate") {
  fake.rpcHandlers.set("claim_referrer_reward", (args) => {
    rpcCalls.push({ fn: "claim_referrer_reward", args });
    if (outcome === "claimed") {
      // The real RPC inserts the pending row atomically — mirror that so
      // the settle step has a row to update. (fake.table() returns a
      // detached [] when unseeded, so write via seed.)
      const rows = fake.table("referral_rewards");
      fake.seed("referral_rewards", [
        ...rows,
        {
          id: `rw-${rows.length + 1}`,
          source_ref: args.p_source_ref,
          referrer_user_id: args.p_referrer_id,
          referee_user_id: args.p_referee_id,
          kind: args.p_kind,
          credits: args.p_credits,
          status: args.p_status ?? "pending",
          hold_until: args.p_hold_until ?? null,
        },
      ]);
    }
    return outcome;
  });
}

function stubSubsidy(outcome: "granted" | "duplicate" | "budget_exhausted") {
  fake.rpcHandlers.set("grant_subsidy_credits", (args) => {
    rpcCalls.push({ fn: "grant_subsidy_credits", args });
    return [
      {
        outcome,
        ledger_id: outcome === "granted" ? "ledger-1" : null,
      },
    ];
  });
}

beforeEach(() => {
  fake.db.clear();
  fake.rpcHandlers.clear();
  rpcCalls.length = 0;
  vi.unstubAllEnvs();
});

describe("grantReferrerSignupBonus", () => {
  it("claims a slot and settles via the referral budget", async () => {
    stubClaim("claimed");
    stubSubsidy("granted");

    await grantReferrerSignupBonus("referrer-1", "referee-1");

    expect(rpcCalls[0].fn).toBe("claim_referrer_reward");
    expect(rpcCalls[0].args).toMatchObject({
      p_referrer_id: "referrer-1",
      p_referee_id: "referee-1",
      p_kind: "referrer_signup_bonus",
      p_credits: REFERRER_SIGNUP_BONUS,
    });
    const grant = rpcCalls.find((c) => c.fn === "grant_subsidy_credits");
    expect(grant?.args).toMatchObject({
      p_user_id: "referrer-1",
      p_program: "referral_budget",
      p_credits: REFERRER_SIGNUP_BONUS,
    });
    expect(fake.table("referral_rewards")[0]).toMatchObject({
      status: "granted",
      ledger_entry_id: "ledger-1",
    });
  });

  it("mints nothing when the referrer is past the 15-referral cap", async () => {
    stubClaim("capped");
    stubSubsidy("granted");

    await grantReferrerSignupBonus("referrer-1", "referee-16");

    expect(
      rpcCalls.some((c) => c.fn === "grant_subsidy_credits")
    ).toBe(false);
  });

  it("marks the reward rejected when the referral budget is exhausted", async () => {
    stubClaim("claimed");
    stubSubsidy("budget_exhausted");

    await grantReferrerSignupBonus("referrer-1", "referee-1");

    expect(fake.table("referral_rewards")[0].status).toBe("rejected");
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("does not re-grant on duplicate delivery", async () => {
    stubClaim("duplicate");
    stubSubsidy("granted");

    await grantReferrerSignupBonus("referrer-1", "referee-1");

    expect(
      rpcCalls.some((c) => c.fn === "grant_subsidy_credits")
    ).toBe(false);
  });
});

describe("grantRefereeSignupBonus", () => {
  it("still grants the referee bonus when the referrer is capped", async () => {
    // The referee-side incentive is a separate program — a referrer past
    // 15 never blocks the new user's joining bonus (issue #110 decision).
    stubClaim("capped"); // would be 'capped' if consulted at all
    stubSubsidy("granted");

    await grantRefereeSignupBonus("referee-16", "referrer-1");

    expect(
      rpcCalls.some((c) => c.fn === "claim_referrer_reward")
    ).toBe(false);
    const grant = rpcCalls.find((c) => c.fn === "grant_subsidy_credits");
    expect(grant?.args).toMatchObject({
      p_user_id: "referee-16",
      p_program: "referral_referee",
      p_credits: REFEREE_SIGNUP_BONUS,
    });
    expect(fake.table("referral_rewards")[0]).toMatchObject({
      kind: "referee_signup_bonus",
      status: "granted",
    });
  });

  it("releases the pending claim when the referee budget is exhausted", async () => {
    stubSubsidy("budget_exhausted");

    await grantRefereeSignupBonus("referee-1", "referrer-1");

    // The row is deleted (not rejected) so a retry next period can grant.
    expect(fake.table("referral_rewards")).toHaveLength(0);
  });
});

describe("grantReferrerPaymentShare", () => {
  const plan = { id: "pro", credits_grant: 1090, type: "monthly" };

  beforeEach(() => {
    fake.seed("referral_participants", [
      { user_id: "buyer-1", referred_by: "referrer-1" },
    ]);
  });

  it("claims 30% of the plan grant as a refund-window hold", async () => {
    stubClaim("claimed");
    stubSubsidy("granted");

    await grantReferrerPaymentShare("buyer-1", plan, "order-1");

    const claim = rpcCalls.find((c) => c.fn === "claim_referrer_reward");
    expect(claim?.args).toMatchObject({
      p_referrer_id: "referrer-1",
      p_kind: "referrer_payment_share",
      p_credits: 327, // floor(1090 * 0.3)
      p_status: "pending_hold",
    });
    expect(claim?.args.p_hold_until).toBeTruthy();
    // No credits mint until the hold releases — a refund cancels the row.
    expect(
      rpcCalls.some((c) => c.fn === "grant_subsidy_credits")
    ).toBe(false);
    expect(fake.table("referral_rewards")[0].status).toBe("pending_hold");
  });

  it("settles immediately when the hold is disabled", async () => {
    vi.stubEnv("REFERRAL_PAYMENT_SHARE_HOLD_DAYS", "0");
    stubClaim("claimed");
    stubSubsidy("granted");

    await grantReferrerPaymentShare("buyer-1", plan, "order-1");

    const grant = rpcCalls.find((c) => c.fn === "grant_subsidy_credits");
    expect(grant?.args).toMatchObject({
      p_user_id: "referrer-1",
      p_program: "referral_budget",
      p_credits: 327,
    });
    expect(fake.table("referral_rewards")[0].status).toBe("granted");
  });

  it("skips top-ups entirely — they are not plan upgrades", async () => {
    await grantReferrerPaymentShare(
      "buyer-1",
      { id: "pack", credits_grant: 606, type: "extra_credit" },
      "order-2"
    );
    expect(rpcCalls).toHaveLength(0);
  });

  it("mints nothing when the referrer is past the cap", async () => {
    stubClaim("capped");
    stubSubsidy("granted");

    await grantReferrerPaymentShare("buyer-1", plan, "order-3");

    expect(
      rpcCalls.some((c) => c.fn === "grant_subsidy_credits")
    ).toBe(false);
  });
});

describe("releaseDueReferralHolds", () => {
  const heldRow = {
    id: "rw-held",
    source_ref: "payment_share:buyer-1",
    referrer_user_id: "referrer-1",
    referee_user_id: "buyer-1",
    kind: "referrer_payment_share",
    credits: 327,
    status: "pending_hold",
    hold_until: new Date(Date.now() - 86_400_000).toISOString(), // due
  };

  it("settles a due hold through the atomic release RPC", async () => {
    fake.seed("referral_rewards", [{ ...heldRow }]);
    fake.rpcHandlers.set("release_referral_hold", (args) => {
      rpcCalls.push({ fn: "release_referral_hold", args });
      return [{ outcome: "granted", ledger_id: "ledger-1" }];
    });

    const result = await releaseDueReferralHolds();

    expect(result).toEqual({ released: 1, retried: 0 });
    expect(rpcCalls[0]).toMatchObject({
      fn: "release_referral_hold",
      args: { p_source_ref: "payment_share:buyer-1" },
    });
    // Grant + status flip happen inside the RPC — no separate update.
    expect(
      rpcCalls.some((c) => c.fn === "grant_subsidy_credits")
    ).toBe(false);
  });

  it("leaves the hold pending for retry when the budget is exhausted", async () => {
    fake.seed("referral_rewards", [{ ...heldRow }]);
    fake.rpcHandlers.set("release_referral_hold", (args) => {
      rpcCalls.push({ fn: "release_referral_hold", args });
      return [{ outcome: "budget_exhausted", ledger_id: null }];
    });

    const result = await releaseDueReferralHolds();

    expect(result).toEqual({ released: 0, retried: 1 });
    expect(fake.table("referral_rewards")[0].status).toBe("pending_hold");
  });

  it("skips holds the refund path already cancelled", async () => {
    fake.seed("referral_rewards", [{ ...heldRow }]);
    fake.rpcHandlers.set("release_referral_hold", (args) => {
      rpcCalls.push({ fn: "release_referral_hold", args });
      return [{ outcome: "cancelled", ledger_id: null }];
    });

    const result = await releaseDueReferralHolds();

    expect(result).toEqual({ released: 0, retried: 0 });
  });

  it("skips holds whose window has not elapsed", async () => {
    fake.seed("referral_rewards", [
      { ...heldRow, hold_until: new Date(Date.now() + 86_400_000).toISOString() },
    ]);
    stubSubsidy("granted");

    const result = await releaseDueReferralHolds();

    expect(result).toEqual({ released: 0, retried: 0 });
    expect(rpcCalls).toHaveLength(0);
  });
});
