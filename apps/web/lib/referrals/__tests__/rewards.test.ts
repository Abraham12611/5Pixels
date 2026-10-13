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
          status: "pending",
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

  it("pays 30% of the plan grant through the referral budget", async () => {
    stubClaim("claimed");
    stubSubsidy("granted");

    await grantReferrerPaymentShare("buyer-1", plan, "order-1");

    const claim = rpcCalls.find((c) => c.fn === "claim_referrer_reward");
    expect(claim?.args).toMatchObject({
      p_referrer_id: "referrer-1",
      p_kind: "referrer_payment_share",
      p_credits: 327, // floor(1090 * 0.3)
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
