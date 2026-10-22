import { describe, expect, it } from "vitest";
import { asAnon, asService, asUser, withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Least-privilege EXECUTE grants (#139 PR D).
 *
 * 20261106000001_rpc_least_privilege.sql removes the default PUBLIC grant
 * from get_user_balance() and from three SECURITY DEFINER trigger
 * functions that never need direct invocation.
 *
 * 1. get_user_balance: only app callers are authenticated users and the
 *    service role; anon must get 42501, not a silent 0.
 * 2. Trigger functions: Postgres raises "can only be called as triggers"
 *    (0A000) before the EXECUTE check, so a direct call cannot reveal the
 *    grant — assert the ACL itself with has_function_privilege: no PUBLIC
 *    reachability for anon/authenticated, EXECUTE held by service_role.
 */

const TRIGGER_FNS = [
  "notify_on_generation_status_change",
  "prevent_approved_asset_content_overwrite",
  "prevent_asset_moderation_escalation",
];

describe("rpc least-privilege grants (#139)", () => {
  it("denies get_user_balance to anon", async () => {
    await withDb(async (client) => {
      const err = await asAnon(client, () =>
        client.query(`SELECT public.get_user_balance()`)
      ).catch((e) => e);
      expect(err.code).toBe("42501");
    });
  });

  it("lets an authenticated user read their own balance", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const res = await asUser(client, userId, () =>
        client.query(`SELECT public.get_user_balance() AS balance`)
      );
      expect(Number(res.rows[0].balance)).toBe(0);
    });
  });

  it("lets service_role call get_user_balance", async () => {
    await withDb(async (client) => {
      const res = await asService(client, () =>
        client.query(`SELECT public.get_user_balance() AS balance`)
      );
      expect(Number(res.rows[0].balance)).toBe(0);
    });
  });

  it.each(TRIGGER_FNS)(
    "removes PUBLIC EXECUTE from trigger function %s",
    async (fn) => {
      await withDb(async (client) => {
        for (const role of ["anon", "authenticated"]) {
          const res = await client.query(
            `SELECT has_function_privilege($1, $2::regprocedure, 'EXECUTE') AS ok`,
            [role, `public.${fn}()`]
          );
          expect(res.rows[0].ok).toBe(false);
        }
        const svc = await client.query(
          `SELECT has_function_privilege('service_role', $1::regprocedure, 'EXECUTE') AS ok`,
          [`public.${fn}()`]
        );
        expect(svc.rows[0].ok).toBe(true);
      });
    }
  );

  it("keeps PUBLIC EXECUTE off get_user_balance in the ACL", async () => {
    await withDb(async (client) => {
      for (const role of ["anon"]) {
        const res = await client.query(
          `SELECT has_function_privilege($1, 'public.get_user_balance()'::regprocedure, 'EXECUTE') AS ok`,
          [role]
        );
        expect(res.rows[0].ok).toBe(false);
      }
    });
  });
});
