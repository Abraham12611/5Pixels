import { describe, expect, it } from "vitest";
import { planPresetBatch, slugify } from "../preset-factory/planner";
import type { CatalogItemSummary, CategorySummary } from "@/lib/preset-factory/contract";

/**
 * NOTE: written but intentionally UNEXECUTED per the owner's manual-only
 * test policy on #272 — run with the rest of the suite only after the owner
 * authorizes automated testing.
 */

const CATEGORIES: CategorySummary[] = [
  { id: "00000000-0000-4000-8000-0000000000c1", slug: "cinematic", name: "Cinematic", description: null, is_active: true, sort_order: 10 },
  { id: "00000000-0000-4000-8000-0000000000c2", slug: "portrait", name: "Portrait", description: null, is_active: true, sort_order: 20 },
  { id: "00000000-0000-4000-8000-0000000000c3", slug: "archive", name: "Archive", description: null, is_active: false, sort_order: 30 },
];

const CATALOG: CatalogItemSummary[] = [
  {
    product_id: "00000000-0000-4000-8000-0000000000a1", slug: "noir-portrait", name: "Noir Portrait", type: "filter",
    public_status: "active", visibility: "public", category_id: CATEGORIES[1].id, category_slug: "portrait",
    parent_preset_id: null, standalone_discoverable: false, variant_display_name: null,
    version_count: 2, has_active_version: true, has_editable_version: false, latest_version_number: 2,
    field_count: 0, media: { has_hero: true, has_poster: false, has_preview_video: true, has_preview_gif: false, reference_count: 0 },
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    product_id: "00000000-0000-4000-8000-0000000000a2", slug: "noir-portrait-warm", name: "Noir Warm", type: "filter",
    public_status: "active", visibility: "public", category_id: CATEGORIES[1].id, category_slug: "portrait",
    parent_preset_id: "00000000-0000-4000-8000-0000000000a1", standalone_discoverable: false, variant_display_name: "Warm",
    version_count: 1, has_active_version: true, has_editable_version: false, latest_version_number: 1,
    field_count: 0, media: { has_hero: true, has_poster: false, has_preview_video: false, has_preview_gif: false, reference_count: 0 },
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
  },
];

describe("slugify", () => {
  it("normalizes to lowercase hyphenated slugs", () => {
    expect(slugify("Neon Bloom 80's")).toBe("neon-bloom-80s");
    expect(slugify("  Cinematic — Gold  ")).toBe("cinematic-gold");
    expect(slugify("!!!")).toBe("");
  });
});

describe("planPresetBatch", () => {
  it("maps existing categories by name or slug without proposing new ones", () => {
    const plan = planPresetBatch(
      [
        { name: "Velvet Dusk", type: "filter", concept: "deep velvet tones", category: "Cinematic" },
        { name: "Paper Grain", type: "filter", concept: "matte grain", category: "portrait" },
      ],
      CATALOG,
      CATEGORIES
    );
    expect(plan.items).toHaveLength(2);
    expect(plan.proposed_categories.every((c) => c.status === "existing")).toBe(true);
    expect(plan.summary.new_categories).toBe(0);
  });

  it("auto-renames slug collisions against the catalog and within the batch", () => {
    const plan = planPresetBatch(
      [
        { name: "Noir Portrait", type: "filter", concept: "a", category: "portrait" },
        { name: "Noir Portrait", type: "filter", concept: "b", category: "portrait" },
      ],
      CATALOG,
      CATEGORIES
    );
    const slugs = plan.items.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(2);
    expect(slugs.every((s) => s !== "noir-portrait")).toBe(true);
    expect(plan.summary.slug_collisions).toBe(2);
  });

  it("flags unknown categories as proposed_new and carries the reason", () => {
    const plan = planPresetBatch(
      [
        {
          name: "Chrome Reverie", type: "poster", concept: "chrome editorial",
          category: "Retro Futurism", proposes_new_category: true,
          new_category_reason: "no existing category covers retro-futurist posters",
        },
      ],
      CATALOG,
      CATEGORIES
    );
    expect(plan.proposed_categories[0]).toMatchObject({ slug: "retro-futurism", status: "proposed_new" });
  });

  it("warns on missing new-category reason and on inactive category reuse", () => {
    const plan = planPresetBatch(
      [
        { name: "X", type: "filter", concept: "x", category: "Brand New Thing" },
        { name: "Y", type: "filter", concept: "y", category: "Archive" },
      ],
      CATALOG,
      CATEGORIES
    );
    expect(plan.items[0].warnings.join()).toMatch(/proposed as new/i);
    expect(plan.items[1].warnings.join()).toMatch(/inactive/i);
  });

  it("allows one-level family attachment to a non-variant parent only", () => {
    const plan = planPresetBatch(
      [
        { name: "Noir Cool", type: "filter", concept: "cool variant", category: "portrait", parent_preset_slug: "noir-portrait" },
        { name: "Nested", type: "filter", concept: "n", category: "portrait", parent_preset_slug: "noir-portrait-warm" },
      ],
      CATALOG,
      CATEGORIES
    );
    expect(plan.items[0].parent).toEqual({ slug: "noir-portrait", product_id: CATALOG[0].product_id });
    expect(plan.items[1].parent).toBeNull();
    expect(plan.items[1].warnings.join()).toMatch(/one level/i);
  });

  it("rejects items missing required fields and caps at MAX_BATCH_ITEMS", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      name: `Item ${i}`, type: "filter" as const, concept: "c", category: "portrait",
    }));
    const plan = planPresetBatch([{ name: "", type: "filter", concept: "", category: "portrait" }, ...many], CATALOG, CATEGORIES);
    expect(plan.items.length).toBe(24);
    expect(plan.summary.items_rejected).toBe(1);
    expect(plan.warnings.join()).toMatch(/capped/i);
  });
});
