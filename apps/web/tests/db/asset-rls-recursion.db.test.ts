import { createHmac, randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #195 — assets RLS infinite recursion.
 *
 * `profiles_read_self` carried a self-referencing subquery and
 * `is_admin()`/`is_owner()` were inlinable `LANGUAGE sql` functions, so any
 * PostgREST request whose policy plan touched `profiles` under caller RLS
 * (owner/admin UPDATE on assets, SELECT on assets/profiles/products, …)
 * returned 42P17 "infinite recursion detected in policy".
 *
 * These tests drive the real PostgREST API with minted owner/admin/service
 * JWTs — nothing about the security model is mocked — and verify both the
 * restored legitimate access and that the #179/#193 moderation verdict
 * protections survived the fix.
 */

// The local stack signs demo keys with a fixed secret (same pattern as
// preset-family-input-contract.db.test.ts).
const TEST_API_URL =
  process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const TEST_ANON_KEY =
  process.env.SUPABASE_TEST_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const TEST_JWT_SECRET =
  process.env.SUPABASE_TEST_JWT_SECRET ??
  "super-secret-jwt-token-with-at-least-32-characters-long";

function jwt(
  userId: string | null,
  role: "authenticated" | "service_role" | "anon" = "authenticated"
): string {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = b64({
    iss: "supabase-demo",
    sub: userId ?? "00000000-0000-0000-0000-000000000000",
    aud: role === "anon" ? "anon" : "authenticated",
    role,
    iat: now,
    exp: now + 3600,
  });
  const sig = createHmac("sha256", TEST_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

async function rest(
  path: string,
  opts: {
    method?: string;
    token?: string;
    body?: unknown;
    prefer?: string;
  } = {}
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${TEST_API_URL}/rest/v1/${path}`, {
    method: opts.method ?? "GET",
    headers: {
      apikey: TEST_ANON_KEY,
      Authorization: `Bearer ${opts.token ?? TEST_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/** Admin user — seeded at INSERT time; the privilege-escalation guard
 *  prevents post-creation promotion. */
async function makeStaff(client: Client): Promise<string> {
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
      [userId, `dbtest-staff-${userId}@example.invalid`]
    );
    await client.query(
      `INSERT INTO public.profiles (id, email, status, is_admin)
       VALUES ($1, $2, 'active', true)`,
      [userId, `dbtest-staff-${userId}@example.invalid`]
    );
  } finally {
    await client.query("SET session_replication_role = 'origin'");
  }
  return userId;
}

async function makePendingAsset(
  client: Client,
  ownerId: string
): Promise<string> {
  const assetId = randomUUID();
  await client.query(
    `INSERT INTO public.assets (
       id, owner_user_id, storage_provider, storage_key, bucket,
       media_type, mime_type, width, height, moderation_status
     ) VALUES ($1, $2, 'supabase', $3, 'user-assets', 'image',
       'image/png', 512, 512, 'pending')`,
    [assetId, ownerId, `${ownerId}/recursion-test.png`]
  );
  return assetId;
}

async function assetRow(
  client: Client,
  assetId: string
): Promise<Record<string, unknown>> {
  const res = await client.query(
    `SELECT * FROM public.assets WHERE id = $1`,
    [assetId]
  );
  return res.rows[0] as Record<string, unknown>;
}

describe("assets RLS recursion fix (real PostgREST)", () => {
  it("restores owner metadata updates (was 42P17)", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const assetId = await makePendingAsset(client, userId);

      const res = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(userId),
        body: { deleted_at: new Date().toISOString() },
        prefer: "return=representation",
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBe(1);
      const row = await assetRow(client, assetId);
      expect(row.deleted_at).not.toBeNull();
      expect(row.moderation_status).toBe("pending");
    });
  });

  it("restores owner reads of own assets (SELECT policy also recursed)", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const assetId = await makePendingAsset(client, userId);

      const res = await rest(`assets?id=eq.${assetId}&select=id`, {
        token: jwt(userId),
      });

      expect(res.status).toBe(200);
      expect((res.body as { id: string }[])[0]?.id).toBe(assetId);
    });
  });

  it("refuses cross-account updates — row untouched", async () => {
    await withDb(async (client) => {
      const { userId: ownerId } = await makeUser(client);
      const { userId: otherId } = await makeUser(client);
      const assetId = await makePendingAsset(client, ownerId);

      const res = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(otherId),
        body: { deleted_at: new Date().toISOString() },
        prefer: "return=representation",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      const row = await assetRow(client, assetId);
      expect(row.deleted_at).toBeNull();
    });
  });

  it("refuses cross-account reads — owner-private", async () => {
    await withDb(async (client) => {
      const { userId: ownerId } = await makeUser(client);
      const { userId: otherId } = await makeUser(client);
      const assetId = await makePendingAsset(client, ownerId);

      const res = await rest(`assets?id=eq.${assetId}&select=id`, {
        token: jwt(otherId),
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  it("refuses anonymous updates and reads", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const assetId = await makePendingAsset(client, userId);

      const patch = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(null, "anon"),
        body: { deleted_at: new Date().toISOString() },
        prefer: "return=representation",
      });
      // Denied via grant (4xx) or via RLS zero-match (200 + no rows); the
      // row itself must be untouched either way.
      if (patch.status === 200) expect(patch.body).toEqual([]);
      else expect(patch.status).toBeGreaterThanOrEqual(400);
      const row = await assetRow(client, assetId);
      expect(row.deleted_at).toBeNull();

      const select = await rest(`assets?id=eq.${assetId}&select=id`, {
        token: jwt(null, "anon"),
      });
      expect(
        select.status >= 400 ||
          (Array.isArray(select.body) && select.body.length === 0)
      ).toBe(true);
    });
  });

  it("restores admin updates on non-owner assets", async () => {
    await withDb(async (client) => {
      const { userId: ownerId } = await makeUser(client);
      const adminId = await makeStaff(client);
      const assetId = await makePendingAsset(client, ownerId);

      const res = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(adminId),
        body: { retention_expires_at: new Date().toISOString() },
        prefer: "return=representation",
      });

      expect(res.status).toBe(200);
      expect((res.body as unknown[]).length).toBe(1);
      const row = await assetRow(client, assetId);
      expect(row.retention_expires_at).not.toBeNull();
    });
  });

  it("keeps service_role unrestricted", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const assetId = await makePendingAsset(client, userId);

      const res = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(null, "service_role"),
        body: { deleted_at: new Date().toISOString() },
        prefer: "return=representation",
      });

      expect(res.status).toBe(200);
      const row = await assetRow(client, assetId);
      expect(row.deleted_at).not.toBeNull();
    });
  });
});

describe("moderation verdict protection survives the fix", () => {
  it("blocks an owner's moderation_status escalation via PostgREST", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const assetId = await makePendingAsset(client, userId);

      const res = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(userId),
        body: { moderation_status: "approved" },
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(
        JSON.stringify(res.body).match(/moderation|review/i)
      ).not.toBeNull();
      const row = await assetRow(client, assetId);
      expect(row.moderation_status).toBe("pending");
    });
  });

  it("blocks an owner minting an approved row on insert", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);

      const res = await rest("assets", {
        method: "POST",
        token: jwt(userId),
        body: {
          owner_user_id: userId,
          storage_provider: "supabase",
          storage_key: `${userId}/evil.png`,
          bucket: "user-assets",
          media_type: "image",
          mime_type: "image/png",
          moderation_status: "approved",
        },
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      const rows = await client.query(
        `SELECT id FROM public.assets
         WHERE owner_user_id = $1 AND storage_key = $2`,
        [userId, `${userId}/evil.png`]
      );
      expect(rows.rows).toHaveLength(0);
    });
  });

  it("blocks an anonymous insert with a forged verdict", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);

      const res = await rest("assets", {
        method: "POST",
        token: jwt(null, "anon"),
        body: {
          owner_user_id: userId,
          storage_provider: "supabase",
          storage_key: `${userId}/anon.png`,
          bucket: "user-assets",
          media_type: "image",
          mime_type: "image/png",
          moderation_status: "approved",
        },
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  it("still permits admins to stamp a verdict", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const adminId = await makeStaff(client);
      const assetId = await makePendingAsset(client, userId);

      const res = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(adminId),
        body: {
          moderation_status: "approved",
          moderation_object_version: randomUUID(),
        },
        prefer: "return=representation",
      });

      expect(res.status).toBe(200);
      const row = await assetRow(client, assetId);
      expect(row.moderation_status).toBe("approved");
    });
  });

  it("still permits service_role moderation verdicts", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const assetId = await makePendingAsset(client, userId);

      const res = await rest(`assets?id=eq.${assetId}`, {
        method: "PATCH",
        token: jwt(null, "service_role"),
        body: { moderation_status: "approved" },
        prefer: "return=representation",
      });

      expect(res.status).toBe(200);
      const row = await assetRow(client, assetId);
      expect(row.moderation_status).toBe("approved");
    });
  });
});

describe("profiles_read_self no longer self-references", () => {
  it("authenticated users can read their own profile", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);

      const res = await rest(`profiles?id=eq.${userId}&select=id`, {
        token: jwt(userId),
      });

      expect(res.status).toBe(200);
      expect((res.body as { id: string }[])[0]?.id).toBe(userId);
    });
  });

  it("authenticated non-admins cannot read other profiles", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const { userId: otherId } = await makeUser(client);

      const res = await rest(`profiles?id=eq.${otherId}&select=id`, {
        token: jwt(userId),
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  it("admins can read all profiles", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const adminId = await makeStaff(client);

      const res = await rest(`profiles?id=eq.${userId}&select=id`, {
        token: jwt(adminId),
      });

      expect(res.status).toBe(200);
      expect((res.body as { id: string }[])[0]?.id).toBe(userId);
    });
  });
});
