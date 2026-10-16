import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { asAnon, asService, asUser, withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #139 — public.get_active_plan_id(p_user_id) must only answer for the
 * JWT subject (or service_role). These tests call the real SECURITY DEFINER
 * function through impersonated PostgREST roles.
 */

async function makePlan(
  client: import("pg").Client,
  type: string
): Promise<string> {
  const planId = randomUUID();
  await client.query(
    `INSERT INTO public.plans (id, slug, name, type, price_cents, markup_multiplier)
     VALUES ($1, $2, $3, $4, 100, 4)`,
    [planId, `dbtest-${planId.slice(0, 8)}`, `DB Test ${type}`, type]
  );
  return planId;
}

async function giveSubscription(
  client: import("pg").Client,
  userId: string,
  planId: string
): Promise<void> {
  await client.query(
    `INSERT INTO public.subscriptions
       (user_id, plan_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days')`,
    [userId, planId]
  );
}

async function givePaidInvoice(
  client: import("pg").Client,
  userId: string,
  planId: string
): Promise<void> {
  await client.query(
    `INSERT INTO public.invoices (user_id, plan_id, amount_cents, status)
     VALUES ($1, $2, 500, 'paid')`,
    [userId, planId]
  );
}

const planOf = `SELECT public.get_active_plan_id($1::uuid) AS plan_id`;

describe("get_active_plan_id authorization (#139)", () => {
  it("returns the plan for the subject's own active subscription", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const planId = await makePlan(client, "monthly");
      await giveSubscription(client, userId, planId);

      const res = await asUser(client, userId, () => client.query(planOf, [userId]));
      expect(res.rows[0].plan_id).toBe(planId);
    });
  });

  it("falls back to a recent paid weekly_trial invoice", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const planId = await makePlan(client, "weekly_trial");
      await givePaidInvoice(client, userId, planId);

      const res = await asUser(client, userId, () => client.query(planOf, [userId]));
      expect(res.rows[0].plan_id).toBe(planId);
    });
  });

  it("returns NULL for a user with no plan, for themselves", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);

      const res = await asUser(client, userId, () => client.query(planOf, [userId]));
      expect(res.rows[0].plan_id).toBeNull();
    });
  });

  it("rejects a cross-account lookup with SQLSTATE 42501", async () => {
    await withDb(async (client) => {
      const { userId: a } = await makeUser(client);
      const { userId: b } = await makeUser(client);
      const planId = await makePlan(client, "monthly");
      await giveSubscription(client, a, planId);

      const err = await asUser(client, b, () =>
        client.query(planOf, [a])
      ).catch((e) => e);
      expect(err.code).toBe("42501");
    });
  });

  it("denies EXECUTE to the anon role entirely", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const planId = await makePlan(client, "monthly");
      await giveSubscription(client, userId, planId);

      const err = await asAnon(client, () =>
        client.query(planOf, [userId])
      ).catch((e) => e);
      // permission denied for function get_active_plan_id
      expect(err.code).toBe("42501");
      expect(String(err.message)).toMatch(/permission denied/i);
    });
  });

  it("still resolves any user for service_role callers", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const planId = await makePlan(client, "monthly");
      await giveSubscription(client, userId, planId);

      const res = await asService(client, () => client.query(planOf, [userId]));
      expect(res.rows[0].plan_id).toBe(planId);
    });
  });

  it("rejects a NULL p_user_id", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);

      const err = await asUser(client, userId, () =>
        client.query(`SELECT public.get_active_plan_id(NULL) AS plan_id`)
      ).catch((e) => e);
      expect(err.code).toBe("42501");
    });
  });
});
