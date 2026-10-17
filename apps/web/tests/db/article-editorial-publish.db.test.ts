import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asUser, withDb } from "./helpers/db";
import { makeProduct } from "./helpers/fixtures";

/**
 * #128 — real-Postgres coverage of the publish_article extensions for the
 * promptRecipe + settings blocks, plus the anon-safe editorial RPC:
 *   - settings requires a live public presetId (empty/forged/retired all fail)
 *   - promptRecipe may be preset-less, but a non-empty presetId must resolve
 *   - promptRecipe 'asset' references must be this article's verified media
 *   - malformed serialized references fail as media_ref_not_ready, never a
 *     raw cast error
 * Requires the local Supabase DB test stack (pnpm test:db).
 */

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
       FROM public.create_article('Editorial gate test') a`
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

/** assets + article_assets('ready') pair belonging to this article. */
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

const paragraph = { type: "paragraph", content: [{ type: "text", text: "Hi" }] };

function settingsBlock(presetId: string, fields = "[]") {
  return {
    type: "settings",
    props: { presetId, slug: "x", fields },
  };
}

function promptRecipeBlock(props: Record<string, string>) {
  return {
    type: "promptRecipe",
    props: {
      presetId: "",
      slug: "",
      recipeText: "My steps",
      source: "manual",
      capturedAt: "",
      references: "",
      ...props,
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

describe("publish_article promptRecipe/settings gate", () => {
  it("publishes a settings block referencing an active product", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock(
          productId,
          JSON.stringify([{ key: "style", label: "Style", value: "Film" }])
        ),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toBeNull();
    });
  });

  it("rejects a settings block with an empty presetId", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock(""),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "preset_unavailable"
      );
    });
  });

  it("rejects a settings block with a forged presetId", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock("not-a-uuid"),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "preset_unavailable"
      );
    });
  });

  it("rejects a settings block pointing at a retired product", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await client.query(
        `UPDATE public.products SET public_status = 'retired' WHERE id = $1`,
        [productId]
      );
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock(productId),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "preset_unavailable"
      );
    });
  });

  it("publishes a preset-less manual promptRecipe", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        promptRecipeBlock({ recipeText: "I uploaded a portrait and generated." }),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toBeNull();
    });
  });

  it("rejects a promptRecipe with a non-empty invalid presetId", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        promptRecipeBlock({ presetId: "forged" }),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "preset_unavailable"
      );
    });
  });

  it("publishes a promptRecipe whose asset reference is this article's media", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      const draft = await makeArticle(client, staffId, [paragraph]);
      const assetId = await makeArticleAsset(client, draft.articleId, staffId);
      // Re-save with the block once the media row exists.
      const saved = await asUser(client, staffId, () =>
        client.query(
          `SELECT (public.save_article_draft($1, $2, NULL, NULL, NULL, NULL, NULL,
                                            NULL, FALSE, $3::jsonb, 1, 'manual')
                  ).edit_version AS v`,
          [
            draft.articleId,
            draft.editVersion,
            JSON.stringify([
              paragraph,
              promptRecipeBlock({
                presetId: productId,
                references: JSON.stringify([
                  { id: assetId, label: "Source", kind: "asset" },
                ]),
              }),
            ]),
          ]
        )
      );
      expect(
        await publishErr(
          client,
          staffId,
          draft.articleId,
          Number(saved.rows[0].v)
        )
      ).toBeNull();
    });
  });

  it("rejects a promptRecipe asset reference that isn't this article's media", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        promptRecipeBlock({
          references: JSON.stringify([
            { id: randomUUID(), label: "Someone else's", kind: "asset" },
          ]),
        }),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "media_ref_not_ready"
      );
    });
  });

  it("rejects malformed serialized references with the controlled error", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        promptRecipeBlock({ references: "{definitely not json" }),
      ]);
      const err = await publishErr(client, staffId, articleId, editVersion);
      expect(err).toContain("media_ref_not_ready");
      expect(err).not.toContain("invalid input syntax");
    });
  });

  it("treats generation-kind references as share-link provenance only", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        promptRecipeBlock({
          references: JSON.stringify([
            { id: randomUUID(), label: "Shared result", kind: "generation" },
          ]),
        }),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toBeNull();
    });
  });
});

describe("get_public_product_editorial", () => {
  it("returns public recipe + active fields for an active product", async () => {
    await withDb(async (client) => {
      const { productId } = await makeProduct(client);
      await client.query(
        `UPDATE public.products SET public_prompt_recipe = 'editorial recipe'
         WHERE id = $1`,
        [productId]
      );
      await client.query(
        `INSERT INTO public.product_fields (
           product_id, field_key, label, field_type, sort_order, config, active
         ) VALUES
           ($1, 'a', 'Alpha', 'select', 1, '{}'::jsonb, TRUE),
           ($1, 'b', 'Hidden', 'select', 2, '{}'::jsonb, FALSE)`,
        [productId]
      );
      const { rows } = await client.query(
        `SELECT slug, name, public_prompt_recipe, active_fields
         FROM public.get_public_product_editorial($1)`,
        [productId]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].public_prompt_recipe).toBe("editorial recipe");
      const fields = rows[0].active_fields as { field_key: string }[];
      expect(fields.map((f) => f.field_key)).toEqual(["a"]);
    });
  });

  it("returns no row for a retired product", async () => {
    await withDb(async (client) => {
      const { productId } = await makeProduct(client);
      await client.query(
        `UPDATE public.products SET public_status = 'retired' WHERE id = $1`,
        [productId]
      );
      const { rows } = await client.query(
        `SELECT id FROM public.get_public_product_editorial($1)`,
        [productId]
      );
      expect(rows).toHaveLength(0);
    });
  });
});
