import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asUser, withDb } from "./helpers/db";
import { makeAsset, makeProduct, makeUser } from "./helpers/fixtures";

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

/** Register the public object the app layer stages before publish — the RPC
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

/** A completed generation; `shared` controls whether public_share_id is set. */
async function makeGeneration(
  client: Client,
  productId: string,
  productVersionId: string,
  shared: boolean
): Promise<string> {
  const { userId } = await makeUser(client);
  const sourceAssetId = await makeAsset(client, userId);
  const id = randomUUID();
  await client.query(
    `INSERT INTO public.generations (
       id, user_id, product_id, product_version_id, source_asset_id,
       status, public_share_id
     ) VALUES ($1, $2, $3, $4, $5, 'completed', $6)`,
    [id, userId, productId, productVersionId, sourceAssetId,
     shared ? randomUUID() : null]
  );
  return id;
}

/** An active product_field row on the preset (documented public control). */
async function makeProductField(
  client: Client,
  productId: string,
  key: string,
  fieldType: string,
  config: Record<string, unknown> = {}
): Promise<void> {
  await client.query(
    `INSERT INTO public.product_fields (
       product_id, field_key, label, field_type, sort_order, config, active
     ) VALUES ($1, $2, $3, $4, 1, $5::jsonb, TRUE)`,
    [productId, key, key, fieldType, JSON.stringify(config)]
  );
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

  it("rejects an active-but-hidden preset on settings and promptRecipe blocks", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await client.query(
        `UPDATE public.products SET visibility = 'internal' WHERE id = $1`,
        [productId]
      );
      for (const block of [
        settingsBlock(productId),
        promptRecipeBlock({ presetId: productId }),
      ]) {
        const { articleId, editVersion } = await makeArticle(client, staffId, [
          paragraph,
          block,
        ]);
        expect(
          await publishErr(client, staffId, articleId, editVersion)
        ).toContain("preset_unavailable");
      }
    });
  });

  it("publishes a promptRecipe whose asset reference is this article's media", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      const draft = await makeArticle(client, staffId, [paragraph]);
      const { assetId, publishedKey } = await makeArticleAsset(
        client, draft.articleId, staffId
      );
      // The collector now pulls promptRecipe asset refs into v_refs — the
      // asset must have its staged public object like any other media.
      await stagePublicObject(client, publishedKey);
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

  it("rejects non-array reference payloads instead of treating them as empty", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      // Valid JSON, wrong top-level type — previously these decoded through
      // the '[]' fallback and silently passed.
      for (const references of ["{}", "42", "\"a string\"", "true"]) {
        const { articleId, editVersion } = await makeArticle(client, staffId, [
          paragraph,
          promptRecipeBlock({ references }),
        ]);
        expect(
          await publishErr(client, staffId, articleId, editVersion)
        ).toContain("media_ref_not_ready");
      }
      // Non-string prop types, including explicit JSON null, must be
      // rejected even when the save-layer schema is bypassed.
      for (const invalidReferences of [{ not: "a string" }, null]) {
        const draft = await makeArticle(client, staffId, [paragraph]);
        await client.query(
          `UPDATE public.articles SET draft_content = $2::jsonb WHERE id = $1`,
          [
            draft.articleId,
            JSON.stringify([
              paragraph,
              {
                type: "promptRecipe",
                props: {
                  presetId: "",
                  slug: "",
                  recipeText: "steps",
                  source: "manual",
                  capturedAt: "",
                  references: invalidReferences,
                },
              },
            ]),
          ]
        );
        expect(
          await publishErr(client, staffId, draft.articleId, draft.editVersion)
        ).toContain("media_ref_not_ready");
      }
    });
  });

  it("rejects semantically malformed reference elements", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      for (const bad of [
        ["just a string"],
        [{ id: randomUUID(), label: "no kind" }],
        [{ id: randomUUID(), label: "bad kind", kind: "internal" }],
        [{ id: "not-a-uuid", label: "bad id", kind: "asset" }],
        [{ id: randomUUID(), label: "", kind: "asset" }],
      ]) {
        const { articleId, editVersion } = await makeArticle(client, staffId, [
          paragraph,
          promptRecipeBlock({ references: JSON.stringify(bad) }),
        ]);
        expect(
          await publishErr(client, staffId, articleId, editVersion)
        ).toContain("media_ref_not_ready");
      }
    });
  });

  it("rejects a generation-kind reference that is not publicly shared", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId, productVersionId } = await makeProduct(client);
      const unshared = await makeGeneration(
        client, productId, productVersionId, false
      );
      const forged = randomUUID();
      for (const genId of [unshared, forged]) {
        const { articleId, editVersion } = await makeArticle(client, staffId, [
          paragraph,
          promptRecipeBlock({
            references: JSON.stringify([
              { id: genId, label: "Shared result", kind: "generation" },
            ]),
          }),
        ]);
        expect(
          await publishErr(client, staffId, articleId, editVersion)
        ).toContain("media_ref_not_ready");
      }
    });
  });

  it("publishes a generation-kind reference to a currently shared result", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId, productVersionId } = await makeProduct(client);
      const shared = await makeGeneration(
        client, productId, productVersionId, true
      );
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        promptRecipeBlock({
          references: JSON.stringify([
            { id: shared, label: "Shared result", kind: "generation" },
          ]),
        }),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toBeNull();
    });
  });
});

describe("publish_article settings fields gate", () => {
  it("rejects a row whose key is not a documented control", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await makeProductField(client, productId, "style", "select", {
        options: [{ value: "film", label: "Film" }],
      });
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock(
          productId,
          JSON.stringify([{ key: "unknown_knob", label: "X", value: "y" }])
        ),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "settings_fields_invalid"
      );
    });
  });

  it("rejects a choice value outside the documented options", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await makeProductField(client, productId, "style", "select", {
        options: [
          { value: "film", label: "Film" },
          { value: "neon", label: "Neon" },
        ],
      });
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock(
          productId,
          JSON.stringify([{ key: "style", label: "Style", value: "midnight" }])
        ),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "settings_fields_invalid"
      );
    });
  });

  it("rejects an intensity value outside the documented range", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await makeProductField(client, productId, "grain", "intensity", {
        min: 0,
        max: 100,
      });
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock(
          productId,
          JSON.stringify([{ key: "grain", label: "Grain", value: "400" }])
        ),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toContain(
        "settings_fields_invalid"
      );
    });
  });

  it("rejects non-array fields payloads instead of treating them as empty", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      for (const fields of ["{}", "42", "\"a string\"", "true"]) {
        const { articleId, editVersion } = await makeArticle(client, staffId, [
          paragraph,
          settingsBlock(productId, fields),
        ]);
        expect(
          await publishErr(client, staffId, articleId, editVersion)
        ).toContain("settings_fields_invalid");
      }
      // A JSON null prop is not an omitted snapshot: direct RPC callers
      // must not bypass the required string/array contract.
      const draft = await makeArticle(client, staffId, [paragraph]);
      await client.query(
        `UPDATE public.articles SET draft_content = $2::jsonb WHERE id = $1`,
        [
          draft.articleId,
          JSON.stringify([
            paragraph,
            { type: "settings", props: { presetId: productId, fields: null } },
          ]),
        ]
      );
      expect(
        await publishErr(client, staffId, draft.articleId, draft.editVersion)
      ).toContain("settings_fields_invalid");
    });
  });

  it("rejects semantically malformed rows and malformed JSON alike", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await makeProductField(client, productId, "style", "short_text");
      for (const fields of [
        "{broken json",
        JSON.stringify(["a string"]),
        JSON.stringify([{ key: "style" }]),
        JSON.stringify([{ key: "style", label: "S", value: 42 }]),
      ]) {
        const { articleId, editVersion } = await makeArticle(client, staffId, [
          paragraph,
          settingsBlock(productId, fields),
        ]);
        expect(
          await publishErr(client, staffId, articleId, editVersion)
        ).toContain("settings_fields_invalid");
      }
    });
  });

  it("publishes rows consistent with the documented control schema", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      await makeProductField(client, productId, "style", "select", {
        options: [{ value: "film", label: "Film" }],
      });
      await makeProductField(client, productId, "grain", "intensity", {
        min: 0,
        max: 100,
      });
      const { articleId, editVersion } = await makeArticle(client, staffId, [
        paragraph,
        settingsBlock(
          productId,
          JSON.stringify([
            { key: "style", label: "Style", value: "film" },
            { key: "grain", label: "Grain", value: "40" },
          ])
        ),
      ]);
      expect(await publishErr(client, staffId, articleId, editVersion)).toBeNull();
    });
  });
});

describe("promptRecipe asset references are real media references", () => {
  it("promotes and publishes an asset referenced only by a prompt recipe", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      const draft = await makeArticle(client, staffId, [paragraph]);
      const { assetId, articleAssetId, publishedKey } = await makeArticleAsset(
        client, draft.articleId, staffId
      );
      await stagePublicObject(client, publishedKey);
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
      await asUser(client, staffId, () =>
        client.query(`SELECT public.publish_article($1, $2)`, [
          draft.articleId,
          Number(saved.rows[0].v),
        ])
      );
      // The prompt-recipe-only reference joined v_refs → promotion ran.
      const { rows } = await client.query(
        `SELECT state, published_key FROM public.article_assets WHERE id = $1`,
        [articleAssetId]
      );
      expect(rows[0].state).toBe("published");
      expect(rows[0].published_key).toBe(publishedKey);
    });
  });

  it("cannot delete an asset a live publication references only via a prompt recipe", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { productId } = await makeProduct(client);
      const draft = await makeArticle(client, staffId, [paragraph]);
      const { assetId, articleAssetId, publishedKey } = await makeArticleAsset(
        client, draft.articleId, staffId
      );
      await stagePublicObject(client, publishedKey);
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
      await asUser(client, staffId, () =>
        client.query(`SELECT public.publish_article($1, $2)`, [
          draft.articleId,
          Number(saved.rows[0].v),
        ])
      );
      // Remove the reference from the DRAFT — the live snapshot still holds
      // it, so deletion must stay blocked via the published content.
      await asUser(client, staffId, () =>
        client.query(
          `SELECT public.save_article_draft($1, $2, NULL, NULL, NULL, NULL, NULL,
                                            NULL, FALSE, $3::jsonb, 1, 'manual')`,
          [
            draft.articleId,
            Number(saved.rows[0].v),
            JSON.stringify([paragraph]),
          ]
        )
      );
      await expect(
        asUser(client, staffId, () =>
          client.query(`SELECT public.delete_article_media($1)`, [
            articleAssetId,
          ])
        )
      ).rejects.toThrow("media_in_use");
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
