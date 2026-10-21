import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asAnon, asService, asUser, withDb, withDbClients } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #247 — one active/past_due recurring (monthly/annual)
 * subscription per user. Exercises the real trigger
 * (enforce_single_recurring_subscription + per-user advisory lock),
 * the has_active_recurring_subscription RPC, and the idempotency
 * surface the Bachs webhook relies on — no mocks anywhere.
 */

async function makePlan(client: Client, type: string): Promise<string> {
  const planId = randomUUID();
  await client.query(
    `INSERT INTO public.plans
       (id, slug, name, type, price_cents, markup_multiplier, credit_drip_months)
     VALUES ($1, $2, $3, $4, 100, 4, $5)`,
    [
      planId,
      `dbtest-${planId.slice(0, 8)}`,
      `DB Test ${type}`,
      type,
      type === "annual" ? 12 : 1,
    ]
  );
  return planId;
}

const INSERT_SUB = `INSERT INTO public.subscriptions
   (user_id, plan_id, status, bachs_subscription_id,
    current_period_start, current_period_end)
 VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days')`;

async function giveRecurringSubscription(
  client: Client,
  userId: string,
  planId: string,
  status = "active",
  bachsId = `sub_${randomUUID()}`
): Promise<void> {
  await client.query(INSERT_SUB, [userId, planId, status, bachsId]);
}

const hasRecurring = `SELECT public.has_active_recurring_subscription($1::uuid) AS has`;

describe("single recurring subscription (#247)", () => {
  it("rejects two concurrent different subscription ids — only one survives", async () => {
    await withDbClients(2, async ([c1, c2]) => {
      const { userId } = await makeUser(c1);
      const planA = await makePlan(c1, "monthly");
      const planB = await makePlan(c1, "annual");

      // c1 holds the per-user advisory lock inside its open transaction;
      // c2's insert blocks on the lock, then re-checks against committed
      // state and must lose.
      await c1.query("BEGIN");
      await c1.query(INSERT_SUB, [userId, planA, "active", `sub_a_${randomUUID()}`]);
      await c2.query("BEGIN");
      const loser = c2.query(INSERT_SUB, [
        userId,
        planB,
        "active",
        `sub_b_${randomUUID()}`,
      ]);
      await c1.query("COMMIT");
      await expect(loser).rejects.toThrow(/single_recurring_plan/);
      await c2.query("ROLLBACK").catch(() => {});

      const res = await c1.query(
        `SELECT count(*)::int AS n FROM public.subscriptions WHERE user_id = $1`,
        [userId]
      );
      expect(res.rows[0].n).toBe(1);
    });
  });

  it("replaying the same subscription id stays a single row (idempotent)", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const planId = await makePlan(client, "monthly");
      const bachsId = `sub_${randomUUID()}`;

      await giveRecurringSubscription(client, userId, planId, "active", bachsId);

      // Upsert-style replay (subscription.updated for the same id) is a
      // plain UPDATE — no conflict, no second row.
      await client.query(
        `UPDATE public.subscriptions
         SET status = 'active', current_period_end = NOW() + INTERVAL '60 days',
             updated_at = NOW()
         WHERE bachs_subscription_id = $1`,
        [bachsId]
      );

      // A literal duplicate insert of the same provider id is rejected —
      // either by the recurring trigger (it fires first here) or the
      // unique index on bachs_subscription_id. Never a second row.
      const dup = await client
        .query(INSERT_SUB, [userId, planId, "active", bachsId])
        .then(() => null)
        .catch((e: { code?: string }) => e);
      expect(dup).not.toBeNull();

      const res = await client.query(
        `SELECT count(*)::int AS n FROM public.subscriptions WHERE user_id = $1`,
        [userId]
      );
      expect(res.rows[0].n).toBe(1);
    });
  });

  it("active Creator blocks a second Pro/Studio recurring subscription", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const creator = await makePlan(client, "monthly");
      const pro = await makePlan(client, "annual");
      await giveRecurringSubscription(client, userId, creator);

      const err = await client
        .query(INSERT_SUB, [userId, pro, "active", `sub_${randomUUID()}`])
        .catch((e) => e);
      expect(String(err.message)).toMatch(/single_recurring_plan/);

      // And the checkout guard's predicate agrees the slot is occupied.
      const res = await asUser(client, userId, () =>
        client.query(hasRecurring, [userId])
      );
      expect(res.rows[0].has).toBe(true);
    });
  });

  it("past_due still occupies the recurring slot", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const monthly = await makePlan(client, "monthly");
      const other = await makePlan(client, "annual");
      await giveRecurringSubscription(client, userId, monthly, "past_due");

      const err = await client
        .query(INSERT_SUB, [userId, other, "active", `sub_${randomUUID()}`])
        .catch((e) => e);
      expect(String(err.message)).toMatch(/single_recurring_plan/);
    });
  });

  it("top-ups remain allowed while subscribed", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const monthly = await makePlan(client, "monthly");
      const pack = await makePlan(client, "extra_credit");
      await giveRecurringSubscription(client, userId, monthly);

      // The recurring invariant does not gate invoices or credit grants:
      // a top-up lands as a paid invoice plus a purchase ledger entry.
      await client.query(
        `INSERT INTO public.invoices (user_id, plan_id, amount_cents, status)
         VALUES ($1, $2, 500, 'paid')`,
        [userId, pack]
      );
      await client.query(
        `INSERT INTO public.credit_ledger
           (user_id, entry_type, amount, idempotency_key, metadata)
         VALUES ($1, 'purchase', 1000, $2, '{"source":"db-test"}'::jsonb)`,
        [userId, `topup:${randomUUID()}`]
      );

      // …and an extra_credit subscription row (if a provider ever writes
      // one) never trips the recurring invariant.
      await client.query(INSERT_SUB, [
        userId,
        pack,
        "active",
        `sub_${randomUUID()}`,
      ]);
    });
  });

  it("cancelled or expired subscriptions free the slot for a new plan", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const monthly = await makePlan(client, "monthly");
      const annual = await makePlan(client, "annual");
      const bachsId = `sub_${randomUUID()}`;
      await giveRecurringSubscription(client, userId, monthly, "active", bachsId);

      // Cancellation is always writable — it is the recovery path.
      await client.query(
        `UPDATE public.subscriptions SET status = 'cancelled' WHERE bachs_subscription_id = $1`,
        [bachsId]
      );
      await client.query(INSERT_SUB, [
        userId,
        annual,
        "active",
        `sub_${randomUUID()}`,
      ]);

      // Expired frees the slot the same way.
      await client.query(
        `UPDATE public.subscriptions SET status = 'expired' WHERE plan_id = $1`,
        [annual]
      );
      const again = await makePlan(client, "monthly");
      await client.query(INSERT_SUB, [
        userId,
        again,
        "active",
        `sub_${randomUUID()}`,
      ]);

      const res = await asUser(client, userId, () =>
        client.query(hasRecurring, [userId])
      );
      expect(res.rows[0].has).toBe(true);
    });
  });

  it("weekly-pass subscriptions never occupy the recurring slot (rules unchanged)", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const weeklyA = await makePlan(client, "weekly_trial");
      const weeklyB = await makePlan(client, "weekly_trial");
      const monthly = await makePlan(client, "monthly");

      // Two active weekly rows coexist — the trigger only looks at
      // monthly/annual plans.
      await giveRecurringSubscription(client, userId, weeklyA);
      await giveRecurringSubscription(client, userId, weeklyB);

      // …and an active weekly pass doesn't block a monthly plan either.
      await client.query(INSERT_SUB, [
        userId,
        monthly,
        "active",
        `sub_${randomUUID()}`,
      ]);

      // The RPC ignores weekly rows: only the monthly sub registers.
      const res = await asUser(client, userId, () =>
        client.query(hasRecurring, [userId])
      );
      expect(res.rows[0].has).toBe(true);
    });
  });
});

describe("has_active_recurring_subscription authorization", () => {
  it("answers for the subject and service_role, denies cross-account and anon", async () => {
    await withDb(async (client) => {
      const { userId: a } = await makeUser(client);
      const { userId: b } = await makeUser(client);
      const planId = await makePlan(client, "monthly");
      await giveRecurringSubscription(client, a, planId);

      // Self.
      const own = await asUser(client, a, () => client.query(hasRecurring, [a]));
      expect(own.rows[0].has).toBe(true);

      // Cross-account.
      const cross = await asUser(client, b, () =>
        client.query(hasRecurring, [a])
      ).catch((e) => e);
      expect(cross.code).toBe("42501");

      // Anon — no EXECUTE at all.
      const anon = await asAnon(client, () =>
        client.query(hasRecurring, [a])
      ).catch((e) => e);
      expect(anon.code).toBe("42501");

      // Service role (webhook/admin paths).
      const svc = await asService(client, () => client.query(hasRecurring, [a]));
      expect(svc.rows[0].has).toBe(true);
    });
  });
});
