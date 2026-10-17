import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { asAnon, asUser, withDb } from "./helpers/db";
import {
  createGeneration,
  grantCredits,
  ledgerOf,
  makeAsset,
  makeProduct,
  makeQuote,
  makeSnapshot,
  makeUser,
} from "./helpers/fixtures";

/**
 * Issue #139 — hosted-DB drift convergence (migration
 * 20261023000003_converge_hosted_drift.sql). Policies must use the
 * SECURITY DEFINER public.is_admin() so profiles_read_self no longer
 * recurses on itself, and the reservation ledger key carries the
 * 'reserve:' prefix.
 */

/**
 * The privilege-escalation guard (prevent_profile_privilege_escalation) is a
 * BEFORE UPDATE trigger — a user cannot be promoted after creation. Same
 * approach as article-media.db.test.ts: seed is_admin at INSERT time under
 * session_replication_role='replica', leaving the production guard intact.
 */
async function makeAdmin(client: import("pg").Client): Promise<string> {
  const userId = randomUUID();
  await client.query("SET session_replication_role = 'replica'");
  try {
    await client.query(
      `INSERT INTO auth.users (
         id, instance_id, aud, role, email, encrypted_password,
         email_confirmed_at, created_at, updated_at,
         raw_app_meta_data, raw_user_meta_data
       ) VALUES (
         $1, '00000000-0000-0000-0000-000000000000',
         'authenticated', 'authenticated', $2, '',
         NOW(), NOW(), NOW(), '{}'::jsonb, '{}'::jsonb
       )`,
      [userId, `dbtest-admin-${userId}@example.invalid`]
    );
    await client.query(
      `INSERT INTO public.profiles (id, email, status, is_admin)
       VALUES ($1, $2, 'active', true)`,
      [userId, `dbtest-admin-${userId}@example.invalid`]
    );
  } finally {
    await client.query("SET session_replication_role = 'origin'");
  }
  return userId;
}

describe("profiles policies", () => {
  it("an authenticated user reads exactly their own row (no recursion)", async () => {
    await withDb(async (client) => {
      const { userId: a } = await makeUser(client);
      await makeUser(client); // user B

      const res = await asUser(client, a, () =>
        client.query(`SELECT id FROM public.profiles`)
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].id).toBe(a);
    });
  });

  it("a user can update their own display_name but not another's", async () => {
    await withDb(async (client) => {
      const { userId: a } = await makeUser(client);
      const { userId: b } = await makeUser(client);

      const own = await asUser(client, a, () =>
        client.query(
          `UPDATE public.profiles SET display_name = 'mine' WHERE id = $1`,
          [a]
        )
      );
      expect(own.rowCount).toBe(1);

      const other = await asUser(client, a, () =>
        client.query(
          `UPDATE public.profiles SET display_name = 'hijack' WHERE id = $1`,
          [b]
        )
      );
      expect(other.rowCount).toBe(0);

      const check = await client.query(
        `SELECT display_name FROM public.profiles WHERE id = $1`,
        [b]
      );
      expect(check.rows[0].display_name).not.toBe("hijack");
    });
  });

  it("an admin sees every profile", async () => {
    await withDb(async (client) => {
      const a = await makeAdmin(client);
      await makeUser(client); // user B

      const res = await asUser(client, a, () =>
        client.query(`SELECT id FROM public.profiles`)
      );
      const ids = res.rows.map((r) => r.id);
      expect(ids).toContain(a);
      expect(res.rows.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("anon catalog read", () => {
  // Mirrors hosted behavior: is_admin() is not anon-executable, so direct
  // anon table reads fail closed. Anonymous discovery goes through the
  // SECURITY DEFINER get_public_catalog / get_public_product_by_slug RPCs.
  it("anon direct reads of public.products fail closed", async () => {
    await withDb(async (client) => {
      await makeProduct(client);
      const err = await asAnon(client, () =>
        client.query(`SELECT id FROM public.products LIMIT 1`)
      ).catch((e) => e);
      expect(err.code).toBe("42501");
      expect(String(err.message)).toMatch(/is_admin/);
    });
  });
});

describe("reservation ledger key", () => {
  it("reservation entries carry the 'reserve:' idempotency prefix", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 20);
      const { productId, productVersionId } = await makeProduct(client);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      const { quoteId } = await makeQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        reserveCredits: 10,
      });
      const sourceAssetId = await makeAsset(client, userId);
      const created = await createGeneration(client, {
        userId,
        quoteId,
        sourceAssetId,
      });

      const rows = await ledgerOf(client, created.generationId);
      const reservation = rows.find((r) => r.entry_type === "reservation");
      expect(reservation).toBeDefined();
      expect(reservation!.idempotency_key).toMatch(/^reserve:/);
      expect(Number(reservation!.amount)).toBe(-10);
    });
  });
});
