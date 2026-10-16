import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asUser, withDb } from "./helpers/db";

/**
 * Issue #126 — duplicate_article against real Postgres.
 *
 * The security contract the mocks can't prove: a clone must re-register
 * article-owned media under FRESH asset ids (UNIQUE(asset_id) forbids
 * sharing), rewrite the document's references in the same transaction, land
 * as a draft with no publication state, and hand the app a copy plan whose
 * rows finalize only after the copied object exists.
 */

async function makeStaff(client: Client): Promise<string> {
  const userId = randomUUID();
  // The privilege-escalation guard is a BEFORE UPDATE trigger — seed the
  // admin flag at INSERT under a session-local trigger bypass, same as the
  // #129 fixtures. Production security is untouched.
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

async function makeUser(client: Client): Promise<string> {
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
      [userId, `dbtest-user-${userId}@example.invalid`]
    );
    await client.query(
      `INSERT INTO public.profiles (id, email, status)
       VALUES ($1, $2, 'active')`,
      [userId, `dbtest-user-${userId}@example.invalid`]
    );
  } finally {
    await client.query("SET session_replication_role = 'origin'");
  }
  return userId;
}

async function makeArticleAsset(
  client: Client,
  articleId: string,
  uploaderId: string,
  bytes = 4096
): Promise<{ assetId: string; stagingKey: string }> {
  const assetId = randomUUID();
  const stagingKey = `staff/${uploaderId}/articles/${articleId}/${assetId}.png`;
  await client.query(
    `INSERT INTO public.assets (
       id, owner_user_id, storage_provider, storage_key, bucket,
       media_type, mime_type, bytes, width, height
     ) VALUES ($1, $2, 'supabase', $3, 'article-media',
               'image', 'image/png', $4, 640, 480)`,
    [assetId, uploaderId, stagingKey, bytes]
  );
  await client.query(
    `INSERT INTO public.article_assets (
       article_id, asset_id, uploader_user_id, kind, state, staging_key
     ) VALUES ($1, $2, $3, 'upload', 'ready', $4)`,
    [articleId, assetId, uploaderId, stagingKey]
  );
  return { assetId, stagingKey };
}

function docReferencing(assetId: string, genAssetId: string): string {
  return JSON.stringify([
    {
      type: "image",
      props: { url: `asset://${assetId}` },
      children: [],
    },
    {
      type: "generation",
      props: { assetId: genAssetId },
      children: [],
    },
  ]);
}

interface DuplicateResult {
  article: {
    id: string;
    slug: string;
    title: string;
    status: string;
    cover_asset_id: string | null;
    draft_content: { type: string; props?: Record<string, unknown> }[];
    current_publication_id: string | null;
    first_published_at: string | null;
    author_id: string;
  };
  copies: {
    asset_id: string;
    from_key: string;
    to_key: string;
    mime_type: string;
    bytes: number;
  }[];
}

describe("duplicate_article (#126)", () => {
  it("clones the draft with fresh media ids and rewritten references", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleId = randomUUID();
      const { assetId: imgA } = await makeArticleAsset(
        client,
        articleId,
        staffId
      );
      const { assetId: genA } = await makeArticleAsset(
        client,
        articleId,
        staffId
      );
      await client.query(
        `INSERT INTO public.articles (
           id, author_id, title, slug, draft_content, cover_asset_id,
           status, last_edited_by
         ) VALUES ($1, $2, 'Source article', 'dbtest-src', $3::jsonb, $4,
                   'published', $2)`,
        [articleId, staffId, docReferencing(imgA, genA), imgA]
      );
      // Publish-state fields a clone must never inherit.
      await client.query(
        `UPDATE public.articles
           SET first_published_at = NOW(), published_at = NOW()
         WHERE id = $1`,
        [articleId]
      );

      const { rows } = await asUser(client, staffId, () =>
        client.query(`SELECT public.duplicate_article($1) AS result`, [
          articleId,
        ])
      );
      const result = rows[0].result as DuplicateResult;
      const dup = result.article;

      // Fresh draft identity — nothing live carried over.
      expect(dup.id).not.toBe(articleId);
      expect(dup.status).toBe("draft");
      expect(dup.slug).toBe("dbtest-src-copy");
      expect(dup.title).toBe("Source article (copy)");
      expect(dup.author_id).toBe(staffId);
      expect(dup.current_publication_id).toBeNull();
      expect(dup.first_published_at).toBeNull();

      // Two clones in the copy plan, each with a new article-scoped key.
      expect(result.copies).toHaveLength(2);
      for (const copy of result.copies) {
        expect(copy.to_key).toContain(`/articles/${dup.id}/`);
        expect(copy.to_key).toContain(copy.asset_id);
      }

      // Every document reference now points at a NEW asset id owned by the
      // duplicate — no stale source ids survive anywhere in the doc.
      const docText = JSON.stringify(dup.draft_content);
      expect(docText).not.toContain(imgA);
      expect(docText).not.toContain(genA);
      const newIds = new Set(result.copies.map((c) => c.asset_id));
      const imgRef = dup.draft_content[0].props?.url as string;
      const genRef = dup.draft_content[1].props?.assetId as string;
      expect(newIds.has(imgRef.replace("asset://", ""))).toBe(true);
      expect(newIds.has(genRef)).toBe(true);

      // The cover re-points at a cloned asset, not the source's.
      expect(dup.cover_asset_id).not.toBe(imgA);
      expect(newIds.has(dup.cover_asset_id!)).toBe(true);

      // Cloned rows are pending with the new key until the object copy lands.
      const { rows: clones } = await client.query(
        `SELECT aa.state, aa.staging_key, aa.article_id
           FROM public.article_assets aa
          WHERE aa.article_id = $1`,
        [dup.id]
      );
      expect(clones).toHaveLength(2);
      for (const clone of clones) {
        expect(clone.state).toBe("pending");
        expect(clone.staging_key).toContain(`/articles/${dup.id}/`);
      }

      // Simulated app-side copy: object lands at to_key → finalize flips
      // the clone to ready (the real verification path the action uses).
      const first = result.copies[0];
      await client.query(
        `INSERT INTO storage.objects (bucket_id, name, version, metadata)
         VALUES ('article-media', $1, $2, $3::jsonb)`,
        [
          first.to_key,
          randomUUID(),
          JSON.stringify({ mimetype: "image/png", size: first.bytes }),
        ]
      );
      await asUser(client, staffId, () =>
        client.query(
          `SELECT public.finalize_article_media_upload($1, 'image/png', $2)`,
          [first.asset_id, first.bytes]
        )
      );
      const { rows: [finalized] } = await client.query(
        `SELECT state FROM public.article_assets WHERE asset_id = $1`,
        [first.asset_id]
      );
      expect(finalized.state).toBe("ready");
    });
  });

  it("never collides on slug and rejects non-staff", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const articleId = randomUUID();
      await client.query(
        `INSERT INTO public.articles (id, author_id, title, slug, last_edited_by)
         VALUES ($1, $2, 'Src', 'dbtest-dup', $2)`,
        [articleId, staffId]
      );

      const slugs: string[] = [];
      for (let i = 0; i < 2; i++) {
        const { rows } = await asUser(client, staffId, () =>
          client.query(`SELECT public.duplicate_article($1) AS result`, [
            articleId,
          ])
        );
        slugs.push((rows[0].result as DuplicateResult).article.slug);
      }
      expect(new Set(slugs).size).toBe(2);
      expect(slugs).toContain("dbtest-dup-copy");

      const userId = await makeUser(client);
      await expect(
        asUser(client, userId, () =>
          client.query(`SELECT public.duplicate_article($1)`, [articleId])
        )
      ).rejects.toThrow(/editorial staff/i);
    });
  });
});
