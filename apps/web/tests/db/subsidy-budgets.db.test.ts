import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asService, withDb, withDbClients } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #110 integration coverage — exercises the real Postgres
 * serialization in grant_subsidy_credits / claim_referrer_reward that the
 * mocked unit tests cannot see.
 */

async function makeProgram(
  client: Client,
  cap: number
): Promise<string> {
  const program = `test_${randomUUID().slice(0, 8)}`;
  await client.query(
    `INSERT INTO public.subsidy_budgets (program, monthly_cap_credits)
     VALUES ($1, $2)`,
    [program, cap]
  );
  return program;
}

async function grantSubsidy(
  client: Client,
  input: {
    userId: string;
    program: string;
    credits: number;
    key: string;
  }
): Promise<{ outcome: string; ledger_id: string | null }> {
  const { rows } = await client.query(
    `SELECT outcome, ledger_id
       FROM public.grant_subsidy_credits($1, $2, $3, $4, '{}'::jsonb)`,
    [input.userId, input.program, input.credits, input.key]
  );
  return rows[0];
}

async function committedOf(client: Client, program: string): Promise<number> {
  const { rows } = await client.query(
    `SELECT committed_credits FROM public.subsidy_budgets WHERE program = $1`,
    [program]
  );
  return Number(rows[0].committed_credits);
}

async function claimReward(
  client: Client,
  input: {
    referrerId: string;
    refereeId: string;
    kind: string;
    credits: number;
    sourceRef: string;
    status?: string;
    holdUntil?: string;
  }
): Promise<string> {
  const { rows } = await client.query(
    `SELECT public.claim_referrer_reward($1, $2, $3, $4, $5, $6, $7) AS outcome`,
    [
      input.referrerId,
      input.refereeId,
      input.kind,
      input.credits,
      input.sourceRef,
      input.status ?? "pending",
      input.holdUntil ?? null,
    ]
  );
  return rows[0].outcome;
}

describe("grant_subsidy_credits concurrency", () => {
  it("two different grants near the cap never overspend the budget", async () => {
    await withDbClients(2, async ([clientA, clientB]) => {
      const user = await makeUser(clientA);
      const program = await makeProgram(clientA, 100);

      const [a, b] = await Promise.all([
        asService(clientA, () =>
          grantSubsidy(clientA, {
            userId: user.userId,
            program,
            credits: 60,
            key: `t:${randomUUID()}`,
          })
        ),
        asService(clientB, () =>
          grantSubsidy(clientB, {
            userId: user.userId,
            program,
            credits: 60,
            key: `t:${randomUUID()}`,
          })
        ),
      ]);

      // 60 + 60 > 100 — exactly one grant may land.
      expect([a.outcome, b.outcome].sort()).toEqual([
        "budget_exhausted",
        "granted",
      ]);
      expect(await committedOf(clientA, program)).toBe(60);
    });
  });

  it("two identical concurrent grants produce one ledger row and one commit", async () => {
    await withDbClients(2, async ([clientA, clientB]) => {
      const user = await makeUser(clientA);
      const program = await makeProgram(clientA, 100);
      const key = `dup:${randomUUID()}`;

      const [a, b] = await Promise.all([
        asService(clientA, () =>
          grantSubsidy(clientA, {
            userId: user.userId,
            program,
            credits: 40,
            key,
          })
        ),
        asService(clientB, () =>
          grantSubsidy(clientB, {
            userId: user.userId,
            program,
            credits: 40,
            key,
          })
        ),
      ]);

      expect([a.outcome, b.outcome].sort()).toEqual(["duplicate", "granted"]);
      expect(a.ledger_id ?? b.ledger_id).toBeTruthy();

      const { rows } = await clientA.query(
        `SELECT COUNT(*)::int AS n FROM public.credit_ledger
         WHERE user_id = $1 AND idempotency_key = $2`,
        [user.userId, key]
      );
      expect(rows[0].n).toBe(1);
      expect(await committedOf(clientA, program)).toBe(40);
    });
  });
});

describe("claim_referrer_reward cap", () => {
  it("lets a slot-occupying referee claim their payment share past 15", async () => {
    await withDb(async (client) => {
      const referrer = await makeUser(client);
      const referees = await Promise.all(
        Array.from({ length: 15 }, () => makeUser(client))
      );
      for (const r of referees) {
        await client.query(
          `INSERT INTO public.referral_rewards
             (source_ref, referrer_user_id, referee_user_id, kind, credits, status)
           VALUES ($1, $2, $3, 'referrer_signup_bonus', 25, 'granted')`,
          [`t:signup:${r.userId}`, referrer.userId, r.userId]
        );
      }

      // Referee #1 is already one of the 15 — their payment share must
      // still be claimable.
      const inSlot = await asService(client, () =>
        claimReward(client, {
          referrerId: referrer.userId,
          refereeId: referees[0].userId,
          kind: "referrer_payment_share",
          credits: 100,
          sourceRef: `t:pshare:${referees[0].userId}`,
        })
      );
      expect(inSlot).toBe("claimed");

      // A 16th distinct referee is capped — the referral attributes but
      // pays the referrer nothing.
      const extra = await makeUser(client);
      const capped = await asService(client, () =>
        claimReward(client, {
          referrerId: referrer.userId,
          refereeId: extra.userId,
          kind: "referrer_signup_bonus",
          credits: 25,
          sourceRef: `t:signup:${extra.userId}`,
        })
      );
      expect(capped).toBe("capped");

      const { rows } = await client.query(
        `SELECT status FROM public.referral_rewards WHERE source_ref = $1`,
        [`t:signup:${extra.userId}`]
      );
      expect(rows[0].status).toBe("rejected");
    });
  });
});

describe("referral refund-window hold", () => {
  it("a pending_hold reward cancelled by refund never mints credits", async () => {
    await withDb(async (client) => {
      const referrer = await makeUser(client);
      const referee = await makeUser(client);
      const sourceRef = `t:pshare:${referee.userId}`;
      const holdUntil = new Date(Date.now() + 14 * 86_400_000).toISOString();

      const claimed = await asService(client, () =>
        claimReward(client, {
          referrerId: referrer.userId,
          refereeId: referee.userId,
          kind: "referrer_payment_share",
          credits: 100,
          sourceRef,
          status: "pending_hold",
          holdUntil,
        })
      );
      expect(claimed).toBe("claimed");

      // Refund inside the window — mirrors reverseReferrerShareForRefund's
      // pending/pending_hold → cancelled transition.
      const { rowCount } = await client.query(
        `UPDATE public.referral_rewards
         SET status = 'cancelled', cancelled_at = NOW()
         WHERE id = (SELECT id FROM public.referral_rewards WHERE source_ref = $1)
           AND status IN ('pending', 'pending_hold')`,
        [sourceRef]
      );
      expect(rowCount).toBe(1);

      const { rows: rewards } = await client.query(
        `SELECT status FROM public.referral_rewards WHERE source_ref = $1`,
        [sourceRef]
      );
      expect(rewards[0].status).toBe("cancelled");

      const { rows: ledger } = await client.query(
        `SELECT COUNT(*)::int AS n FROM public.credit_ledger
         WHERE idempotency_key = $1`,
        [`referral:payment_share:${referee.userId}`]
      );
      expect(ledger[0].n).toBe(0);
    });
  });
});
