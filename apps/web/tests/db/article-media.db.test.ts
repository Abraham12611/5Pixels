import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asUser, withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #129 review — real-Postgres coverage of the publication/media
 * lifecycle the mocked unit tests cannot prove:
 *   publish → edit → deliberately failed media promotion → the existing
 *   live publication must remain live (never taken offline mid-publish),
 * plus the published-cover deletion guard (a draft cover change does not
 * expose the cover still shown on the live publication).
 */

async function makeStaff(client: Client): Promise<string> {
  const { userId } = await makeUser(client);
  await client.query(
    `UPDATE public.profiles SET is_admin = true WHERE id = $1`,
    [userId]
  );
  return userId;
}

/** assets + article_assets('ready') pair for one image. */
async function makeArticleAsset(
  client: Client,
  articleId: string,
  uploaderId: string
): Promise<{ assetId: string; articleAssetId: string; publishedKey: string }> {
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
  const { rows } = await client.query(
    `INSERT INTO public.article_assets (
       article_id, asset_id, uploader_user_id, kind, state, staging_key
     ) VALUES ($1, $2, $3, 'upload', 'ready', $4)
     RETURNING id`,
    [articleId, assetId, uploaderId, stagingKey]
  );
  return {
    assetId,
    articleAssetId: rows[0].id,
    publishedKey: `articles/${articleId}/${assetId}.png`,
  };
}

/** Register the public object the app layer would have staged — the RPC
 * trusts storage.objects, so this simulates a completed promotion. */
async function stagePublicObject(
  client: Client,
  publishedKey: string
): Promise<void> {
  await client.query(
    `INSERT INTO storage.objects (bucket_id, name, version, metadata)
     VALUES ('article-media-public', $1, $2, '{}'::jsonb)`,
    [publishedKey, randomUUID()]
  );
}

function mediaDoc(assetId: string): string {
  return JSON.stringify([
    {
      type: "image",
      props: { url: `asset://${assetId}` },
      children: [],
    },
  ]);
}

const TEXT_DOC = JSON.stringify([{ type: "paragraph", children: [] }]);

async function makeArticle(
  client: Client,
  authorId: string,
  draftContent: string,
  coverAssetId: string | null = null
): Promise<string> {
  const articleId = randomUUID();
  await client.query(
    `INSERT INTO public.articles (
       id, author_id, title, slug, draft_content, cover_asset_id, last_edited_by
     ) VALUES ($1, $2, 'DB test article', $3, $4::jsonb, $5, $2)`,
    [articleId, authorId, `dbtest-${articleId.slice(0, 8)}`, draftContent, coverAssetId]
  );
  return articleId;
}

async function publishArticle(
  client: Client,
  staffId: string,
  articleId: string,
  expectedVersion: number
): Promise<{ status: string; current_publication_id: string | null }> {
  const { rows } = await asUser(client, staffId, () =>
    client.query(
      `SELECT status, current_publication_id
         FROM public.publish_article($1, $2)`,
      [articleId, expectedVersion]
    )
  );
  return rows[0];
}

describe("publish_article media lifecycle (#129)", () => {
  it("a failed republish promotion leaves the live publication untouched", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleId = await makeArticle(client, staffId, TEXT_DOC);
      const a = await makeArticleAsset(client, articleId, staffId);
      // First publish references asset A; the app staged its public copy.
      await client.query(
        `UPDATE public.articles SET draft_content = $1::jsonb WHERE id = $2`,
        [mediaDoc(a.assetId), articleId]
      );
      await stagePublicObject(client, a.publishedKey);

      const published = await publishArticle(client, staffId, articleId, 0);
      expect(published.status).toBe("published");
      const firstPublication = published.current_publication_id;
      expect(firstPublication).not.toBeNull();

      const { rows: aRows } = await client.query(
        `SELECT state FROM public.article_assets
         WHERE article_id = $1 AND asset_id = $2`,
        [articleId, a.assetId]
      );
      expect(aRows[0].state).toBe("published");

      // Editor swaps the image for asset B — registered, but its public
      // copy is NEVER staged (the promotion step failed app-side).
      const b = await makeArticleAsset(client, articleId, staffId);
      await client.query(
        `UPDATE public.articles
         SET draft_content = $1::jsonb, edit_version = edit_version + 1
         WHERE id = $2`,
        [mediaDoc(b.assetId), articleId]
      );

      await expect(
        publishArticle(client, staffId, articleId, 1)
      ).rejects.toThrow(/media_not_promoted/);

      // The original publication survives fully: same live publication,
      // still-published status, asset A still published.
      const { rows: [article] } = await client.query(
        `SELECT status, current_publication_id FROM public.articles WHERE id = $1`,
        [articleId]
      );
      expect(article.status).toBe("published");
      expect(article.current_publication_id).toBe(firstPublication);

      const { rows: [pub] } = await client.query(
        `SELECT content FROM public.article_publications WHERE id = $1`,
        [firstPublication]
      );
      expect(pub.content[0].props.url).toBe(`asset://${a.assetId}`);

      const { rows: [aAfter] } = await client.query(
        `SELECT state, published_key FROM public.article_assets
         WHERE article_id = $1 AND asset_id = $2`,
        [articleId, a.assetId]
      );
      expect(aAfter.state).toBe("published");
      expect(aAfter.published_key).toBe(a.publishedKey);

      // B stays 'ready' — nothing was half-marked.
      const { rows: [bAfter] } = await client.query(
        `SELECT state FROM public.article_assets
         WHERE article_id = $1 AND asset_id = $2`,
        [articleId, b.assetId]
      );
      expect(bAfter.state).toBe("ready");
    });
  });
});

describe("delete_article_media — published cover protection (#129)", () => {
  it("refuses to delete an asset that is still the live publication's cover", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleId = await makeArticle(client, staffId, TEXT_DOC);

      // Asset A becomes the article's cover; publish promotes it into the
      // publication snapshot.
      const a = await makeArticleAsset(client, articleId, staffId);
      await stagePublicObject(client, a.publishedKey);
      await client.query(
        `UPDATE public.articles SET cover_asset_id = $1 WHERE id = $2`,
        [a.assetId, articleId]
      );
      const published = await publishArticle(client, staffId, articleId, 0);
      expect(published.status).toBe("published");

      const { rows: [pub] } = await client.query(
        `SELECT cover_asset_id FROM public.article_publications WHERE id = $1`,
        [published.current_publication_id]
      );
      expect(pub.cover_asset_id).toBe(a.assetId);

      // Editor changes the DRAFT cover to B without republishing — the
      // live page still shows A. Deleting A must be refused.
      const b = await makeArticleAsset(client, articleId, staffId);
      await client.query(
        `UPDATE public.articles
         SET cover_asset_id = $1, edit_version = edit_version + 1
         WHERE id = $2`,
        [b.assetId, articleId]
      );

      await expect(
        asUser(client, staffId, () =>
          client.query(`SELECT public.delete_article_media($1)`, [
            a.articleAssetId,
          ])
        )
      ).rejects.toThrow(/media_in_use/);

      // And the asset row still exists.
      const { rows: [still] } = await client.query(
        `SELECT id FROM public.assets WHERE id = $1`,
        [a.assetId]
      );
      expect(still.id).toBe(a.assetId);
    });
  });
});
