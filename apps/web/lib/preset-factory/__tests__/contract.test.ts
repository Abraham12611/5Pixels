import { describe, expect, it } from "vitest";
import {
  MAX_BATCH_ITEMS,
  adminReviewPath,
  catalogQuerySchema,
  createCategoryRequestSchema,
  presetDraftBatchSchema,
  presetDraftItemSchema,
  type PresetDraftItem,
} from "@/lib/preset-factory/contract";

/**
 * Issue #271 — Preset Factory contract schemas.
 *
 * UNEXECUTED per the owner's manual-only testing policy (#270): these tests
 * are written for review and must not be run until the owner authorizes
 * automated testing.
 */

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function validVersion() {
  return {
    private_instruction_template: "cinematic noir grade, preserve identity",
    provider_strategy: {
      primary_provider: "fal-ai",
      primary_model: "nano-banana/edit",
    },
    safety_config: {
      allowed_nsfw: false,
      block_public_figures: true,
      block_minors: true,
    },
    post_process_config: { format: "webp", quality: 90 },
    credit_cost: 0,
  };
}

function validFilterItem(overrides: Record<string, unknown> = {}) {
  return {
    client_item_id: "item-1",
    idempotency_key: "0123456789abcdef",
    product: {
      type: "filter",
      slug: "cinematic-noir-01",
      name: "Cinematic Noir",
      filter_config: { style_archetype: "noir" },
    },
    version: validVersion(),
    ...overrides,
  };
}

describe("presetDraftItemSchema", () => {
  it("accepts a complete filter draft item", () => {
    const parsed = presetDraftItemSchema.parse(validFilterItem());
    expect(parsed.product.type).toBe("filter");
    expect(parsed.fields).toEqual([]);
    expect(parsed.asset_links).toEqual([]);
  });

  it("rejects client-supplied public_status (forged activation)", () => {
    const result = presetDraftItemSchema.safeParse(
      validFilterItem({
        product: {
          type: "filter",
          slug: "x-1",
          name: "X",
          public_status: "active",
          filter_config: { style_archetype: "noir" },
        },
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects client-supplied version state (forged active version)", () => {
    const result = presetDraftItemSchema.safeParse(
      validFilterItem({
        version: { ...validVersion(), state: "active" },
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects forged product/version ids", () => {
    const withProductId = presetDraftItemSchema.safeParse(
      validFilterItem({
        product: {
          type: "filter",
          slug: "x-1",
          name: "X",
          id: uuid(99),
          filter_config: { style_archetype: "noir" },
        },
      })
    );
    expect(withProductId.success).toBe(false);

    const withVersionId = presetDraftItemSchema.safeParse(
      validFilterItem({ version: { ...validVersion(), id: uuid(98) } })
    );
    expect(withVersionId.success).toBe(false);
  });

  it("requires filter_config for filters and poster_config for posters", () => {
    const filterMissing = presetDraftItemSchema.safeParse(
      validFilterItem({
        product: { type: "filter", slug: "x-1", name: "X" },
      })
    );
    expect(filterMissing.success).toBe(false);

    const posterMissing = presetDraftItemSchema.safeParse(
      validFilterItem({
        product: { type: "poster", slug: "x-2", name: "Y" },
      })
    );
    expect(posterMissing.success).toBe(false);
  });

  it("accepts a complete poster draft", () => {
    const parsed = presetDraftItemSchema.safeParse(
      validFilterItem({
        product: {
          type: "poster",
          slug: "editorial-poster-01",
          name: "Editorial Poster",
          poster_config: {
            layout_template: "portrait",
            text_fields: [
              { key: "headline", label: "Headline", required: true },
            ],
            text_layer_config: {
              position: "bottom",
              size: "large",
              alignment: "center",
            },
            background_handling: "replace",
          },
        },
      })
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects variant fields without a parent preset", () => {
    const result = presetDraftItemSchema.safeParse(
      validFilterItem({
        product: {
          type: "filter",
          slug: "x-1",
          name: "X",
          filter_config: { style_archetype: "noir" },
          variant_display_name: "Softer",
        },
      })
    );
    expect(result.success).toBe(false);
  });

  it("accepts a variant bound to a root parent", () => {
    const parsed = presetDraftItemSchema.parse(
      validFilterItem({
        product: {
          type: "filter",
          slug: "cinematic-noir-01-soft",
          name: "Cinematic Noir — Soft",
          filter_config: { style_archetype: "noir" },
          parent_preset_id: uuid(7),
          variant_display_name: "Soft",
          standalone_discoverable: false,
        },
      })
    );
    expect(parsed.product.parent_preset_id).toBe(uuid(7));
  });

  it("rejects malformed slugs and short idempotency keys", () => {
    const badSlug = presetDraftItemSchema.safeParse(
      validFilterItem({
        product: {
          type: "filter",
          slug: "Bad Slug!",
          name: "X",
          filter_config: { style_archetype: "noir" },
        },
      })
    );
    expect(badSlug.success).toBe(false);

    const shortKey = presetDraftItemSchema.safeParse(
      validFilterItem({ idempotency_key: "short" })
    );
    expect(shortKey.success).toBe(false);
  });

  it("rejects output sizes above the 4MP cap", () => {
    const result = presetDraftItemSchema.safeParse(
      validFilterItem({
        version: {
          ...validVersion(),
          output_sizes: [
            { name: "huge", width: 3000, height: 3000, is_default: true },
          ],
        },
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects invalid asset link roles", () => {
    const result = presetDraftItemSchema.safeParse(
      validFilterItem({
        asset_links: [{ asset_id: uuid(5), role: "not_a_role" }],
      })
    );
    expect(result.success).toBe(false);
  });

  it("rejects internal_only:false on private *_reference links", () => {
    const result = presetDraftItemSchema.safeParse(
      validFilterItem({
        asset_links: [
          {
            asset_id: uuid(5),
            role: "style_reference",
            internal_only: false,
          },
        ],
      })
    );
    expect(result.success).toBe(false);

    // Same role without the flag is fine — enforced true downstream.
    const ok = presetDraftItemSchema.safeParse(
      validFilterItem({
        asset_links: [{ asset_id: uuid(5), role: "style_reference" }],
      })
    );
    expect(ok.success).toBe(true);

    // Non-reference roles may still opt into internal_only either way.
    const example = presetDraftItemSchema.safeParse(
      validFilterItem({
        asset_links: [
          { asset_id: uuid(5), role: "example_result", internal_only: false },
        ],
      })
    );
    expect(example.success).toBe(true);
  });
});

describe("presetDraftBatchSchema", () => {
  const batch = (items: PresetDraftItem[] | unknown[]) => ({
    batch_id: "batch-1",
    items,
  });

  it("accepts a valid batch", () => {
    const parsed = presetDraftBatchSchema.parse(batch([validFilterItem()]));
    expect(parsed.items).toHaveLength(1);
  });

  it("rejects more than the bounded batch size", () => {
    const items = Array.from({ length: MAX_BATCH_ITEMS + 1 }, (_, i) =>
      validFilterItem({
        client_item_id: `i-${i}`,
        idempotency_key: `0123456789abcdef${i}`,
        product: {
          type: "filter",
          slug: `slug-${i}`,
          name: `P${i}`,
          filter_config: { style_archetype: "noir" },
        },
      })
    );
    const result = presetDraftBatchSchema.safeParse(batch(items));
    expect(result.success).toBe(false);
  });

  it("rejects duplicated client_item_id, idempotency_key, and slug", () => {
    const a = validFilterItem();
    const b = validFilterItem({
      product: {
        type: "filter",
        slug: "other-slug",
        name: "Other",
        filter_config: { style_archetype: "noir" },
      },
      idempotency_key: "fedcba9876543210",
    });
    // duplicate client_item_id
    expect(presetDraftBatchSchema.safeParse(batch([a, b])).success).toBe(false);

    const c = validFilterItem({
      client_item_id: "item-2",
      product: {
        type: "filter",
        slug: "other-slug",
        name: "Other",
        filter_config: { style_archetype: "noir" },
      },
    });
    // duplicate idempotency_key
    expect(presetDraftBatchSchema.safeParse(batch([a, c])).success).toBe(false);

    const d = validFilterItem({
      client_item_id: "item-2",
      idempotency_key: "fedcba9876543210",
    });
    // duplicate slug
    expect(presetDraftBatchSchema.safeParse(batch([a, d])).success).toBe(false);
  });
});

describe("createCategoryRequestSchema", () => {
  it("requires a replay-safe idempotency key", () => {
    const result = createCategoryRequestSchema.safeParse({
      name: "Cinematic",
      slug: "cinematic",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed category", () => {
    const parsed = createCategoryRequestSchema.parse({
      name: "Cinematic",
      slug: "cinematic",
      idempotency_key: "0123456789abcdef",
    });
    expect(parsed.sort_order).toBe(0);
  });
});

describe("catalogQuerySchema", () => {
  it("defaults to a bounded page", () => {
    const parsed = catalogQuerySchema.parse({});
    expect(parsed.limit).toBe(100);
    expect(parsed.offset).toBe(0);
    expect(parsed.family).toBe("all");
  });
});

describe("adminReviewPath", () => {
  it("routes by product type", () => {
    expect(adminReviewPath("filter", uuid(1))).toBe(
      `/admin/filters/${uuid(1)}`
    );
    expect(adminReviewPath("poster", uuid(1))).toBe(
      `/admin/posters/${uuid(1)}`
    );
  });
});
