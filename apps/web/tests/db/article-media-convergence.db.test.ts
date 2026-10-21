import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asAnon, asService, asUser, withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #139 — hosted-DB convergence for the article-media functions
 * (migration 20261023000004_converge_article_media.sql): prod carried an
 * earlier draft of 20261020000002 missing the save_article_draft cover
 * check and the whole sweep_stale_article_uploads function.
 */

/** Same replica-insert pattern as article-media.db.test.ts makeStaff —
 * the privilege-escalation guard forbids promoting a user after creation. */
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

async function makeArticle(client: Client, authorId: string): Promise<string> {
  const articleId = randomUUID();
  await client.query(
    `INSERT INTO public.articles (id, author_id, title, slug, last_edited_by)
     VALUES ($1, $2, 'DB test article', $3, $2)`,
    [articleId, authorId, `dbtest-${articleId.slice(0, 8)}`]
  );
  return articleId;
}

/** A 'ready' upload row belonging to `articleId`. */
async function makeArticleAsset(
  client: Client,
  articleId: string,
  uploaderId: string
): Promise<string> {
  const assetId = randomUUID();
  const stagingKey = `staff/${uploaderId}/articles/${articleId}/${assetId}.png`;
  await client.query(
    `INSERT INTO public.assets (
       id, owner_user_id, storage_provider, storage_key, bucket,
       media_type, mime_type, width, height
     ) VALUES ($1, $2, 'supabase', $3, 'article-media',
               'image', 'image/png', 640, 480)`,
    [assetId, uploaderId, stagingKey]
  );
  await client.query(
    `INSERT INTO public.article_assets (
       article_id, asset_id, uploader_user_id, kind, state, staging_key
     ) VALUES ($1, $2, $3, 'upload', 'ready', $4)`,
    [articleId, assetId, uploaderId, stagingKey]
  );
  return assetId;
}

const saveDraft = `
  SELECT public.save_article_draft(
    $1::uuid, 0::bigint,
    NULL, NULL, NULL, NULL, NULL,
    $2::uuid, false, NULL, NULL, 'manual'
  )`;

describe("save_article_draft cover integrity (#139)", () => {
  it("rejects another article's asset as cover with invalid_cover_asset", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleA = await makeArticle(client, staffId);
      const articleB = await makeArticle(client, staffId);
      const foreignAssetId = await makeArticleAsset(client, articleB, staffId);

      const err = await asUser(client, staffId, () =>
        client.query(saveDraft, [articleA, foreignAssetId])
      ).catch((e) => e);
      expect(String(err.message)).toContain("invalid_cover_asset");
    });
  });

  it("rejects an asset that is not a ready/published media row", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleId = await makeArticle(client, staffId);

      const err = await asUser(client, staffId, () =>
        client.query(saveDraft, [articleId, randomUUID()])
      ).catch((e) => e);
      expect(String(err.message)).toContain("invalid_cover_asset");
    });
  });

  it("accepts the article's own ready asset as cover", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleId = await makeArticle(client, staffId);
      const assetId = await makeArticleAsset(client, articleId, staffId);

      const res = await asUser(client, staffId, () =>
        client.query(
          `SELECT (public.save_article_draft(
             $1::uuid, 0::bigint,
             NULL, NULL, NULL, NULL, NULL,
             $2::uuid, false, NULL, NULL, 'manual'
           )).cover_asset_id`,
          [articleId, assetId]
        )
      );
      expect(res.rows[0].cover_asset_id).toBe(assetId);
    });
  });
});

describe("sweep_stale_article_uploads grants (#139)", () => {
  it("service_role can run the sweep (the cleanup cron's real path)", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleId = await makeArticle(client, staffId);
      const readyAssetId = await makeArticleAsset(client, articleId, staffId);
      const mkPending = async (age: string) => {
        const assetId = randomUUID();
        const key = `staff/${staffId}/articles/${articleId}/${assetId}.png`;
        await client.query(
          `INSERT INTO public.assets (
             id, owner_user_id, storage_provider, storage_key, bucket,
             media_type, mime_type, width, height
           ) VALUES ($1, $2, 'supabase', $3, 'article-media',
                     'image', 'image/png', 640, 480)`,
          [assetId, staffId, key]
        );
        await client.query(
          `INSERT INTO public.article_assets (
             article_id, asset_id, uploader_user_id, kind, state, staging_key,
             created_at
           ) VALUES ($1, $2, $3, 'upload', 'pending', $4, NOW() - $5::interval)`,
          [articleId, assetId, staffId, key, age]
        );
        return { assetId, key };
      };
      const stale = await mkPending("48 hours");
      const fresh = await mkPending("1 hour");

      const res = await asService(client, () =>
        client.query(`SELECT public.sweep_stale_article_uploads() AS out`)
      );
      expect(res.rows[0].out.deleted_keys).toEqual([stale.key]);

      const remaining = await client.query(
        `SELECT asset_id::text FROM public.article_assets
         WHERE article_id = $1 ORDER BY asset_id`,
        [articleId]
      );
      // Stale pending row + its asset are gone; fresh pending and ready rows survive.
      expect(remaining.rows.map((r) => r.asset_id).sort()).toEqual(
        [fresh.assetId, readyAssetId].sort()
      );
      expect(
        (
          await client.query(
            `SELECT count(*)::int AS n FROM public.assets WHERE id = $1`,
            [stale.assetId]
          )
        ).rows[0].n
      ).toBe(0);
    });
  });

  it("is callable by authenticated (reaches the staff check), denied to anon", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const call = `SELECT public.sweep_stale_article_uploads()`;

      // Authenticated non-staff: EXECUTE granted, the function's own
      // guard rejects — a different 42501 than a grant failure.
      const userErr = await asUser(client, userId, () =>
        client.query(call)
      ).catch((e) => e);
      expect(userErr.code).toBe("42501");
      expect(String(userErr.message)).toContain(
        "Forbidden: editorial staff only"
      );

      const anonErr = await asAnon(client, () => client.query(call)).catch(
        (e) => e
      );
      expect(anonErr.code).toBe("42501");
      expect(String(anonErr.message)).toMatch(
        /permission denied for function sweep_stale_article_uploads/
      );
    });
  });
});
