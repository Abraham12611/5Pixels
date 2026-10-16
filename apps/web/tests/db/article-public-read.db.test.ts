import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asUser, withDb } from "./helpers/db";

/**
 * #131 — public article detail read path.
 *
 * get_public_article_by_slug must serve the published snapshot to anonymous
 * readers, including the media map that lets the public renderer resolve
 * asset:// embeds — while never exposing draft/private media or unpublished
 * articles.
 */

async function makeStaff(client: Client): Promise<string> {
  const userId = randomUUID();
  // Seed is_admin at INSERT time — the privilege-escalation guard trigger
  // prevents promotion after creation (see article-media.db.test.ts).
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

/** Run fn inside a transaction as the PostgREST `anon` role (no JWT sub). */
async function asAnon<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query("BEGIN");
  try {
    await client.query(
      "SELECT set_config('request.jwt.claims', $1, true)",
      [JSON.stringify({ role: "anon" })]
    );
    await client.query("SET LOCAL ROLE anon");
    const result = await fn();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

/** assets + article_assets('ready') pair for one image. */
async function makeArticleAsset(
  client: Client,
  articleId: string,
  uploaderId: string
): Promise<{ assetId: string; publishedKey: string }> {
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
  return {
    assetId,
    publishedKey: `articles/${articleId}/${assetId}.png`,
  };
}

/** Register the public object the app layer would have staged. */
async function stagePublicObject(client: Client, publishedKey: string) {
  await client.query(
    `INSERT INTO storage.objects (bucket_id, name, version, metadata)
     VALUES ('article-media-public', $1, $2, '{}'::jsonb)`,
    [publishedKey, randomUUID()]
  );
}

function imageDoc(assetId: string): string {
  return JSON.stringify([
    {
      type: "heading",
      props: { level: 1 },
      content: [{ type: "text", text: "A title" }],
      children: [],
    },
    {
      type: "image",
      props: { url: `asset://${assetId}` },
      children: [],
    },
  ]);
}

async function makeArticle(
  client: Client,
  authorId: string,
  draftContent: string,
  slug: string
): Promise<string> {
  const articleId = randomUUID();
  await client.query(
    `INSERT INTO public.articles (
       id, author_id, title, slug, draft_content, last_edited_by
     ) VALUES ($1, $2, 'DB test article', $3, $4::jsonb, $2)`,
    [articleId, authorId, slug, draftContent]
  );
  return articleId;
}

describe("get_public_article_by_slug — media map (#131)", () => {
  it("serves the published snapshot + media map to anonymous readers", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const slug = `pub-${randomUUID().slice(0, 8)}`;
      const articleId = await makeArticle(client, staffId, "[]", slug);
      const media = await makeArticleAsset(client, articleId, staffId);
      // A second asset that is registered but never published — it must NOT
      // appear in the public media map.
      const unreferenced = await makeArticleAsset(client, articleId, staffId);

      await client.query(
        `UPDATE public.articles SET draft_content = $1::jsonb,
           cover_asset_id = $3
         WHERE id = $2`,
        [imageDoc(media.assetId), articleId, media.assetId]
      );
      await stagePublicObject(client, media.publishedKey);

      const { rows: [published] } = await asUser(client, staffId, () =>
        client.query(
          `SELECT status, current_publication_id
             FROM public.publish_article($1, $2)`,
          [articleId, 0]
        )
      );
      expect(published.status).toBe("published");

      const rows = await asAnon(client, () =>
        client.query(
          `SELECT * FROM public.get_public_article_by_slug($1)`,
          [slug]
        )
      );
      expect(rows.rows).toHaveLength(1);
      const row = rows.rows[0];

      expect(row.title).toBe("DB test article");
      expect(row.first_published_at).not.toBeNull();
      expect(Number(row.publication_number)).toBe(1);
      expect(row.cover.storageKey).toBe(media.publishedKey);

      // The media map resolves the published asset to its public object…
      const mediaMap = row.media as Record<
        string,
        { bucket: string; storageKey: string; mimeType: string }
      >;
      expect(mediaMap[media.assetId]).toMatchObject({
        bucket: "article-media-public",
        storageKey: media.publishedKey,
        mimeType: "image/png",
      });
      // …and never includes assets that were never promoted.
      expect(mediaMap[unreferenced.assetId]).toBeUndefined();
    });
  });

  it("returns no rows for drafts and unknown slugs", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const slug = `draft-${randomUUID().slice(0, 8)}`;
      await makeArticle(
        client,
        staffId,
        JSON.stringify([{ type: "paragraph", children: [] }]),
        slug
      );

      const rows = await asAnon(client, () =>
        client.query(
          `SELECT * FROM public.get_public_article_by_slug($1)`,
          [slug]
        )
      );
      expect(rows.rows).toHaveLength(0);

      const missing = await asAnon(client, () =>
        client.query(
          `SELECT * FROM public.get_public_article_by_slug($1)`,
          ["does-not-exist"]
        )
      );
      expect(missing.rows).toHaveLength(0);
    });
  });
});
