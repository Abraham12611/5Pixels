import { createHash, randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asAnon, asService, asUser, withDb } from "./helpers/db";
import {
  createGeneration,
  grantCredits,
  makeAsset,
  makeProduct,
  makeQuote,
  makeSnapshot,
  makeUser,
} from "./helpers/fixtures";

/**
 * Issue #176 — preset family columns, per-version input capability, and the
 * immutable generation_input_assets provenance table.
 *
 * Exercises the real constraints, triggers, RLS and RPCs against local
 * Postgres — nothing is mocked.
 */

// ---------------------------------------------------------------------------
// Local builders
// ---------------------------------------------------------------------------

async function makeStaff(client: Client): Promise<string> {
  const userId = randomUUID();
  // Seed is_admin at INSERT time — the privilege-escalation guard trigger
  // prevents promotion after creation (see article-public-read.db.test.ts).
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

async function makeProductRow(
  client: Client,
  opts: { parentId?: string; standalone?: boolean; displayName?: string } = {}
): Promise<string> {
  const productId = randomUUID();
  await client.query(
    `INSERT INTO public.products (
       id, type, slug, name, public_status, visibility,
       parent_preset_id, standalone_discoverable, variant_display_name
     ) VALUES ($1, 'filter', $2, $3, 'active', 'public', $4, $5, $6)`,
    [
      productId,
      `dbtest-${productId.slice(0, 8)}`,
      `DB Test ${productId.slice(0, 8)}`,
      opts.parentId ?? null,
      opts.standalone ?? false,
      opts.displayName ?? null,
    ]
  );
  return productId;
}

/** Product + version with an explicit input capability contract. */
async function makeMultiProduct(
  client: Client,
  capability: {
    inputMode?: string;
    min?: number;
    max?: number;
    roles?: { name: string; optional?: boolean }[];
    promptEnabled?: boolean;
    promptMaxChars?: number;
  } = {}
): Promise<{ productId: string; productVersionId: string }> {
  const productId = randomUUID();
  const productVersionId = randomUUID();
  await client.query(
    `INSERT INTO public.products (id, type, slug, name, public_status, visibility)
     VALUES ($1, 'filter', $2, $3, 'active', 'public')`,
    [
      productId,
      `dbtest-${productId.slice(0, 8)}`,
      `DB Test ${productId.slice(0, 8)}`,
    ]
  );
  await client.query(
    `INSERT INTO public.product_versions (
       id, product_id, version_number, state, private_instruction_template,
       credit_cost, input_mode, input_min_images, input_max_images,
       input_image_roles, prompt_override_enabled, prompt_max_chars
     ) VALUES ($1, $2, 1, 'active', 'db-test instruction', 0,
               $3, $4, $5, $6::jsonb, $7, $8)`,
    [
      productVersionId,
      productId,
      capability.inputMode ?? "multi",
      capability.min ?? 1,
      capability.max ?? 2,
      JSON.stringify(capability.roles ?? []),
      capability.promptEnabled ?? false,
      capability.promptMaxChars ?? 0,
    ]
  );
  return { productId, productVersionId };
}

/** Quote whose params pin the exact input set + prompt hash (#176). */
async function makeBoundQuote(
  client: Client,
  opts: {
    userId: string;
    productId: string;
    productVersionId: string;
    snapshotId: string;
    endpointId: string;
    inputAssetIds: string[];
    userPrompt?: string | null;
  }
): Promise<string> {
  const quoteId = randomUUID();
  const policy = await client.query(
    `SELECT version FROM public.pricing_policies WHERE is_active LIMIT 1`
  );
  const prompt = opts.userPrompt?.trim() || null;
  await client.query(
    `INSERT INTO public.generation_quotes (
       id, user_id, product_id, product_version_id, provider, endpoint_id,
       allowed_endpoint_ids, expected_cost_usd, maximum_cost_usd,
       reserve_credits, pricing_snapshot_id, policy_version, params,
       options_fingerprint, expires_at
     ) VALUES (
       $1, $2, $3, $4, 'fal', $5, ARRAY[$5], 0.08, 0.1, 10, $6, $7, $8,
       public.options_fingerprint('{}'::jsonb), NOW() + INTERVAL '10 minutes'
     )`,
    [
      quoteId,
      opts.userId,
      opts.productId,
      opts.productVersionId,
      opts.endpointId,
      opts.snapshotId,
      policy.rows[0]?.version ?? 2,
      JSON.stringify({
        width: 1024,
        height: 1024,
        primary_components: {},
        input_asset_ids: opts.inputAssetIds,
        input_count: opts.inputAssetIds.length,
        prompt_hash: prompt
          ? createHash("sha256").update(prompt, "utf8").digest("hex")
          : null,
      }),
    ]
  );
  return quoteId;
}

/** New-signature create_generation call as the owning user. */
async function createGenerationMulti(
  client: Client,
  opts: {
    userId: string;
    quoteId: string;
    inputs: { assetId: string; role?: string }[];
    userPrompt?: string | null;
    options?: Record<string, unknown>;
  }
) {
  return asUser(client, opts.userId, async () => {
    const res = await client.query(
      `SELECT * FROM public.create_generation(
         $1::uuid, $2::jsonb, $3::jsonb, $4::text, $5
       )`,
      [
        opts.quoteId,
        JSON.stringify(
          opts.inputs.map((i) => ({ asset_id: i.assetId, role: i.role ?? null }))
        ),
        JSON.stringify(opts.options ?? {}),
        opts.userPrompt ?? null,
        `idem-${randomUUID()}`,
      ]
    );
    return res.rows[0];
  });
}

async function inputAssetsOf(client: Client, generationId: string) {
  const res = await client.query(
    `SELECT ordinal, asset_id, role, product_version_id
     FROM public.generation_input_assets
     WHERE generation_id = $1 ORDER BY ordinal`,
    [generationId]
  );
  return res.rows;
}

// ---------------------------------------------------------------------------
// Preset family — structural rules
// ---------------------------------------------------------------------------

describe("preset family constraints", () => {
  it("accepts a valid parent/child link and rejects self-parenting", async () => {
    await withDb(async (client) => {
      const parentId = await makeProductRow(client);
      const childId = await makeProductRow(client, {
        parentId,
        displayName: "Warm",
      });

      const row = await client.query(
        `SELECT parent_preset_id, variant_display_name
         FROM public.products WHERE id = $1`,
        [childId]
      );
      expect(row.rows[0].parent_preset_id).toBe(parentId);

      // Self-parenting is rejected by the CHECK on a fresh root (the family
      // trigger would fire first on a product that already has children).
      const standaloneId = await makeProductRow(client);
      await expect(
        client.query(
          `UPDATE public.products SET parent_preset_id = id WHERE id = $1`,
          [standaloneId]
        )
      ).rejects.toThrow(/products_no_self_parent|violates check/i);
    });
  });

  it("rejects nesting: a variant cannot be a parent", async () => {
    await withDb(async (client) => {
      const parentId = await makeProductRow(client);
      const childId = await makeProductRow(client, { parentId });
      const grandchildId = await makeProductRow(client);

      await expect(
        client.query(
          `UPDATE public.products SET parent_preset_id = $1 WHERE id = $2`,
          [childId, grandchildId]
        )
      ).rejects.toThrow(/single-level|variant cannot be a parent/i);
    });
  });

  it("rejects parenting a product that already has children", async () => {
    await withDb(async (client) => {
      const parentId = await makeProductRow(client);
      await makeProductRow(client, { parentId });
      const otherRoot = await makeProductRow(client);

      await expect(
        client.query(
          `UPDATE public.products SET parent_preset_id = $1 WHERE id = $2`,
          [otherRoot, parentId]
        )
      ).rejects.toThrow(/has variants cannot itself become a variant/i);
    });
  });

  it("rejects variant-only fields on a standalone product", async () => {
    await withDb(async (client) => {
      await expect(
        client.query(
          `INSERT INTO public.products (
             id, type, slug, name, public_status, visibility,
             standalone_discoverable
           ) VALUES ($1, 'filter', $2, 'x', 'active', 'public', true)`,
          [randomUUID(), `dbtest-${randomUUID().slice(0, 8)}`]
        )
      ).rejects.toThrow(/products_variant_fields_require_parent|check/i);
    });
  });

  it("rejects a variant whose type differs from its parent", async () => {
    await withDb(async (client) => {
      const parentId = await makeProductRow(client); // type 'filter'
      const posterId = randomUUID();
      await expect(
        client.query(
          `INSERT INTO public.products (
             id, type, slug, name, public_status, visibility, parent_preset_id
           ) VALUES ($1, 'poster', $2, 'x', 'active', 'public', $3)`,
          [posterId, `dbtest-${posterId.slice(0, 8)}`, parentId]
        )
      ).rejects.toThrow(/type must match/i);
    });
  });

  it("blocks family writes for non-admin users (RLS)", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const parentId = await makeProductRow(client);
      const standaloneId = await makeProductRow(client);

      const updated = await asUser(client, userId, async () => {
        return client.query(
          `UPDATE public.products SET parent_preset_id = $1 WHERE id = $2`,
          [parentId, standaloneId]
        );
      });
      // RLS silently filters — the row is untouched rather than erroring.
      expect(updated.rowCount).toBe(0);

      // Admin path works through the same table policy.
      const staffId = await makeStaff(client);
      const adminUpdate = await asUser(client, staffId, async () => {
        return client.query(
          `UPDATE public.products SET parent_preset_id = $1 WHERE id = $2`,
          [parentId, standaloneId]
        );
      });
      expect(adminUpdate.rowCount).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Per-version input capability CHECK
// ---------------------------------------------------------------------------

describe("product_versions input capability", () => {
  it.each([
    ["single mode with max 2", { inputMode: "single", max: 2 }],
    ["min above max", { inputMode: "multi", min: 3, max: 2 }],
    ["max above the hard cap", { inputMode: "multi", min: 1, max: 9 }],
    [
      "more declared roles than max images",
      {
        inputMode: "multi",
        min: 1,
        max: 2,
        roles: [{ name: "a" }, { name: "b" }, { name: "c" }],
      },
    ],
    [
      "duplicate role names",
      {
        inputMode: "multi",
        min: 1,
        max: 2,
        roles: [{ name: "a" }, { name: "a" }],
      },
    ],
    [
      "prompt length while prompts are disabled",
      { inputMode: "multi", min: 1, max: 2, promptMaxChars: 200 },
    ],
    [
      "prompt enabled with zero length bound",
      { inputMode: "multi", min: 1, max: 2, promptEnabled: true, promptMaxChars: 0 },
    ],
  ])("rejects %s", async (_label, capability) => {
    await withDb(async (client) => {
      await expect(makeMultiProduct(client, capability)).rejects.toThrow(
        /product_versions_input_contract|check/i
      );
    });
  });

  it("accepts a well-formed multi contract", async () => {
    await withDb(async (client) => {
      const { productVersionId } = await makeMultiProduct(client, {
        inputMode: "multi",
        min: 1,
        max: 3,
        roles: [{ name: "subject" }, { name: "background", optional: true }],
        promptEnabled: true,
        promptMaxChars: 500,
      });
      const res = await client.query(
        `SELECT input_mode, input_max_images, prompt_max_chars
         FROM public.product_versions WHERE id = $1`,
        [productVersionId]
      );
      expect(res.rows[0].input_mode).toBe("multi");
      expect(res.rows[0].input_max_images).toBe(3);
      expect(res.rows[0].prompt_max_chars).toBe(500);
    });
  });
});

// ---------------------------------------------------------------------------
// create_generation — multi-input path + quote binding
// ---------------------------------------------------------------------------

describe("create_generation input contract", () => {
  async function setup(client: Client, capability = {}) {
    const { userId } = await makeUser(client);
    await grantCredits(client, userId, 20);
    const { productId, productVersionId } = await makeMultiProduct(
      client,
      capability
    );
    const { snapshotId, endpointId } = await makeSnapshot(client);
    return { userId, productId, productVersionId, snapshotId, endpointId };
  }

  it("stores the ordered input set and mirrors source_asset_id = ordinal 1", async () => {
    await withDb(async (client) => {
      const { userId, productId, productVersionId, snapshotId, endpointId } =
        await setup(client, { min: 1, max: 2 });
      const a1 = await makeAsset(client, userId);
      const a2 = await makeAsset(client, userId);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [a1, a2],
      });

      const created = await createGenerationMulti(client, {
        userId,
        quoteId,
        inputs: [{ assetId: a1 }, { assetId: a2 }],
      });
      expect(created.status).toBe("created");

      const inputs = await inputAssetsOf(client, created.generation_id);
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toMatchObject({
        ordinal: 1,
        asset_id: a1,
        product_version_id: productVersionId,
      });
      expect(inputs[1]).toMatchObject({ ordinal: 2, asset_id: a2 });

      const gen = await client.query(
        `SELECT source_asset_id FROM public.generations WHERE id = $1`,
        [created.generation_id]
      );
      expect(gen.rows[0].source_asset_id).toBe(a1);
    });
  });

  it("rejects an input count outside the version capability", async () => {
    await withDb(async (client) => {
      const { userId, productId, productVersionId, snapshotId, endpointId } =
        await setup(client, { min: 2, max: 2 });
      const a1 = await makeAsset(client, userId);
      // Quote is bound to one input; submitting one also violates min=2 —
      // the capability check must reject before the quote binding even runs.
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [a1],
      });
      await expect(
        createGenerationMulti(client, {
          userId,
          quoteId,
          inputs: [{ assetId: a1 }],
        })
      ).rejects.toThrow(/not allowed for this preset/i);
    });
  });

  it("rejects a cross-owner input asset", async () => {
    await withDb(async (client) => {
      const { userId, productId, productVersionId, snapshotId, endpointId } =
        await setup(client, { min: 1, max: 2 });
      const { userId: otherId } = await makeUser(client);
      const mine = await makeAsset(client, userId);
      const theirs = await makeAsset(client, otherId);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [mine, theirs],
      });
      await expect(
        createGenerationMulti(client, {
          userId,
          quoteId,
          inputs: [{ assetId: mine }, { assetId: theirs }],
        })
      ).rejects.toThrow(/Invalid source asset/i);
    });
  });

  it("rejects input substitution against a bound quote", async () => {
    await withDb(async (client) => {
      const { userId, productId, productVersionId, snapshotId, endpointId } =
        await setup(client, { min: 1, max: 2 });
      const quoted = await makeAsset(client, userId);
      const swapped = await makeAsset(client, userId);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [quoted],
      });
      await expect(
        createGenerationMulti(client, {
          userId,
          quoteId,
          inputs: [{ assetId: swapped }],
        })
      ).rejects.toThrow(/Quote does not match request/i);
    });
  });

  it("rejects custom prompts when the version has not opted in", async () => {
    await withDb(async (client) => {
      const { userId, productId, productVersionId, snapshotId, endpointId } =
        await setup(client, { inputMode: "single", min: 1, max: 1 });
      const assetId = await makeAsset(client, userId);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "make it warmer",
      });
      await expect(
        createGenerationMulti(client, {
          userId,
          quoteId,
          inputs: [{ assetId: assetId }],
          userPrompt: "make it warmer",
        })
      ).rejects.toThrow(/Custom prompts are not enabled/i);
    });
  });

  it("stores an allowed prompt and rejects a mismatched prompt hash", async () => {
    await withDb(async (client) => {
      const { userId, productId, productVersionId, snapshotId, endpointId } =
        await setup(client, {
          inputMode: "single",
          min: 1,
          max: 1,
          promptEnabled: true,
          promptMaxChars: 500,
        });
      const assetId = await makeAsset(client, userId);

      // Mismatched prompt text fails quote binding.
      const badQuote = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "quoted prompt",
      });
      await expect(
        createGenerationMulti(client, {
          userId,
          quoteId: badQuote,
          inputs: [{ assetId: assetId }],
          userPrompt: "different prompt",
        })
      ).rejects.toThrow(/Quote does not match request/i);

      // Matching prompt is stored verbatim + hashed.
      const goodQuote = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "make it warmer",
      });
      const created = await createGenerationMulti(client, {
        userId,
        quoteId: goodQuote,
        inputs: [{ assetId: assetId }],
        userPrompt: "make it warmer",
      });
      const gen = await client.query(
        `SELECT user_prompt, user_prompt_sha256
         FROM public.generations WHERE id = $1`,
        [created.generation_id]
      );
      expect(gen.rows[0].user_prompt).toBe("make it warmer");
      expect(gen.rows[0].user_prompt_sha256).toBe(
        createHash("sha256").update("make it warmer", "utf8").digest("hex")
      );
    });
  });

  it("legacy single-asset signature still works and writes the input row", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 20);
      const { productId, productVersionId } = await makeProduct(client);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      const { quoteId } = await makeQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        reserveCredits: 10,
        expectedCostUsd: 0.08,
        maximumCostUsd: 0.1,
      });
      const sourceAssetId = await makeAsset(client, userId);
      const created = await createGeneration(client, {
        userId,
        quoteId,
        sourceAssetId,
      });
      const inputs = await inputAssetsOf(client, created.generationId);
      expect(inputs).toHaveLength(1);
      expect(inputs[0].asset_id).toBe(sourceAssetId);
      expect(inputs[0].product_version_id).toBe(productVersionId);
    });
  });
});

// ---------------------------------------------------------------------------
// generation_input_assets — integrity + RLS
// ---------------------------------------------------------------------------

describe("generation_input_assets", () => {
  async function setupGeneration(client: Client) {
    const { userId } = await makeUser(client);
    await grantCredits(client, userId, 20);
    const { productId, productVersionId } = await makeProduct(client);
    const { snapshotId, endpointId } = await makeSnapshot(client);
    const { quoteId } = await makeQuote(client, {
      userId,
      productId,
      productVersionId,
      snapshotId,
      endpointId,
    });
    const sourceAssetId = await makeAsset(client, userId);
    const created = await createGeneration(client, {
      userId,
      quoteId,
      sourceAssetId,
    });
    return { userId, productVersionId, generationId: created.generationId };
  }

  it("rejects a duplicate ordinal", async () => {
    await withDb(async (client) => {
      const { userId, productVersionId, generationId } =
        await setupGeneration(client);
      const extra = await makeAsset(client, userId);
      await expect(
        client.query(
          `INSERT INTO public.generation_input_assets
             (generation_id, ordinal, asset_id, product_version_id)
           VALUES ($1, 1, $2, $3)`,
          [generationId, extra, productVersionId]
        )
      ).rejects.toThrow(/duplicate key|pkey/i);
    });
  });

  it("rejects a cross-owner asset mapping", async () => {
    await withDb(async (client) => {
      const { userId: otherId } = await makeUser(client);
      const foreignAsset = await makeAsset(client, otherId);
      const { productVersionId, generationId } =
        await setupGeneration(client);
      await expect(
        client.query(
          `INSERT INTO public.generation_input_assets
             (generation_id, ordinal, asset_id, product_version_id)
           VALUES ($1, 2, $2, $3)`,
          [generationId, foreignAsset, productVersionId]
        )
      ).rejects.toThrow(/not owned by the generation owner/i);
    });
  });

  it("rejects a pinned-version mismatch", async () => {
    await withDb(async (client) => {
      const { userId, generationId } = await setupGeneration(client);
      const { productVersionId: otherVersionId } = await makeProduct(client);
      const extra = await makeAsset(client, userId);
      await expect(
        client.query(
          `INSERT INTO public.generation_input_assets
             (generation_id, ordinal, asset_id, product_version_id)
           VALUES ($1, 2, $2, $3)`,
          [generationId, extra, otherVersionId]
        )
      ).rejects.toThrow(/different product version/i);
    });
  });

  it("rejects an undeclared role name", async () => {
    await withDb(async (client) => {
      const { userId, productVersionId, generationId } =
        await setupGeneration(client);
      const extra = await makeAsset(client, userId);
      await expect(
        client.query(
          `INSERT INTO public.generation_input_assets
             (generation_id, ordinal, asset_id, role, product_version_id)
           VALUES ($1, 2, $2, 'not_declared', $3)`,
          [generationId, extra, productVersionId]
        )
      ).rejects.toThrow(/not declared by the pinned version/i);
    });
  });

  it("rejects updates — input history is immutable", async () => {
    await withDb(async (client) => {
      const { generationId } = await setupGeneration(client);
      await expect(
        client.query(
          `UPDATE public.generation_input_assets
           SET role = 'subject' WHERE generation_id = $1`,
          [generationId]
        )
      ).rejects.toThrow(/immutable/i);
    });
  });

  it("owner reads inputs; other users and anon get nothing", async () => {
    await withDb(async (client) => {
      const { userId, generationId } = await setupGeneration(client);
      const { userId: strangerId } = await makeUser(client);

      const ownerRows = await asUser(client, userId, async () => {
        const res = await client.query(
          `SELECT asset_id FROM public.generation_input_assets
           WHERE generation_id = $1`,
          [generationId]
        );
        return res.rows;
      });
      expect(ownerRows).toHaveLength(1);

      const strangerRows = await asUser(client, strangerId, async () => {
        const res = await client.query(
          `SELECT asset_id FROM public.generation_input_assets
           WHERE generation_id = $1`,
          [generationId]
        );
        return res.rows;
      });
      expect(strangerRows).toHaveLength(0);

      // anon holds no grant at all — the read itself is refused.
      await expect(
        asAnon(client, async () => {
          await client.query(
            `SELECT asset_id FROM public.generation_input_assets`
          );
        })
      ).rejects.toThrow(/permission denied/i);

      // service_role bypasses RLS for reconciliation/audit lanes.
      const serviceRows = await asService(client, async () => {
        const res = await client.query(
          `SELECT asset_id FROM public.generation_input_assets
           WHERE generation_id = $1`,
          [generationId]
        );
        return res.rows;
      });
      expect(serviceRows).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Catalog contract — discovery hiding + family RPC
// ---------------------------------------------------------------------------

describe("catalog family contract", () => {
  it("hidden variants stay out of get_public_catalog but resolve by slug", async () => {
    await withDb(async (client) => {
      const { productId: parentId, productVersionId } =
        await makeProduct(client);
      const slug = `dbtest-parent-${randomUUID().slice(0, 8)}`;
      await client.query(
        `UPDATE public.products SET slug = $1 WHERE id = $2`,
        [slug, parentId]
      );

      const childId = await makeProductRow(client, { parentId });
      const visibleChildId = await makeProductRow(client, {
        parentId,
        standalone: true,
        displayName: "Warm",
      });
      // Children need an active version to be quotable/listed.
      for (const cid of [childId, visibleChildId]) {
        await client.query(
          `INSERT INTO public.product_versions (
             id, product_id, version_number, state,
             private_instruction_template, credit_cost
           ) VALUES ($1, $2, 1, 'active', 'db-test', 0)`,
          [randomUUID(), cid]
        );
      }

      const catalog = await asAnon(client, async () => {
        const res = await client.query(
          `SELECT id, parent_preset_id, standalone_discoverable, variant_count
           FROM public.get_public_catalog(NULL, NULL, $1::uuid[], NULL, 'featured', 1, 50)`,
          [[parentId, childId, visibleChildId]]
        );
        return res.rows;
      });

      const ids = catalog.map((r) => r.id);
      expect(ids).toContain(parentId);
      expect(ids).toContain(visibleChildId);
      expect(ids).not.toContain(childId);
      expect(catalog.find((r) => r.id === parentId).variant_count).toBe(2);

      const childSlug = (
        await client.query(
          `SELECT slug FROM public.products WHERE id = $1`,
          [childId]
        )
      ).rows[0].slug;
      const detail = await asAnon(client, async () => {
        const res = await client.query(
          `SELECT id, parent_preset_id, family_id, input_capability
           FROM public.get_public_product_by_slug($1)`,
          [childSlug]
        );
        return res.rows[0];
      });
      // Hidden ≠ unreachable: direct slug still resolves for family URLs.
      expect(detail.id).toBe(childId);
      expect(detail.parent_preset_id).toBe(parentId);
      expect(detail.family_id).toBe(parentId);
      expect(detail.input_capability.mode).toBe("single");
      expect(detail.input_capability.prompt.enabled).toBe(false);
      void productVersionId;
    });
  });

  it("get_preset_family returns ordered members from any member id", async () => {
    await withDb(async (client) => {
      const parentId = await makeProductRow(client);
      const childId = await makeProductRow(client, {
        parentId,
        displayName: "Warm",
      });

      const rows = await asAnon(client, async () => {
        const res = await client.query(
          `SELECT product_id, is_parent, is_current, variant_display_name
           FROM public.get_preset_family($1)`,
          [childId]
        );
        return res.rows;
      });

      expect(rows).toHaveLength(2);
      expect(rows[0].is_parent).toBe(true);
      expect(rows[1]).toMatchObject({
        product_id: childId,
        is_parent: false,
        is_current: true,
        variant_display_name: "Warm",
      });
    });
  });

  it("get_preset_family returns nothing for an unavailable product", async () => {
    await withDb(async (client) => {
      const draftId = randomUUID();
      await client.query(
        `INSERT INTO public.products (id, type, slug, name, public_status, visibility)
         VALUES ($1, 'filter', $2, 'x', 'draft', 'public')`,
        [draftId, `dbtest-${draftId.slice(0, 8)}`]
      );
      const rows = await asAnon(client, async () => {
        const res = await client.query(
          `SELECT product_id FROM public.get_preset_family($1)`,
          [draftId]
        );
        return res.rows;
      });
      expect(rows).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// pending_generations — deferred-auth multi-input contract
// ---------------------------------------------------------------------------

describe("pending_generations input_assets", () => {
  it("defaults to the legacy single-asset shape and validates structure", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const { productVersionId } = await makeProduct(client);
      const assetId = await makeAsset(client, userId);

      // Legacy shape: no input_assets — default '[]' is fine.
      const legacy = await client.query(
        `INSERT INTO public.pending_generations (
           id, anon_session_id, product_version_id, source_asset_id,
           params, output_size
         ) VALUES ($1, $2, $3, $4, '{}', '{}') RETURNING input_assets`,
        [randomUUID(), randomUUID(), productVersionId, assetId]
      );
      expect(legacy.rows[0].input_assets).toEqual([]);

      // Well-formed multi-input set is accepted.
      const a2 = await makeAsset(client, userId);
      await client.query(
        `INSERT INTO public.pending_generations (
           id, anon_session_id, product_version_id, source_asset_id,
           input_assets, params, output_size
         ) VALUES ($1, $2, $3, $4, $5::jsonb, '{}', '{}')`,
        [
          randomUUID(),
          randomUUID(),
          productVersionId,
          assetId,
          JSON.stringify([
            { asset_id: assetId, role: null },
            { asset_id: a2, role: "background" },
          ]),
        ]
      );

      // Malformed shapes are rejected by the CHECK.
      await expect(
        client.query(
          `INSERT INTO public.pending_generations (
             id, anon_session_id, product_version_id, source_asset_id,
             input_assets, params, output_size
           ) VALUES ($1, $2, $3, $4, '[{"asset_id": "nope"}]'::jsonb, '{}', '{}')`,
          [randomUUID(), randomUUID(), productVersionId, assetId]
        )
      ).rejects.toThrow(/pending_generations_input_assets_shape|check/i);
    });
  });
});
