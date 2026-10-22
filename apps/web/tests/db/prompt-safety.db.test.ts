import { createHash, randomUUID } from "node:crypto";
import type { Client } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { asAnon, asUser, withDb } from "./helpers/db";
import {
  grantCredits,
  makeAsset,
  makeSnapshot,
  makeUser,
} from "./helpers/fixtures";

/**
 * Issue #183 — database-side enforcement of the user-edited preset prompt
 * contract on top of #176's schema.
 *
 * Complements preset-family-input-contract.db.test.ts (which covers the
 * happy-path capability + quote-hash binding). These tests pin down the
 * safety-specific behaviors: canonical empty prompts, the stored prompt's
 * cross-account isolation, per-variant capability scoping, and quote
 * invalidation when the submitted text changes.
 */

/** Product + active version with an explicit prompt capability. */
async function makePromptProduct(
  client: Client,
  opts: {
    promptEnabled: boolean;
    promptMaxChars?: number;
    parentId?: string;
  }
): Promise<{ productId: string; productVersionId: string }> {
  const productId = randomUUID();
  const productVersionId = randomUUID();
  await client.query(
    `INSERT INTO public.products (
       id, type, slug, name, public_status, visibility, parent_preset_id
     ) VALUES ($1, 'filter', $2, $3, 'active', 'public', $4)`,
    [
      productId,
      `dbtest-${productId.slice(0, 8)}`,
      `DB Test ${productId.slice(0, 8)}`,
      opts.parentId ?? null,
    ]
  );
  await client.query(
    `INSERT INTO public.product_versions (
       id, product_id, version_number, state, private_instruction_template,
       credit_cost, prompt_override_enabled, prompt_max_chars
     ) VALUES ($1, $2, 1, 'active', 'db-test instruction', 0, $3, $4)`,
    [
      productVersionId,
      productId,
      opts.promptEnabled,
      opts.promptEnabled ? (opts.promptMaxChars ?? 200) : 0,
    ]
  );
  return { productId, productVersionId };
}

/** Quote bound to the exact input set + prompt hash, as the app creates it. */
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
  // The app hashes the normalized (canonical) text; the RPC canonicalizes
  // with NULLIF(btrim(...), '') — pre-trimmed input hashes identically.
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

async function createGenerationWithPrompt(
  client: Client,
  opts: {
    userId: string;
    quoteId: string;
    assetId: string;
    userPrompt?: string | null;
  }
) {
  return asUser(client, opts.userId, async () => {
    const res = await client.query(
      `SELECT * FROM public.create_generation(
         $1::uuid, $2::jsonb, $3::jsonb, $4::text, $5
       )`,
      [
        opts.quoteId,
        JSON.stringify([{ asset_id: opts.assetId, role: null }]),
        "{}",
        opts.userPrompt ?? null,
        `idem-${randomUUID()}`,
      ]
    );
    return res.rows[0] as { generation_id: string };
  });
}

/** Opt the database into the prompt rollout gate (#183). The gate row is
 *  OFF by default and writable only by a privileged role — enabling it is
 *  a deploy-level action, which is what this superuser write models. */
async function enablePromptGate(client: Client): Promise<void> {
  await client.query(
    `UPDATE public.release_gates SET enabled = TRUE
     WHERE key = 'preset_user_prompt'`
  );
}

// The gate row persists across connections; never leak an enabled gate
// into another test even when a test fails mid-way.
afterEach(async () => {
  await withDb(async (client) => {
    await client.query(
      `UPDATE public.release_gates SET enabled = FALSE
       WHERE key = 'preset_user_prompt'`
    );
  });
});

async function setupPromptGeneration(
  client: Client,
  productOpts: { promptEnabled: boolean; promptMaxChars?: number },
  userPrompt?: string | null
) {
  await enablePromptGate(client);
  const { userId } = await makeUser(client);
  await grantCredits(client, userId, 100);
  const { productId, productVersionId } = await makePromptProduct(
    client,
    productOpts
  );
  const assetId = await makeAsset(client, userId);
  const { snapshotId, endpointId } = await makeSnapshot(client);
  const quoteId = await makeBoundQuote(client, {
    userId,
    productId,
    productVersionId,
    snapshotId,
    endpointId,
    inputAssetIds: [assetId],
    userPrompt,
  });
  const row = await createGenerationWithPrompt(client, {
    userId,
    quoteId,
    assetId,
    userPrompt,
  });
  return { userId, productId, productVersionId, generationId: row.generation_id };
}

describe("prompt persistence and isolation (#183)", () => {
  it("keeps the DB rollout gate ON by default — disabled row rejects prompts", async () => {
    await withDb(async (client) => {
      // Production behavior: the release_gates row ships enabled=FALSE.
      // The prompt capability check passes (version opted in, quote bound)
      // but the rollout gate still refuses.
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 100);
      const { productId, productVersionId } = await makePromptProduct(client, {
        promptEnabled: true,
      });
      const assetId = await makeAsset(client, userId);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "warmer light",
      });
      await expect(
        createGenerationWithPrompt(client, {
          userId,
          quoteId,
          assetId,
          userPrompt: "warmer light",
        })
      ).rejects.toThrow(/not yet enabled/i);
    });
  });

  it("authenticated role cannot enable the gate or bypass it via SET", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 100);
      const { productId, productVersionId } = await makePromptProduct(client, {
        promptEnabled: true,
      });
      const assetId = await makeAsset(client, userId);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "warmer light",
      });
      // An authenticated caller holds no privileges on release_gates —
      // read or write — so there is no request-scoped path to flip it.
      await expect(
        asUser(client, userId, async () => {
          await client.query(
            `UPDATE public.release_gates SET enabled = TRUE
             WHERE key = 'preset_user_prompt'`
          );
        })
      ).rejects.toThrow(/permission denied/i);
      await expect(
        asUser(client, userId, async () => {
          await client.query(`SELECT enabled FROM public.release_gates`);
        })
      ).rejects.toThrow(/permission denied/i);
      // A session-level GUC can be SET by any role, so the gate must not
      // consult one — the attempt below proves it has no effect.
      await expect(
        asUser(client, userId, async () => {
          await client.query(
            `SET app.preset_user_prompt_enabled = 'true'`
          );
          await client.query(
            `SELECT * FROM public.create_generation(
               $1::uuid, $2::jsonb, $3::jsonb, $4::text, $5
             )`,
            [
              quoteId,
              JSON.stringify([{ asset_id: assetId, role: null }]),
              "{}",
              "warmer light",
              `idem-${randomUUID()}`,
            ]
          );
        })
      ).rejects.toThrow(/not yet enabled/i);
    });
  });

  it("stores the canonical prompt + sha256; only the owner can read it", async () => {
    await withDb(async (client) => {
      const prompt = "warmer light, softer skin";
      const { userId, generationId } = await setupPromptGeneration(
        client,
        { promptEnabled: true },
        prompt
      );

      const stored = await client.query(
        `SELECT user_prompt, user_prompt_sha256 FROM public.generations
         WHERE id = $1`,
        [generationId]
      );
      expect(stored.rows[0].user_prompt).toBe(prompt);
      expect(stored.rows[0].user_prompt_sha256).toBe(
        createHash("sha256").update(prompt, "utf8").digest("hex")
      );

      // Owner reads their own prompt back through the detail RPC.
      const ownerRows = await asUser(client, userId, async () => {
        const res = await client.query(
          `SELECT user_prompt FROM public.get_user_generation_by_id($1)`,
          [generationId]
        );
        return res.rows;
      });
      expect(ownerRows).toHaveLength(1);
      expect(ownerRows[0].user_prompt).toBe(prompt);

      // Another user's account sees nothing — the RPC scopes to auth.uid().
      // (Direct table reads aren't a supported path: generations_admin_select
      // recursively evaluates profiles — a pre-existing latent bug noted in
      // #176's ADR — so all tenant reads go through the definer RPC.)
      const { userId: strangerId } = await makeUser(client);
      const strangerRpc = await asUser(client, strangerId, async () => {
        const res = await client.query(
          `SELECT user_prompt FROM public.get_user_generation_by_id($1)`,
          [generationId]
        );
        return res.rows;
      });
      expect(strangerRpc).toHaveLength(0);

      // Anonymous callers hold no read path at all.
      await expect(
        asAnon(client, async () => {
          await client.query(
            `SELECT user_prompt FROM public.get_user_generation_by_id($1)`,
            [generationId]
          );
        })
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("canonicalizes a whitespace-only prompt to NULL — prompt-less flow", async () => {
    await withDb(async (client) => {
      // The app normalizes whitespace-only input to null before submission;
      // NULLIF(btrim(...), '') performs the same canonicalization for the
      // space-only case and the quote's null prompt_hash matches.
      const { generationId } = await setupPromptGeneration(
        client,
        { promptEnabled: true },
        "   "
      );
      const stored = await client.query(
        `SELECT user_prompt, user_prompt_sha256 FROM public.generations
         WHERE id = $1`,
        [generationId]
      );
      expect(stored.rows[0].user_prompt).toBeNull();
      expect(stored.rows[0].user_prompt_sha256).toBeNull();
    });
  });

  it("fails closed on tab/newline-only prompt — btrim canonicalization diverges", async () => {
    await withDb(async (client) => {
      await enablePromptGate(client);
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 100);
      const { productId, productVersionId } = await makePromptProduct(client, {
        promptEnabled: true,
      });
      const assetId = await makeAsset(client, userId);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      // The app normalizes "\n\t" → null and quotes prompt_hash=null. The
      // RPC's btrim strips spaces only, so the raw text hashes non-null —
      // the mismatch fails closed. Direct-RPC callers can never widen the
      // canonicalization; only the app-normalized form passes binding.
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: null, // what the app quotes for whitespace-only input
      });
      await expect(
        createGenerationWithPrompt(client, {
          userId,
          quoteId,
          assetId,
          userPrompt: " \n\t ",
        })
      ).rejects.toThrow(/quote does not match request/i);
    });
  });

  it("rejects a prompt longer than the version's prompt_max_chars", async () => {
    await withDb(async (client) => {
      await enablePromptGate(client);
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 100);
      const { productId, productVersionId } = await makePromptProduct(client, {
        promptEnabled: true,
        promptMaxChars: 10,
      });
      const assetId = await makeAsset(client, userId);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "x".repeat(11),
      });
      await expect(
        createGenerationWithPrompt(client, {
          userId,
          quoteId,
          assetId,
          userPrompt: "x".repeat(11),
        })
      ).rejects.toThrow(/not enabled for this preset/i);
    });
  });
});

describe("cross-variant and quote invalidation (#183)", () => {
  it("rejects a prompt reused on a sibling variant that forbids prompting", async () => {
    await withDb(async (client) => {
      await enablePromptGate(client);
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 100);
      const parent = await makePromptProduct(client, { promptEnabled: true });
      const sibling = await makePromptProduct(client, {
        promptEnabled: false,
        parentId: parent.productId,
      });
      const assetId = await makeAsset(client, userId);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId: sibling.productId,
        productVersionId: sibling.productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "same prompt text",
      });
      await expect(
        createGenerationWithPrompt(client, {
          userId,
          quoteId,
          assetId,
          userPrompt: "same prompt text",
        })
      ).rejects.toThrow(/not enabled for this preset/i);
    });
  });

  it("rejects a changed prompt against a quote bound to the original", async () => {
    await withDb(async (client) => {
      await enablePromptGate(client);
      const { userId } = await makeUser(client);
      await grantCredits(client, userId, 100);
      const { productId, productVersionId } = await makePromptProduct(client, {
        promptEnabled: true,
      });
      const assetId = await makeAsset(client, userId);
      const { snapshotId, endpointId } = await makeSnapshot(client);
      // Quote priced prompt A; submitting prompt B must fail the binding.
      const quoteId = await makeBoundQuote(client, {
        userId,
        productId,
        productVersionId,
        snapshotId,
        endpointId,
        inputAssetIds: [assetId],
        userPrompt: "prompt A",
      });
      await expect(
        createGenerationWithPrompt(client, {
          userId,
          quoteId,
          assetId,
          userPrompt: "prompt B",
        })
      ).rejects.toThrow(/quote does not match request/i);
    });
  });
});
