import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asUser, withDb } from "./helpers/db";
import { makeProduct } from "./helpers/fixtures";

/**
 * #127 — real-Postgres coverage of the publish_article preset gate:
 *   - an unconfigured or tampered presetId blocks publish
 *   - a retired/unpublished product blocks publish (preset_unavailable)
 *   - a pin to a non-active version blocks publish (preset_version_unavailable)
 *   - a valid public preset publishes fine
 * Requires the local Supabase DB test stack (pnpm test:db).
 */

async function makeStaff(client: Client): Promise<string> {
  const userId = randomUUID();
  // Seed the admin flag at INSERT time under a session-scoped trigger bypass —
  // the BEFORE UPDATE privilege-escalation guard is never invoked (and stays
  // intact for production paths).
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

async function makeArticle(
  client: Client,
  staffId: string,
  content: unknown[]
): Promise<{ articleId: string; editVersion: number }> {
  // edit_version starts at 0 on a fresh article — read it back rather than
  // assuming, so a schema default change can't silently desync this fixture.
  const { rows } = await asUser(client, staffId, () =>
    client.query(
      `SELECT a.id, a.edit_version
       FROM public.create_article('Preset gate test') a`
    )
  );
  const articleId = rows[0].id as string;
  const baseVersion = Number(rows[0].edit_version);
  const saved = await asUser(client, staffId, () =>
    client.query(
      `SELECT (public.save_article_draft($1, $2, NULL, NULL, NULL, NULL, NULL,
                                        NULL, FALSE, $3::jsonb, 1, 'manual')
              ).edit_version AS v`,
      [articleId, baseVersion, JSON.stringify(content)]
    )
  );
  const editVersion = Number(saved.rows[0].v);
  return { articleId, editVersion };
}

const paragraph = { type: "paragraph", content: [{ type: "text", text: "Hi" }] };

function presetBlock(presetId: string, versionId = "") {
  return {
    type: "preset",
    props: {
      presetId,
      slug: "x",
      selectedPublicVersionId: versionId,
      displayVariant: "card",
    },
  };
}

async function publishErr(
  client: Client,
  staffId: string,
  articleId: string,
  editVersion: number
): Promise<string | null> {
  try {
    await asUser(client, staffId, () =>
      client.query(`SELECT public.publish_article($1, $2)`, [
        articleId,
        editVersion,
      ])
    );
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

describe("publish_article preset gate", () => {
  it("publishes an article whose preset block references an active product", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId, productVersionId } = await makeProduct(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        presetBlock(productId, productVersionId),
      ]);
      const err = await publishErr(client, staffId, articleId, editVersion);
      expect(err).toBeNull();
    });
  });

  it("rejects an unconfigured preset block", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        presetBlock(""),
      ]);
      const err = await publishErr(client, staffId, articleId, editVersion);
      expect(err).toContain("preset_unavailable");
    });
  });

  it("rejects a forged non-uuid presetId without leaking a cast error", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        presetBlock("not-a-uuid"),
      ]);
      const err = await publishErr(client, staffId, articleId, editVersion);
      expect(err).toContain("preset_unavailable");
    });
  });

  it("rejects a retired product", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await client.query(
        `UPDATE public.products SET public_status = 'retired' WHERE id = $1`,
        [productId]
      );
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        presetBlock(productId),
      ]);
      const err = await publishErr(client, staffId, articleId, editVersion);
      expect(err).toContain("preset_unavailable");
    });
  });

  it("rejects a pin to a non-active version", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      const staleVersionId = randomUUID();
      await client.query(
        `INSERT INTO public.product_versions (
           id, product_id, version_number, state,
           private_instruction_template, credit_cost
         ) VALUES ($1, $2, 2, 'retired', 'x', 0)`,
        [staleVersionId, productId]
      );
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        presetBlock(productId, staleVersionId),
      ]);
      const err = await publishErr(client, staffId, articleId, editVersion);
      expect(err).toContain("preset_version_unavailable");
    });
  });

  it("rejects a version pin belonging to a different product", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const a = await makeProduct(client);
      const b = await makeProduct(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        presetBlock(a.productId, b.productVersionId),
      ]);
      const err = await publishErr(client, staffId, articleId, editVersion);
      expect(err).toContain("preset_version_unavailable");
    });
  });
});
