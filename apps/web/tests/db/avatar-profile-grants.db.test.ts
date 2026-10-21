import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { asAnon, asUser, withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #139 PR C — avatar/profile security.
 *
 * 1. profile/actions.ts edits username/headline/bio/location/socials/
 *    show_spent_credits, but authenticated only had UPDATE on
 *    display_name/avatar_asset_id/locale/timezone — every edit of the newer
 *    fields failed with 42501. 20261105000001 grants the editable set.
 * 2. avatar-upload.ts inserted assets with visibility='public' while the
 *    assets_insert policy requires 'private' — avatar finalization always
 *    failed for ordinary users. Avatars are now private (uploads policy:
 *    "never shown to other users"); own avatar resolves via signed URL.
 */

const PROFILE_FIELDS = {
  headline: "DB test headline",
  bio: "DB test bio",
  location: "DB test city",
  socials: { site: "https://example.invalid" } as Record<string, string>,
  show_spent_credits: true,
};

describe("profiles column grants (#139)", () => {
  it("lets a user edit every public profile field on their own row", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const uniqueUsername = `dbtest-${userId.slice(0, 8)}`;
      await asUser(client, userId, () =>
        client.query(
          `UPDATE public.profiles SET
             username = $1, headline = $2, bio = $3, location = $4,
             socials = $5::jsonb, show_spent_credits = $6,
             display_name = 'DB Tester', locale = 'de', timezone = 'UTC'
           WHERE id = $7`,
          [
            uniqueUsername,
            PROFILE_FIELDS.headline,
            PROFILE_FIELDS.bio,
            PROFILE_FIELDS.location,
            JSON.stringify(PROFILE_FIELDS.socials),
            PROFILE_FIELDS.show_spent_credits,
            userId,
          ]
        )
      );
      const res = await client.query(
        `SELECT username, headline, bio, location, socials, show_spent_credits
         FROM public.profiles WHERE id = $1`,
        [userId]
      );
      expect(res.rows[0].username).toBe(uniqueUsername);
      expect(res.rows[0].headline).toBe(PROFILE_FIELDS.headline);
      expect(res.rows[0].bio).toBe(PROFILE_FIELDS.bio);
      expect(res.rows[0].location).toBe(PROFILE_FIELDS.location);
      expect(res.rows[0].socials).toEqual(PROFILE_FIELDS.socials);
      expect(res.rows[0].show_spent_credits).toBe(true);
    });
  });

  it.each(["is_admin", "is_owner", "status", "email", "id", "created_at"])(
    "denies a user updating the protected column %s",
    async (column) => {
      await withDb(async (client) => {
        const { userId } = await makeUser(client);
        const value =
          column === "is_admin" || column === "is_owner"
            ? "TRUE"
            : column === "status"
              ? "'suspended'"
              : column === "email"
                ? "'evil@example.invalid'"
                : column === "created_at"
                  ? "NOW() - INTERVAL '5 years'"
                  : `'${randomUUID()}'`;
        const err = await asUser(client, userId, () =>
          client.query(
            `UPDATE public.profiles SET ${column} = ${value} WHERE id = $1`,
            [userId]
          )
        ).catch((e) => e);
        // Column-level ACL fires first (42501); the privilege-escalation
        // trigger would also reject these if the column were writable.
        expect(err.code).toBe("42501");
      });
    }
  );

  it("enforces the username check constraint", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const err = await asUser(client, userId, () =>
        client.query(
          `UPDATE public.profiles SET username = 'x' WHERE id = $1`,
          [userId]
        )
      ).catch((e) => e);
      expect(err.code).toBe("23514"); // chk_profiles_username_length
    });
  });

  it("keeps another user's row unreadable and unwritable", async () => {
    await withDb(async (client) => {
      const { userId: a } = await makeUser(client);
      const { userId: b } = await makeUser(client);

      const read = await asUser(client, a, () =>
        client.query(
          `SELECT count(*)::int AS n FROM public.profiles WHERE id = $1`,
          [b]
        )
      );
      expect(read.rows[0].n).toBe(0);

      const upd = await asUser(client, a, () =>
        client.query(
          `UPDATE public.profiles SET display_name = 'hijacked' WHERE id = $1`,
          [b]
        )
      );
      expect(upd.rowCount).toBe(0);
    });
  });

  it("anon cannot read or update any profile", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const read = await asAnon(client, () =>
        client.query(`SELECT count(*)::int AS n FROM public.profiles`)
      );
      expect(read.rows[0].n).toBe(0);
      const err = await asAnon(client, () =>
        client.query(
          `UPDATE public.profiles SET display_name = 'x' WHERE id = $1`,
          [userId]
        )
      ).catch((e) => e);
      expect(err.code === "42501" || err.code === "PGRST" || err.rowCount === 0).toBe(
        true
      );
    });
  });
});

describe("avatar asset visibility (#139)", () => {
  const insertAvatar = (visibility: string, userId: string) => ({
    text: `INSERT INTO public.assets (
             id, owner_user_id, storage_provider, storage_key, bucket,
             media_type, mime_type, bytes, visibility, source_type
           ) VALUES ($1, $2, 'supabase', $3, 'user-assets',
                     'image', 'image/png', 2048, $4, 'avatar')`,
    values: [randomUUID(), userId, `${userId}/avatars/${randomUUID()}.png`, visibility],
  });

  it("accepts a private avatar under the user's own prefix", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const q = insertAvatar("private", userId);
      const res = await asUser(client, userId, () =>
        client.query(q.text + " RETURNING id", q.values)
      );
      expect(res.rowCount).toBe(1);
    });
  });

  it("rejects the old public-visibility insert for ordinary users", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const q = insertAvatar("public", userId);
      const err = await asUser(client, userId, () =>
        client.query(q.text, q.values)
      ).catch((e) => e);
      expect(err.code).toBe("42501");
    });
  });

  it("keeps another user's private avatar asset unreadable", async () => {
    await withDb(async (client) => {
      const { userId: a } = await makeUser(client);
      const { userId: b } = await makeUser(client);
      const q = insertAvatar("private", b);
      await asUser(client, b, () => client.query(q.text, q.values));

      const read = await asUser(client, a, () =>
        client.query(
          `SELECT count(*)::int AS n FROM public.assets
           WHERE owner_user_id = $1 AND source_type = 'avatar'`,
          [b]
        )
      );
      expect(read.rows[0].n).toBe(0);
    });
  });

  it("lets signed-in users see the shared default avatars", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const res = await asUser(client, userId, () =>
        client.query(
          `SELECT count(*)::int AS n FROM public.assets
           WHERE source_type = 'default_avatar' AND visibility = 'public'`
        )
      );
      expect(res.rows[0].n).toBeGreaterThanOrEqual(24);
    });
  });
});
