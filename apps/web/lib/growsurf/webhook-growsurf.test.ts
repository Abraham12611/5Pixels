import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { FakeServiceClient } from "@/lib/billing/__tests__/helpers/fake-service-client";

const fake = new FakeServiceClient();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => fake,
}));

import { POST } from "@/app/api/webhooks/growsurf/route";

const SECRET = "gswhsec-test";
const CAMPAIGN = "camp_1";
process.env.GROWSURF_WEBHOOK_SECRET = SECRET;
process.env.GROWSURF_CAMPAIGN_ID = CAMPAIGN;

function sign(body: string) {
  const ts = String(Date.now());
  const v = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
  return `ts=${ts},v=${v}`;
}

function post(body: string, signature?: string) {
  return POST(
    new Request("http://localhost/api/webhooks/growsurf", {
      method: "POST",
      body,
      headers: signature ? { "growsurf-signature": signature } : {},
    }) as never
  );
}

function reachedGoalEvent(overrides: {
  approved?: boolean;
  isReferrer?: boolean;
  campaignId?: string;
  fraudRiskLevel?: string;
  prewId?: string;
} = {}) {
  const {
    approved = true,
    isReferrer = true,
    campaignId = CAMPAIGN,
    fraudRiskLevel = "LOW",
    prewId = "prew_1",
  } = overrides;
  return {
    event: "PARTICIPANT_REACHED_A_GOAL",
    createdAt: Date.now(),
    data: {
      participant: {
        id: "gs-ref-1",
        email: "referrer@example.com",
        fraudRiskLevel,
        metadata: { spxUserId: "ref-1" },
        referee: {
          id: "gs-buyer-1",
          email: "buyer@example.com",
          metadata: { spxUserId: "buyer-1" },
        },
      },
      reward: {
        id: prewId,
        rewardId: "crew_1",
        isReferrer,
        approved,
        referrerId: "gs-ref-1",
        referredId: "gs-buyer-1",
      },
      campaign: { id: campaignId, type: "REFERRAL" },
    },
  };
}

function seedReferralState() {
  fake.seed("profiles", [
    { id: "ref-1", email: "referrer@example.com" },
    { id: "buyer-1", email: "buyer@example.com" },
  ]);
  fake.seed("referral_participants", [
    { user_id: "ref-1", growsurf_id: "gs-ref-1" },
    { user_id: "buyer-1", growsurf_id: "gs-buyer-1", referred_by: "ref-1" },
  ]);
  fake.seed("referral_rewards", [
    {
      id: "rw-1",
      source_ref: "payment_share:buyer-1",
      referrer_user_id: "ref-1",
      referee_user_id: "buyer-1",
      kind: "referrer_payment_share",
      credits: 300,
      status: "pending_hold",
      hold_until: "2099-01-01T00:00:00Z",
    },
  ]);
}

beforeEach(() => {
  fake.db.clear();
  seedReferralState();
});

describe("growsurf webhook route", () => {
  it("grants a held referrer reward on approved PARTICIPANT_REACHED_A_GOAL", async () => {
    const body = JSON.stringify(reachedGoalEvent());
    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    const ledger = fake.table("credit_ledger");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].user_id).toBe("ref-1");
    expect(ledger[0].amount).toBe(300);

    const reward = fake.table("referral_rewards")[0];
    expect(reward.status).toBe("granted");
    expect(reward.growsurf_prew_id).toBe("prew_1");
    expect(reward.hold_until).toBeNull();
  });

  it("is idempotent — replayed deliveries grant exactly once", async () => {
    const body = JSON.stringify(reachedGoalEvent());
    const sig = sign(body);
    for (let i = 0; i < 3; i++) {
      const res = await post(body, sig);
      expect(res.status).toBe(200);
    }
    expect(fake.table("credit_ledger")).toHaveLength(1);
    expect(
      fake.table("referral_rewards").filter((r) => r.status === "granted")
    ).toHaveLength(1);
  });

  it("skips unapproved rewards (manual approval pending)", async () => {
    const body = JSON.stringify(reachedGoalEvent({ approved: false }));
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("referral_rewards")[0].status).toBe("pending_hold");
  });

  it("ignores referee-side reward events (unlock is granted locally)", async () => {
    const body = JSON.stringify(reachedGoalEvent({ isReferrer: false }));
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("ignores events for other campaigns", async () => {
    const body = JSON.stringify(reachedGoalEvent({ campaignId: "other" }));
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects rewards for HIGH-fraud referrers", async () => {
    const body = JSON.stringify(reachedGoalEvent({ fraudRiskLevel: "HIGH" }));
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("referral_rewards")[0].status).toBe("rejected");
  });

  it("attaches prew id without re-granting when the row settled locally", async () => {
    fake
      .table("referral_rewards")
      .forEach((r) => (r.status = "granted"));
    const body = JSON.stringify(reachedGoalEvent());
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    // Ledger was already written by the local path — webhook adds nothing.
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("referral_rewards")[0].growsurf_prew_id).toBe("prew_1");
  });

  it("does not grant a cancelled reward (refund cancelled the trigger)", async () => {
    fake
      .table("referral_rewards")
      .forEach((r) => (r.status = "cancelled"));
    const body = JSON.stringify(reachedGoalEvent());
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    expect(fake.table("credit_ledger")).toHaveLength(0);
    expect(fake.table("referral_rewards")[0].status).toBe("cancelled");
  });

  it("rejects an invalid signature with 401 and writes nothing", async () => {
    const body = JSON.stringify(reachedGoalEvent());
    const res = await post(body, `ts=${Date.now()},v=bogus`);
    expect(res.status).toBe(401);
    expect(fake.table("credit_ledger")).toHaveLength(0);
  });

  it("rejects unsigned requests", async () => {
    const body = JSON.stringify(reachedGoalEvent());
    const res = await post(body);
    expect(res.status).toBe(401);
  });

  it("backfills growsurf_id on NEW_PARTICIPANT_ADDED", async () => {
    fake.seed("referral_participants", [
      { user_id: "ref-1", growsurf_id: "gs-ref-1" },
      { user_id: "buyer-1", growsurf_id: null, referred_by: "ref-1" },
    ]);
    const body = JSON.stringify({
      event: "NEW_PARTICIPANT_ADDED",
      createdAt: Date.now(),
      data: {
        id: "gs-buyer-1",
        email: "buyer@example.com",
        referralSource: "PARTICIPANT",
        referrer: { id: "gs-ref-1", email: "referrer@example.com" },
      },
    });
    const res = await post(body, sign(body));
    expect(res.status).toBe(200);
    const participant = fake
      .table("referral_participants")
      .find((p) => p.user_id === "buyer-1")!;
    expect(participant.growsurf_id).toBe("gs-buyer-1");
  });
});
