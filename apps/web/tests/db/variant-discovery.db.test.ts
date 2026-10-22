import { randomUUID } from "node:crypto";
import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { asAnon, asUser, withDb } from "./helpers/db";
import { makeUser } from "./helpers/fixtures";

/**
 * Issue #181 — standalone-variant discovery matrix.
 *
 * get_public_catalog already carries the visibility predicate from the #176
 * contract; these tests pin the full page/RPC surface for dependent vs
 * standalone children plus the parent-attribution columns added by
 * 20261030000001_variant_discovery_attribution.sql.
 */

async function makeProductRow(
  client: Client,
  opts: {
    parentId?: string;
    standalone?: boolean;
    displayName?: string;
    status?: string;
    visibility?: string;
    name?: string;
  } = {}
): Promise<{ id: string; slug: string }> {
  const id = randomUUID();
  const slug = `dbtest-${id.slice(0, 8)}`;
  await client.query(
    `INSERT INTO public.products (
       id, type, slug, name, public_status, visibility,
       parent_preset_id, standalone_discoverable, variant_display_name
     ) VALUES ($1, 'filter', $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      slug,
      opts.name ?? `DB Test ${id.slice(0, 8)}`,
      opts.status ?? "active",
      opts.visibility ?? "public",
      opts.parentId ?? null,
      opts.standalone ?? false,
      opts.displayName ?? null,
    ]
  );
  if ((opts.status ?? "active") === "active") {
    // Listing/detail require an independently active version.
    await client.query(
      `INSERT INTO public.product_versions (
         id, product_id, version_number, state,
         private_instruction_template, credit_cost
       ) VALUES ($1, $2, 1, 'active', 'db-test', 0)`,
      [randomUUID(), id]
    );
  }
  return { id, slug };
}

async function catalogIds(
  client: Client,
  extra?: { search?: string; ids?: string[] }
): Promise<{ id: string; total_count: number }[]> {
  const res = await client.query(
    `SELECT id, total_count
     FROM public.get_public_catalog(
       NULL, NULL, $1::uuid[], $2, 'featured', 1, 50)`,
    [extra?.ids ?? null, extra?.search ?? null]
  );
  return res.rows;
}

describe("catalog discovery — dependent vs standalone variants (#181)", () => {
  it("lists standalone children and roots, hides every dependent or unavailable child", async () => {
    await withDb(async (client) => {
      const parent = await makeProductRow(client);
      const dependent = await makeProductRow(client, { parentId: parent.id });
      const standalone = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
        displayName: "Warm",
      });
      const draftChild = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
        status: "draft",
      });
      const pausedChild = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
        status: "paused",
      });
      const retiredChild = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
        status: "retired",
      });
      const internalChild = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
        visibility: "internal",
      });

      const rows = await asAnon(client, () =>
        catalogIds(client, {
          ids: [
            parent.id,
            dependent.id,
            standalone.id,
            draftChild.id,
            pausedChild.id,
            retiredChild.id,
            internalChild.id,
          ],
        })
      );
      const ids = rows.map((r) => r.id);

      expect(ids).toEqual(
        expect.arrayContaining([parent.id, standalone.id])
      );
      expect(ids).not.toContain(dependent.id);
      for (const hidden of [
        draftChild.id,
        pausedChild.id,
        retiredChild.id,
        internalChild.id,
      ]) {
        expect(ids).not.toContain(hidden);
      }
      // Pagination totals count only discoverable rows — no phantom pages.
      expect(Number(rows[0]?.total_count)).toBe(2);
    });
  });

  it("applies the same predicate to the search path", async () => {
    await withDb(async (client) => {
      const parent = await makeProductRow(client);
      const token = `shared-${randomUUID().slice(0, 8)}`;
      const dependent = await makeProductRow(client, {
        parentId: parent.id,
        name: `${token} dependent`,
      });
      const standalone = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
        name: `${token} standalone`,
      });

      const rows = await asAnon(client, () =>
        catalogIds(client, { search: token })
      );
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(standalone.id);
      expect(ids).not.toContain(dependent.id);
    });
  });

  it("keeps a standalone child listed when its parent is paused", async () => {
    await withDb(async (client) => {
      const parent = await makeProductRow(client);
      const standalone = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
      });
      const dependent = await makeProductRow(client, { parentId: parent.id });
      await client.query(
        `UPDATE public.products SET public_status = 'paused' WHERE id = $1`,
        [parent.id]
      );

      const rows = await asAnon(client, () =>
        catalogIds(client, { ids: [parent.id, standalone.id, dependent.id] })
      );
      const ids = rows.map((r) => r.id);
      // The child opted into independent discovery and is itself active —
      // the parent's state doesn't revoke that.
      expect(ids).toEqual([standalone.id]);
    });
  });

  it("never treats a child as a second family root — no duplicates", async () => {
    await withDb(async (client) => {
      const parent = await makeProductRow(client);
      const standalone = await makeProductRow(client, {
        parentId: parent.id,
        standalone: true,
      });
      const rows = await asAnon(client, () =>
        catalogIds(client, { ids: [parent.id, standalone.id] })
      );
      expect(rows.map((r) => r.id).sort()).toEqual(
        [parent.id, standalone.id].sort()
      );
    });
  });
});

describe("direct-URL resolution and parent attribution (#181)", () => {
  it("resolves a dependent child by slug with parent_slug/name/is_public", async () => {
    await withDb(async (client) => {
      const parent = await makeProductRow(client);
      const child = await makeProductRow(client, { parentId: parent.id });

      const row = await asAnon(client, async () => {
        const res = await client.query(
          `SELECT id, parent_preset_id, parent_slug, parent_name,
                  parent_is_public
           FROM public.get_public_product_by_slug($1)`,
          [child.slug]
        );
        return res.rows[0];
      });

      expect(row.id).toBe(child.id);
      expect(row.parent_preset_id).toBe(parent.id);
      expect(row.parent_slug).toBe(parent.slug);
      expect(row.parent_name).toBeTruthy();
      expect(row.parent_is_public).toBe(true);
    });
  });

  it("reports parent_is_public = false once the parent is retired", async () => {
    await withDb(async (client) => {
      const parent = await makeProductRow(client);
      const child = await makeProductRow(client, { parentId: parent.id });
      await client.query(
        `UPDATE public.products SET public_status = 'retired' WHERE id = $1`,
        [parent.id]
      );

      const row = await asAnon(client, async () => {
        const res = await client.query(
          `SELECT parent_slug, parent_is_public
           FROM public.get_public_product_by_slug($1)`,
          [child.slug]
        );
        return res.rows[0];
      });

      // The child's own page still resolves; attribution stays but the
      // canonical target is no longer public.
      expect(row.parent_slug).toBe(parent.slug);
      expect(row.parent_is_public).toBe(false);
    });
  });

  it("returns NULL parent fields for roots and standalone presets", async () => {
    await withDb(async (client) => {
      const root = await makeProductRow(client);
      const row = await asAnon(client, async () => {
        const res = await client.query(
          `SELECT parent_slug, parent_name, parent_is_public
           FROM public.get_public_product_by_slug($1)`,
          [root.slug]
        );
        return res.rows[0];
      });
      expect(row.parent_slug).toBeNull();
      expect(row.parent_name).toBeNull();
      expect(row.parent_is_public).toBe(false);
    });
  });

  it("does not resolve draft or retired children by slug", async () => {
    await withDb(async (client) => {
      const parent = await makeProductRow(client);
      const draft = await makeProductRow(client, {
        parentId: parent.id,
        status: "draft",
      });
      const retired = await makeProductRow(client, {
        parentId: parent.id,
        status: "retired",
      });

      for (const slug of [draft.slug, retired.slug]) {
        const rows = await asAnon(client, async () => {
          const res = await client.query(
            `SELECT id FROM public.get_public_product_by_slug($1)`,
            [slug]
          );
          return res.rows;
        });
        expect(rows).toHaveLength(0);
      }
    });
  });
});

describe("favorites — dependent variants resolve with attribution (#181)", () => {
  it("returns a saved dependent child with parent_slug/name and keeps it usable", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const parent = await makeProductRow(client);
      const child = await makeProductRow(client, { parentId: parent.id });
      await client.query(
        `INSERT INTO public.favorites (user_id, product_id) VALUES ($1, $2)`,
        [userId, child.id]
      );

      const row = await asUser(client, userId, async () => {
        const res = await client.query(
          `SELECT id, is_available, parent_preset_id,
                  standalone_discoverable, parent_slug, parent_name
           FROM public.get_user_favorite_products()`
        );
        return res.rows.find((r) => r.id === child.id);
      });

      expect(row).toBeDefined();
      expect(row.is_available).toBe(true);
      expect(row.parent_preset_id).toBe(parent.id);
      expect(row.standalone_discoverable).toBe(false);
      expect(row.parent_slug).toBe(parent.slug);
      expect(row.parent_name).toBeTruthy();
    });
  });
});
