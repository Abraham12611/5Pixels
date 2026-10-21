import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asService, asUser, withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #251 — stale-draft version resolution.
 *
 * A product can carry a leftover draft numbered below its live (active)
 * version — e.g. Retro Slam Manga's draft v4 while live v5 served customers.
 * These tests pin the guards that keep a stale draft from masquerading as or
 * publishing over the live recipe, plus the explicit discard/rebase
 * resolution workflow and the source pick used when duplicating.
 */

async function makeStaff(client: Client): Promise<string> {
  const userId = randomUUID();
  // Seed is_admin at INSERT time — the privilege-escalation guard trigger
  // blocks promotion after creation (same pattern as
  // atomic-product-writes.db.test.ts).
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

const SAFETY_CONFIG = {
  allowed_nsfw: false,
  block_public_figures: true,
  block_minors: true,
};

interface VersionSpec {
  version_number: number;
  state: string;
  route?: string;
}

/**
 * A publish-gate-clean product carrying the requested versions — mirrors the
 * Retro Slam Manga incident when given [{v4 draft pro}, {v5 active banana}].
 */
async function makeVersionedProduct(
  client: Client,
  ownerId: string,
  versionSpecs: VersionSpec[],
  opts: { withBoundAsset?: boolean } = {}
): Promise<{
  productId: string;
  versionIds: Record<number, string>;
  boundAssetId?: string;
}> {
  const productId = randomUUID();
  const slug = `dbtest-stale-${productId.slice(0, 8)}`;
  const heroId = randomUUID();
  const posterId = randomUUID();
  await client.query(
    `INSERT INTO public.assets (
       id, owner_user_id, storage_provider, storage_key, bucket,
       media_type, mime_type, moderation_status
     ) VALUES
       ($1, $3, 'supabase', $4, 'admin-assets', 'image', 'image/png', 'approved'),
       ($2, $3, 'supabase', $5, 'admin-assets', 'image', 'image/png', 'approved')`,
    [heroId, posterId, ownerId, `dbtest/${heroId}.png`, `dbtest/${posterId}.png`]
  );
  await client.query(
    `INSERT INTO public.products (
       id, type, slug, name, public_status, visibility,
       hero_asset_id, poster_asset_id, metadata
     ) VALUES ($1, 'filter', $2, $3, 'active', 'public', $4, $5,
       '{"filter_config":{"style_archetype":"retro"}}'::jsonb)`,
    [productId, slug, `Stale ${slug}`, heroId, posterId]
  );

  const versionIds: Record<number, string> = {};
  for (const spec of versionSpecs) {
    const versionId = randomUUID();
    versionIds[spec.version_number] = versionId;
    await client.query(
      `INSERT INTO public.product_versions (
         id, product_id, version_number, state,
         private_instruction_template, provider_strategy,
         safety_config, credit_cost, published_at
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6::jsonb, $7::jsonb, 3,
         CASE WHEN $4 IN ('active', 'retired') THEN NOW() ELSE NULL END
       )`,
      [
        versionId,
        productId,
        spec.version_number,
        spec.state,
        `recipe for v${spec.version_number}`,
        JSON.stringify({
          primary_provider: "fal",
          primary_model: spec.route ?? `model-v${spec.version_number}`,
        }),
        JSON.stringify(SAFETY_CONFIG),
      ]
    );
  }

  let boundAssetId: string | undefined;
  if (opts.withBoundAsset) {
    // A reference asset pinned to the ACTIVE version — the fidelity signal
    // for clone/rebase.
    const activeId =
      versionIds[versionSpecs.find((v) => v.state === "active")!.version_number];
    boundAssetId = randomUUID();
    await client.query(
      `INSERT INTO public.assets (
         id, owner_user_id, storage_provider, storage_key, bucket,
         media_type, mime_type, moderation_status
       ) VALUES ($1, $2, 'supabase', $3, 'admin-assets', 'image',
         'image/png', 'approved')`,
      [boundAssetId, ownerId, `dbtest/${boundAssetId}.png`]
    );
    await client.query(
      `INSERT INTO public.product_assets (
         product_id, product_version_id, asset_id, role, sort_order,
         internal_only
       ) VALUES ($1, $2, $3, 'style_reference', 0, true)`,
      [productId, activeId, boundAssetId]
    );
  }

  return { productId, versionIds, boundAssetId };
}

describe("publish_product_version — stale-draft conflict (#251)", () => {
  it("rejects publishing draft v4 over live v5 and leaves live untouched", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId, versionIds } = await makeVersionedProduct(
        client,
        ownerId,
        [
          { version_number: 4, state: "draft", route: "nano-banana-pro/edit" },
          { version_number: 5, state: "active", route: "nano-banana/edit" },
        ]
      );

      await expect(
        asUser(client, staffId, () =>
          client.query(
            `SELECT public.publish_product_version($1, $2, NULL)`,
            [productId, versionIds[4]]
          )
        )
      ).rejects.toThrow(/older than the live v5/);

      const after = await asService(client, async () => {
        const states = await client.query(
          `SELECT version_number, state FROM public.product_versions
           WHERE product_id = $1 ORDER BY version_number`,
          [productId]
        );
        const product = await client.query(
          `SELECT public_status FROM public.products WHERE id = $1`,
          [productId]
        );
        return { states: states.rows, status: product.rows[0].public_status };
      });
      expect(after.states).toEqual([
        { version_number: 4, state: "draft" },
        { version_number: 5, state: "active" },
      ]);
      expect(after.status).toBe("active");
    });
  });

  it("also rejects a stale testing version over live", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId, versionIds } = await makeVersionedProduct(
        client,
        ownerId,
        [
          { version_number: 4, state: "testing" },
          { version_number: 5, state: "active" },
        ]
      );

      await expect(
        asUser(client, staffId, () =>
          client.query(
            `SELECT public.publish_product_version($1, $2, NULL)`,
            [productId, versionIds[4]]
          )
        )
      ).rejects.toThrow(/older than the live v5/);
    });
  });

  it("publishes a newer draft v6 over live v5", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId, versionIds } = await makeVersionedProduct(
        client,
        ownerId,
        [
          { version_number: 5, state: "active" },
          { version_number: 6, state: "draft" },
        ]
      );

      await asUser(client, staffId, () =>
        client.query(`SELECT public.publish_product_version($1, $2, NULL)`, [
          productId,
          versionIds[6],
        ])
      );

      const states = await asService(
        client,
        async () =>
          (
            await client.query(
              `SELECT version_number, state FROM public.product_versions
               WHERE product_id = $1 ORDER BY version_number`,
              [productId]
            )
          ).rows
      );
      expect(states).toEqual([
        { version_number: 5, state: "retired" },
        { version_number: 6, state: "active" },
      ]);
    });
  });

  it("publishes a first draft when nothing is live yet", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId, versionIds } = await makeVersionedProduct(
        client,
        ownerId,
        [{ version_number: 1, state: "draft" }]
      );

      await asUser(client, staffId, () =>
        client.query(`SELECT public.publish_product_version($1, $2, NULL)`, [
          productId,
          versionIds[1],
        ])
      );

      const state = await asService(
        client,
        async () =>
          (
            await client.query(
              `SELECT state FROM public.product_versions WHERE id = $1`,
              [versionIds[1]]
            )
          ).rows[0].state
      );
      expect(state).toBe("active");
    });
  });
});

describe("admin_resolve_stale_versions — discard/rebase (#251)", () => {
  it("discards the stale draft and rebases onto a fresh clone of live", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId, versionIds, boundAssetId } =
        await makeVersionedProduct(
          client,
          ownerId,
          [
            { version_number: 4, state: "draft", route: "nano-banana-pro/edit" },
            { version_number: 5, state: "active", route: "nano-banana/edit" },
          ],
          { withBoundAsset: true }
        );

      const newDraftId = await asUser(client, staffId, async () => {
        const result = await client.query(
          `SELECT public.admin_resolve_stale_versions($1, TRUE) AS id`,
          [productId]
        );
        return result.rows[0].id as string;
      });
      expect(newDraftId).toBeTruthy();

      const after = await asService(client, async () => {
        const versions = await client.query(
          `SELECT id, version_number, state, private_instruction_template,
                  provider_strategy
           FROM public.product_versions
           WHERE product_id = $1 ORDER BY version_number`,
          [productId]
        );
        const links = await client.query(
          `SELECT product_version_id, asset_id FROM public.product_assets
           WHERE product_id = $1 AND product_version_id IS NOT NULL`,
          [productId]
        );
        const audit = await client.query(
          `SELECT action FROM public.admin_audit_logs
           WHERE action = 'product_version.resolve_stale'
           ORDER BY created_at DESC LIMIT 1`,
          []
        );
        return { versions: versions.rows, links: links.rows, audit: audit.rows };
      });

      // Stale draft retired; live untouched; fresh draft is a live clone.
      const stale = after.versions.find((v) => v.version_number === 4);
      const live = after.versions.find((v) => v.version_number === 5);
      const fresh = after.versions.find((v) => v.id === newDraftId);
      expect(stale.state).toBe("retired");
      expect(live.state).toBe("active");
      expect(fresh.state).toBe("draft");
      expect(fresh.version_number).toBe(6);
      expect(fresh.private_instruction_template).toBe(
        live.private_instruction_template
      );
      expect(fresh.provider_strategy).toEqual(live.provider_strategy);
      expect(fresh.provider_strategy).toEqual({
        primary_provider: "fal",
        primary_model: "nano-banana/edit",
      });

      // The live version's bound reference asset is rebound onto the clone —
      // the stale draft's inputs never leak into it.
      expect(after.links).toEqual([
        { product_version_id: versionIds[5], asset_id: boundAssetId },
        { product_version_id: newDraftId, asset_id: boundAssetId },
      ]);
      expect(after.audit[0].action).toBe("product_version.resolve_stale");
    });
  });

  it("discards stale drafts without creating a new draft when asked", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId } = await makeVersionedProduct(client, ownerId, [
        { version_number: 3, state: "testing" },
        { version_number: 4, state: "draft" },
        { version_number: 5, state: "active" },
      ]);

      const newDraftId = await asUser(client, staffId, async () => {
        const result = await client.query(
          `SELECT public.admin_resolve_stale_versions($1, FALSE) AS id`,
          [productId]
        );
        return result.rows[0].id as string | null;
      });
      expect(newDraftId).toBeNull();

      const states = await asService(
        client,
        async () =>
          (
            await client.query(
              `SELECT version_number, state FROM public.product_versions
               WHERE product_id = $1 ORDER BY version_number`,
              [productId]
            )
          ).rows
      );
      expect(states).toEqual([
        { version_number: 3, state: "retired" },
        { version_number: 4, state: "retired" },
        { version_number: 5, state: "active" },
      ]);
    });
  });

  it("leaves a newer draft alone while resolving older stale ones", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId } = await makeVersionedProduct(client, ownerId, [
        { version_number: 4, state: "draft" },
        { version_number: 5, state: "active" },
        { version_number: 6, state: "draft" },
      ]);

      await asUser(client, staffId, () =>
        client.query(
          `SELECT public.admin_resolve_stale_versions($1, FALSE)`,
          [productId]
        )
      );

      const states = await asService(
        client,
        async () =>
          (
            await client.query(
              `SELECT version_number, state FROM public.product_versions
               WHERE product_id = $1 ORDER BY version_number`,
              [productId]
            )
          ).rows
      );
      expect(states).toEqual([
        { version_number: 4, state: "retired" },
        { version_number: 5, state: "active" },
        { version_number: 6, state: "draft" },
      ]);
    });
  });

  it("refuses to run when nothing is stale", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId } = await makeVersionedProduct(client, ownerId, [
        { version_number: 5, state: "active" },
        { version_number: 6, state: "draft" },
      ]);

      await expect(
        asUser(client, staffId, () =>
          client.query(`SELECT public.admin_resolve_stale_versions($1)`, [
            productId,
          ])
        )
      ).rejects.toThrow(/no stale versions/);
    });
  });

  it("refuses to run when the product has no live version", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId } = await makeVersionedProduct(client, ownerId, [
        { version_number: 1, state: "draft" },
      ]);

      await expect(
        asUser(client, staffId, () =>
          client.query(`SELECT public.admin_resolve_stale_versions($1)`, [
            productId,
          ])
        )
      ).rejects.toThrow(/no live version/);
    });
  });
});

describe("admin_duplicate_product — source pick (#251)", () => {
  it("clones the live v5 recipe, not the stale draft v4", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId: ownerId } = await makeUser(client);
      const { productId } = await makeVersionedProduct(client, ownerId, [
        { version_number: 4, state: "draft", route: "nano-banana-pro/edit" },
        { version_number: 5, state: "active", route: "nano-banana/edit" },
      ]);

      const copyId = await asUser(client, staffId, async () => {
        const result = await client.query(
          `SELECT (public.admin_duplicate_product(
             $1, $2, 'Copied', NULL, NULL
           )).id AS id`,
          [productId, `dbtest-copy-${randomUUID().slice(0, 8)}`]
        );
        return result.rows[0].id as string;
      });

      const copyVersion = await asService(
        client,
        async () =>
          (
            await client.query(
              `SELECT version_number, state, provider_strategy,
                      private_instruction_template
               FROM public.product_versions WHERE product_id = $1`,
              [copyId]
            )
          ).rows[0]
      );
      expect(copyVersion.state).toBe("draft");
      expect(copyVersion.provider_strategy).toEqual({
        primary_provider: "fal",
        primary_model: "nano-banana/edit",
      });
      expect(copyVersion.private_instruction_template).toBe("recipe for v5");
    });
  });
});
