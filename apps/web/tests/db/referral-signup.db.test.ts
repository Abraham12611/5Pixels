import { describe, expect, it } from "vitest";
import { asAnon, asUser, withDb, withDbClients } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #139 — referral-code generation must be unreachable via RPC and
 * must work under an empty search_path (the signup trigger chain runs
 * handle_new_user -> profiles insert -> trg_profiles_referral_code, all
 * SECURITY DEFINER with SET search_path = '').
 *
 * Note: referral attribution is app-level, not a DB trigger — the auth
 * callback resolves the `spx_ref` cookie to a profiles.id and inserts a
 * referral_participants row via the service client
 * (lib/referrals/session.ts -> rewards.ts attributeReferral). The
 * attribution test below mirrors that exact write.
 */

const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

describe("generate_referral_code", () => {
  it("produces 2000 codes that all match the 6-char alphabet", async () => {
    await withDb(async (client) => {
      const res = await client.query(
        `SELECT public.generate_referral_code() AS code
         FROM generate_series(1, 2000)`
      );
      expect(res.rows).toHaveLength(2000);
      for (const { code } of res.rows) {
        expect(code).toMatch(CODE_RE);
      }
    });
  });

  it("is not callable by anon or authenticated (42501)", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const call = `SELECT public.generate_referral_code()`;

      const anonErr = await asAnon(client, () => client.query(call)).catch(
        (e) => e
      );
      expect(anonErr.code).toBe("42501");
      expect(String(anonErr.message)).toMatch(/permission denied/i);

      const userErr = await asUser(client, userId, () =>
        client.query(call)
      ).catch((e) => e);
      expect(userErr.code).toBe("42501");
      expect(String(userErr.message)).toMatch(/permission denied/i);
    });
  });

  it("pins search_path on both referral functions", async () => {
    await withDb(async (client) => {
      const res = await client.query(
        `SELECT proname, array_to_string(proconfig, ',') AS config
         FROM pg_proc
         WHERE proname IN ('generate_referral_code', 'set_profile_referral_code')
         ORDER BY proname`
      );
      expect(res.rows).toHaveLength(2);
      for (const row of res.rows) {
        expect(row.config).toContain('search_path=""');
      }
    });
  });
});

describe("signup code assignment", () => {
  it("assigns valid, distinct codes under an empty search_path", async () => {
    await withDb(async (client) => {
      await client.query("SET search_path TO ''");
      const userIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const { userId } = await makeUser(client);
        userIds.push(userId);
      }
      const res = await client.query(
        `SELECT referral_code FROM public.profiles WHERE id = ANY($1::uuid[])`,
        [userIds]
      );
      expect(res.rows).toHaveLength(50);
      const codes = res.rows.map((r) => r.referral_code);
      for (const code of codes) expect(code).toMatch(CODE_RE);
      expect(new Set(codes).size).toBe(50);
    });
  });

  it("assigns distinct codes under concurrent signups", async () => {
    await withDbClients(2, async ([c1, c2]) => {
      const created = await Promise.all([
        Promise.all(
          Array.from({ length: 20 }, () => makeUser(c1).then((u) => u.userId))
        ),
        Promise.all(
          Array.from({ length: 20 }, () => makeUser(c2).then((u) => u.userId))
        ),
      ]);
      const userIds = created.flat();
      expect(userIds).toHaveLength(40);
      const res = await c1.query(
        `SELECT referral_code FROM public.profiles WHERE id = ANY($1::uuid[])`,
        [userIds]
      );
      const codes = res.rows.map((r) => r.referral_code);
      expect(codes).toHaveLength(40);
      for (const code of codes) expect(code).toMatch(CODE_RE);
      expect(new Set(codes).size).toBe(40);
    });
  });
});

describe("referral attribution", () => {
  it("attributes a signup through referral_participants.referred_by", async () => {
    await withDb(async (client) => {
      const { userId: referrer } = await makeUser(client);
      const { userId: referee } = await makeUser(client);

      // Resolve the referrer's human code, as resolveReferrerId does.
      const codeRes = await client.query(
        `SELECT id FROM public.profiles WHERE referral_code = (
           SELECT referral_code FROM public.profiles WHERE id = $1
         )`,
        [referrer]
      );
      expect(codeRes.rows[0]?.id).toBe(referrer);

      // The same write attributeReferral performs via the service client.
      await client.query(
        `INSERT INTO public.referral_participants (user_id, referred_by)
         VALUES ($1, $2)`,
        [referee, codeRes.rows[0].id]
      );
      await client.query(
        `UPDATE public.profiles SET free_unlock_source = 'referral'
         WHERE id = $1 AND free_unlock_source IS NULL`,
        [referee]
      );

      const participant = await client.query(
        `SELECT referred_by FROM public.referral_participants WHERE user_id = $1`,
        [referee]
      );
      expect(participant.rows[0].referred_by).toBe(referrer);

      const profile = await client.query(
        `SELECT free_unlock_source FROM public.profiles WHERE id = $1`,
        [referee]
      );
      expect(profile.rows[0].free_unlock_source).toBe("referral");
    });
  });

  it("rejects self-referral at the table constraint", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const err = await client
        .query(
          `INSERT INTO public.referral_participants (user_id, referred_by)
           VALUES ($1, $1)`,
          [userId]
        )
        .catch((e) => e);
      expect(err.code).toBe("23514"); // check_violation: no_self_referral
    });
  });
});
