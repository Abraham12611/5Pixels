import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import {
  asAnon,
  asOAuthUser,
  asService,
  asUser,
  withDb,
  withDbClients,
} from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #271 — Preset Factory atomic draft creation.
 *
 * `admin_create_preset_draft` must persist product + v1 draft + fields +
 * asset links + idempotency claim + audit in ONE transaction — or nothing.
 * These tests pin draft-only enforcement, idempotent replay, per-item
 * failure semantics, reference validation and the admin-only grant.
 *
 * UNEXECUTED per the owner's manual-only testing policy (#270): written for
 * review; requires `pnpm test:db` against a local Supabase stack and must
 * not run until the owner authorizes automated testing.
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

async function makeCategory(client: Client, slug?: string): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO public.categories (id, slug, name, is_active)
     VALUES ($1, $2, $3, true)`,
    [id, slug ?? `dbtest-cat-${id.slice(0, 8)}`, "DB Test Category"]
  );
  return id;
}

async function makePresetMediaAsset(
  client: Client,
  ownerId: string,
  opts: { mediaType?: string; mime?: string; visibility?: string } = {}
): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO public.assets (
       id, owner_user_id, storage_provider, storage_key, bucket,
       media_type, mime_type, visibility, moderation_status
     ) VALUES ($1, $2, 'supabase', $3, 'preset-media', $4, $5, $6, 'approved')`,
    [
      id,
      ownerId,
      `admins/${ownerId}/style-reference/${id}.png`,
      opts.mediaType ?? "image",
      opts.mime ?? "image/png",
      opts.visibility ?? "public",
    ]
  );
  return id;
}

interface DraftCallOpts {
  product?: Record<string, unknown>;
  version?: Record<string, unknown>;
  fields?: unknown[];
  assetLinks?: unknown[];
  batchId?: string;
  clientItemId?: string;
  idempotencyKey?: string;
  requestFingerprint?: string;
  approvalIntentId?: string | null;
}

function draftParams(slug: string, opts: DraftCallOpts = {}): unknown[] {
  return [
    JSON.stringify({
      type: "filter",
      slug,
      name: `Preset ${slug}`,
      filter_config: { style_archetype: "noir" },
      ...(opts.product ?? {}),
    }),
    JSON.stringify({
      filter_config: { style_archetype: "noir" },
    }),
    JSON.stringify({
      private_instruction_template: "db-test hidden recipe",
      provider_strategy: {
        primary_provider: "fal-ai",
        primary_model: "nano-banana/edit",
      },
      safety_config: {
        allowed_nsfw: false,
        block_public_figures: true,
        block_minors: true,
      },
      ...(opts.version ?? {}),
    }),
    JSON.stringify(opts.fields ?? []),
    JSON.stringify(opts.assetLinks ?? []),
    opts.batchId ?? `batch-${randomUUID().slice(0, 8)}`,
    opts.clientItemId ?? "item-1",
    opts.idempotencyKey ?? `idem-${randomUUID()}`,
    // Caller-asserted marker — required non-empty; the RPC stores its own
    // canonical payload hash, so this value is never trusted.
    opts.requestFingerprint ?? `fp-${randomUUID()}`,
    opts.approvalIntentId ?? null,
  ];
}

async function callCreateDraft(
  client: Client,
  userId: string,
  params: unknown[],
  oauth = false
): Promise<Record<string, unknown>> {
  const run = (fn: () => Promise<Record<string, unknown>>) =>
    oauth ? asOAuthUser(client, userId, fn) : asUser(client, userId, fn);
  return run(async () => {
    const res = await client.query(
      `SELECT public.admin_create_preset_draft(
         $1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10
       ) AS result`,
      params
    );
    return res.rows[0].result as Record<string, unknown>;
  });
}

describe("admin_create_preset_draft", () => {
  it("creates product + v1 draft + fields + links atomically, always draft", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const categoryId = await makeCategory(client);
      const assetId = await makePresetMediaAsset(client, staffId);
      const batchId = `batch-${randomUUID().slice(0, 8)}`;

      const result = await callCreateDraft(
        client,
        staffId,
        draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, {
          batchId,
          product: {
            // Forged fields — the RPC must ignore them and force draft.
            public_status: "active",
            category_id: categoryId,
          },
          fields: [
            {
              field_key: "strength",
              label: "Strength",
              field_type: "intensity",
              required: false,
              sort_order: 0,
              config: { min: 0, max: 1 },
              validation: {},
              active: true,
            },
          ],
          assetLinks: [
            // internal_only:false must be ignored — reference roles are
            // private recipe material and the RPC forces internal_only.
            {
              asset_id: assetId,
              role: "style_reference",
              sort_order: 0,
              internal_only: false,
            },
          ],
        })
      );

      expect(result.reused).toBe(false);
      const productId = result.product_id as string;
      const versionId = result.version_id as string;
      expect(productId).toBeTruthy();
      expect(versionId).toBeTruthy();

      await asService(client, async () => {
        const product = await client.query(
          `SELECT type, slug, public_status, category_id, metadata
           FROM public.products WHERE id = $1`,
          [productId]
        );
        expect(product.rows[0]).toMatchObject({
          type: "filter",
          public_status: "draft", // forged 'active' did NOT persist
          category_id: categoryId,
        });

        const version = await client.query(
          `SELECT version_number, state, created_by_admin_id
           FROM public.product_versions WHERE product_id = $1`,
          [productId]
        );
        expect(version.rows).toHaveLength(1);
        expect(version.rows[0]).toMatchObject({
          version_number: 1,
          state: "draft",
          created_by_admin_id: staffId,
        });

        const fields = await client.query(
          `SELECT field_key FROM public.product_fields WHERE product_id = $1`,
          [productId]
        );
        expect(fields.rows.map((r) => r.field_key)).toEqual(["strength"]);

        const links = await client.query(
          `SELECT product_version_id, asset_id, role, internal_only
           FROM public.product_assets WHERE product_id = $1`,
          [productId]
        );
        expect(links.rows).toHaveLength(1);
        expect(links.rows[0]).toMatchObject({
          product_version_id: versionId, // reference roles bind to the version
          asset_id: assetId,
          role: "style_reference",
          internal_only: true,
        });

        const op = await client.query(
          `SELECT status, product_id, version_id, batch_id
           FROM public.preset_factory_operations
           WHERE product_id = $1`,
          [productId]
        );
        expect(op.rows).toHaveLength(1);
        expect(op.rows[0]).toMatchObject({
          status: "created",
          product_id: productId,
          version_id: versionId,
          batch_id: batchId,
        });

        const audit = await client.query(
          `SELECT action, entity_id FROM public.admin_audit_logs
           WHERE entity_id = $1 AND action = 'preset_factory.draft_create'`,
          [productId]
        );
        expect(audit.rows).toHaveLength(1);
      });
    });
  });

  it("replays the same idempotency key and returns the original ids", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const slug = `dbtest-f-${randomUUID().slice(0, 8)}`;
      const key = `idem-${randomUUID()}`;
      const batchId = `batch-${randomUUID().slice(0, 8)}`;

      const first = await callCreateDraft(
        client,
        staffId,
        draftParams(slug, { batchId, idempotencyKey: key })
      );
      const second = await callCreateDraft(
        client,
        staffId,
        draftParams(slug, { batchId, idempotencyKey: key })
      );

      expect(first.reused).toBe(false);
      expect(second.reused).toBe(true);
      expect(second.product_id).toBe(first.product_id);
      expect(second.version_id).toBe(first.version_id);

      await asService(client, async () => {
        const count = await client.query(
          `SELECT COUNT(*)::int AS n FROM public.products WHERE slug = $1`,
          [slug]
        );
        expect(count.rows[0].n).toBe(1);
      });
    });
  });

  it("serializes concurrent same-key calls — one creates, one reuses", async () => {
    await withDbClients(2, async ([a, b]) => {
      const staffId = await makeStaff(a);
      const slug = `dbtest-f-${randomUUID().slice(0, 8)}`;
      const key = `idem-${randomUUID()}`;
      const batchId = `batch-${randomUUID().slice(0, 8)}`;

      const [r1, r2] = await Promise.all([
        callCreateDraft(
          a,
          staffId,
          draftParams(slug, { batchId, idempotencyKey: key })
        ),
        callCreateDraft(
          b,
          staffId,
          draftParams(slug, { batchId, idempotencyKey: key })
        ),
      ]);
      const outcomes = [r1.reused, r2.reused].sort();
      expect(outcomes).toEqual([false, true]);
      expect(r1.product_id).toBe(r2.product_id);
    });
  });

  it("fails a key replayed with a different payload (canonical fingerprint)", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const key = `idem-${randomUUID()}`;
      const batchId = `batch-${randomUUID().slice(0, 8)}`;

      const first = await callCreateDraft(
        client,
        staffId,
        draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, {
          batchId,
          idempotencyKey: key,
        })
      );
      expect(first.reused).toBe(false);

      // Same key, different payload — even if the caller *claims* the same
      // fingerprint, the server-computed canonical hash disagrees.
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, {
            batchId,
            idempotencyKey: key,
            requestFingerprint: "forged-same-fingerprint",
          })
        )
      ).rejects.toThrow(/PF_IDEMPOTENCY_CONFLICT/i);

      // And an empty fingerprint is rejected outright.
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, {
            requestFingerprint: "",
          })
        )
      ).rejects.toThrow(/PF_BAD_REQUEST/i);
    });
  });

  it("rejects non-admin and anonymous callers", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const slug = `dbtest-f-${randomUUID().slice(0, 8)}`;
      await expect(
        callCreateDraft(client, userId, draftParams(slug))
      ).rejects.toThrow(/Forbidden/i);

      await expect(
        asAnon(client, async () => {
          await client.query(
            `SELECT public.admin_create_preset_draft(
               '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
               '[]'::jsonb, '[]'::jsonb, 'b', 'i', 'k0123456789abcdef', 'fp'
             )`
          );
        })
      ).rejects.toThrow();
    });
  });

  it("fails with PF_SLUG_CONFLICT on a taken slug", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const slug = `dbtest-f-${randomUUID().slice(0, 8)}`;
      await callCreateDraft(
        client,
        staffId,
        draftParams(slug, { idempotencyKey: `a-${randomUUID()}` })
      );
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(slug, { idempotencyKey: `b-${randomUUID()}` })
        )
      ).rejects.toThrow(/PF_SLUG_CONFLICT/);
    });
  });

  it("fails with PF_INVALID_CATEGORY / PF_INVALID_PARENT / PF_INVALID_ASSET", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId } = await makeUser(client);

      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, {
            product: { category_id: randomUUID() },
          })
        )
      ).rejects.toThrow(/PF_INVALID_CATEGORY/);

      // A variant can never be a parent.
      const variantSlug = `dbtest-f-${randomUUID().slice(0, 8)}`;
      const rootSlug = `dbtest-f-${randomUUID().slice(0, 8)}`;
      const root = await callCreateDraft(
        client,
        staffId,
        draftParams(rootSlug, { idempotencyKey: `r-${randomUUID()}` })
      );
      const variant = await callCreateDraft(
        client,
        staffId,
        draftParams(variantSlug, {
          idempotencyKey: `v-${randomUUID()}`,
          product: {
            parent_preset_id: root.product_id,
            variant_display_name: "v1",
          },
        })
      );
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, {
            product: { parent_preset_id: variant.product_id },
          })
        )
      ).rejects.toThrow(/PF_INVALID_PARENT/);

      // User-owned asset in the private user-assets bucket — never linkable.
      const userAssetId = randomUUID();
      await client.query(
        `INSERT INTO public.assets (
           id, owner_user_id, storage_provider, storage_key, bucket,
           media_type, mime_type, visibility, moderation_status
         ) VALUES ($1, $2, 'supabase', $3, 'user-assets', 'image',
           'image/png', 'private', 'approved')`,
        [userAssetId, userId, `${userId}/src/${userAssetId}.png`]
      );
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, {
            assetLinks: [
              { asset_id: userAssetId, role: "style_reference", sort_order: 0 },
            ],
          })
        )
      ).rejects.toThrow(/PF_INVALID_ASSET/);
    });
  });

  it("rolls back the whole item on any failure — no orphan rows", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const slug = `dbtest-f-${randomUUID().slice(0, 8)}`;
      const key = `idem-${randomUUID()}`;

      // Invalid field_type violates the CHECK — the product insert that
      // already succeeded inside the same transaction must not persist.
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(slug, {
            idempotencyKey: key,
            fields: [
              {
                field_key: "bad",
                label: "Bad",
                field_type: "not_a_field_type",
              },
            ],
          })
        )
      ).rejects.toThrow();

      await asService(client, async () => {
        const products = await client.query(
          `SELECT COUNT(*)::int AS n FROM public.products WHERE slug = $1`,
          [slug]
        );
        expect(products.rows[0].n).toBe(0);
        const ops = await client.query(
          `SELECT COUNT(*)::int AS n
           FROM public.preset_factory_operations WHERE idempotency_key = $1`,
          [key]
        );
        // Failed items leave no ledger row — the claim rolled back too, so
        // a retry re-executes and fails deterministically.
        expect(ops.rows[0].n).toBe(0);
      });
    });
  });

  it("lets admins read the operations ledger but denies ordinary roles", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const { userId } = await makeUser(client);
      const batchId = `batch-${randomUUID().slice(0, 8)}`;
      await callCreateDraft(
        client,
        staffId,
        draftParams(`dbtest-f-${randomUUID().slice(0, 8)}`, { batchId })
      );

      const staffRows = await asUser(client, staffId, async () => {
        const res = await client.query(
          `SELECT COUNT(*)::int AS n FROM public.preset_factory_operations
           WHERE batch_id = $1`,
          [batchId]
        );
        return res.rows[0].n;
      });
      expect(staffRows).toBe(1);

      const userRows = await asUser(client, userId, async () => {
        const res = await client.query(
          `SELECT COUNT(*)::int AS n FROM public.preset_factory_operations
           WHERE batch_id = $1`,
          [batchId]
        );
        return res.rows[0].n;
      });
      expect(userRows).toBe(0); // RLS hides ledger rows from non-admins

      // Caller-bound: a *different* admin cannot read another admin's
      // operation rows either.
      const otherStaffId = await makeStaff(client);
      const otherRows = await asUser(client, otherStaffId, async () => {
        const res = await client.query(
          `SELECT COUNT(*)::int AS n FROM public.preset_factory_operations
           WHERE batch_id = $1`,
          [batchId]
        );
        return res.rows[0].n;
      });
      expect(otherRows).toBe(0);
    });
  });
});

describe("preset_factory_write_intents", () => {
  /** Builds the canonical p_items element matching draftParams' first 5 args. */
  function draftIntentItem(params: unknown[]) {
    return {
      product: JSON.parse(params[0] as string),
      metadata: JSON.parse(params[1] as string),
      version: JSON.parse(params[2] as string),
      fields: JSON.parse(params[3] as string),
      asset_links: JSON.parse(params[4] as string),
    };
  }

  async function stageIntent(
    client: Client,
    userId: string,
    items: unknown[],
    operation = "create_draft_batch"
  ): Promise<Record<string, unknown>> {
    return asOAuthUser(client, userId, async () => {
      const res = await client.query(
        `SELECT public.admin_stage_write_intent($1, $2::jsonb, $3::jsonb)
         AS result`,
        [operation, JSON.stringify(items), "{}"]
      );
      return res.rows[0].result as Record<string, unknown>;
    });
  }

  async function approveIntent(
    client: Client,
    userId: string,
    intentId: string
  ): Promise<Record<string, unknown>> {
    return asUser(client, userId, async () => {
      const res = await client.query(
        `SELECT public.admin_approve_write_intent($1) AS result`,
        [intentId]
      );
      return res.rows[0].result as Record<string, unknown>;
    });
  }

  it("OAuth draft write without an intent is refused; web token is not", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const slug = () => `dbtest-o-${randomUUID().slice(0, 8)}`;

      await expect(
        callCreateDraft(client, staffId, draftParams(slug()), true)
      ).rejects.toThrow(/PF_APPROVAL_REQUIRED/);

      // Ordinary admin UI path (no client_id claim) is unchanged.
      const webResult = await callCreateDraft(
        client,
        staffId,
        draftParams(slug())
      );
      expect(webResult.reused).toBe(false);
    });
  });

  it("stage → approve → OAuth write consumes the intent end to end", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const params = draftParams(`dbtest-o-${randomUUID().slice(0, 8)}`);

      const staged = await stageIntent(client, staffId, [
        draftIntentItem(params),
      ]);
      const intentId = staged.intent_id as string;
      expect(staged.status).toBe("pending");
      expect(staged.item_fingerprints).toHaveLength(1);

      const approved = await approveIntent(client, staffId, intentId);
      expect(approved.status).toBe("approved");

      const result = await callCreateDraft(
        client,
        staffId,
        draftParams("unused", { approvalIntentId: intentId }).map(
          (v, i) => (i < 5 ? params[i] : v) // same payload, fresh envelope ids
        ),
        true
      );
      expect(result.reused).toBe(false);

      // Fully consumed: a second item against the same intent fails.
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-o-${randomUUID().slice(0, 8)}`, {
            approvalIntentId: intentId,
          }),
          true
        )
      ).rejects.toThrow(/PF_APPROVAL_PAYLOAD_MISMATCH/);
    });
  });

  it("refuses OAuth-issued approval calls — approval needs a UI session", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const staged = await stageIntent(client, staffId, [
        draftIntentItem(draftParams(`dbtest-o-${randomUUID().slice(0, 8)}`)),
      ]);
      await expect(
        asOAuthUser(client, staffId, async () => {
          await client.query(`SELECT public.admin_approve_write_intent($1)`, [
            staged.intent_id,
          ]);
        })
      ).rejects.toThrow(/PF_APPROVAL_INVALID/);
    });
  });

  it("unapproved intent blocks the write; wrong payload fingerprint mismatches", async () => {
    await withDb(async (client) => {
      const staffId = await makeStaff(client);
      const staged = await stageIntent(client, staffId, [
        draftIntentItem(draftParams(`dbtest-o-${randomUUID().slice(0, 8)}`)),
      ]);
      const intentId = staged.intent_id as string;

      // Still pending → required.
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-o-${randomUUID().slice(0, 8)}`, {
            approvalIntentId: intentId,
          }),
          true
        )
      ).rejects.toThrow(/PF_APPROVAL_REQUIRED/);

      await approveIntent(client, staffId, intentId);

      // Approved, but the write payload differs from the staged item.
      await expect(
        callCreateDraft(
          client,
          staffId,
          draftParams(`dbtest-o-${randomUUID().slice(0, 8)}`, {
            approvalIntentId: intentId,
          }),
          true
        )
      ).rejects.toThrow(/PF_APPROVAL_PAYLOAD_MISMATCH/);
    });
  });

  it("one admin cannot read or approve another admin's intent", async () => {
    await withDb(async (client) => {
      const staffA = await makeStaff(client);
      const staffB = await makeStaff(client);
      const staged = await stageIntent(client, staffA, [
        draftIntentItem(draftParams(`dbtest-o-${randomUUID().slice(0, 8)}`)),
      ]);
      const intentId = staged.intent_id as string;

      const seen = await asUser(client, staffB, async () => {
        const res = await client.query(
          `SELECT COUNT(*)::int AS n FROM public.preset_factory_write_intents
           WHERE id = $1`,
          [intentId]
        );
        return res.rows[0].n;
      });
      expect(seen).toBe(0);

      await expect(approveIntent(client, staffB, intentId)).rejects.toThrow(
        /PF_APPROVAL_INVALID/
      );

      // Direct table writes are denied even for the owning admin.
      await expect(
        asUser(client, staffA, async () => {
          await client.query(
            `UPDATE public.preset_factory_write_intents
             SET status = 'approved' WHERE id = $1`,
            [intentId]
          );
        })
      ).rejects.toThrow();
    });
  });
});
