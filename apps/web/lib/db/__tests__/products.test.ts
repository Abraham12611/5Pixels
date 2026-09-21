import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/db/admin", () => ({
  requireAdminOrOwner: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db/audit", () => ({
  logAdminAction: vi.fn(),
}));

function mockProductsQuery(row: unknown) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn().mockReturnValue({ eq, order });
  return {
    from: vi.fn().mockReturnValue({ select }),
    _mocks: { select, eq, maybeSingle, order },
  };
}

const draftProductRow = {
  id: "prod-1",
  slug: "manga-cutout",
  name: "Manga Cutout",
  type: "filter",
  short_description: "Manga sticker look",
  long_description: null,
  category_id: null,
  categories: null,
  featured_rank: null,
  hero_asset_id: null,
  poster_asset_id: null,
  preview_gif_asset_id: null,
  preview_video_asset_id: null,
  metadata: { filter_config: { style_archetype: "manga" } },
  likeness_level: null,
  created_at: "2026-09-21T00:00:00Z",
  public_status: "draft",
  visibility: "public",
  product_versions: [
    {
      id: "ver-draft",
      state: "draft",
      version_number: 1,
      credit_cost: "5.0000",
      output_sizes: [
        { name: "square", width: 1024, height: 1024, is_default: true },
      ],
      model_config: {},
    },
  ],
  product_fields: [
    {
      id: "f1",
      field_key: "intensity",
      label: "Intensity",
      help_text: null,
      field_type: "intensity",
      required: false,
      sort_order: 1,
      config: {},
      validation: {},
      active: true,
    },
  ],
};

describe("getAdminProductBySlug", () => {
  it("returns draft products with the draft version selected", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getAdminProductBySlug } = await import("../products");

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockProductsQuery(draftProductRow)
    );

    const product = await getAdminProductBySlug("manga-cutout");

    expect(product).not.toBeNull();
    expect(product!.slug).toBe("manga-cutout");
    expect(product!.version_id).toBe("ver-draft");
    // NUMERIC arrives as a string — must be coerced for the lab workspace.
    expect(product!.credit_cost).toBe(5);
    expect(product!.output_sizes).toHaveLength(1);
    expect(product!.active_fields).toHaveLength(1);
    expect(product!.active_fields[0]!.field_key).toBe("intensity");
    expect(product!.metadata).toEqual({
      filter_config: { style_archetype: "manga" },
    });
  });

  it("returns null when the slug does not exist", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getAdminProductBySlug } = await import("../products");

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockProductsQuery(null)
    );

    expect(await getAdminProductBySlug("missing")).toBeNull();
  });

  it("prefers a draft version over an older active one", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const { getAdminProductBySlug } = await import("../products");

    const row = {
      ...draftProductRow,
      product_versions: [
        { id: "ver-active", state: "active", version_number: 1, credit_cost: "3.0000" },
        { id: "ver-draft", state: "draft", version_number: 2, credit_cost: "5.0000" },
      ],
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockProductsQuery(row)
    );

    const product = await getAdminProductBySlug("manga-cutout");
    expect(product!.version_id).toBe("ver-draft");
    expect(product!.version_number).toBe(2);
  });
});
