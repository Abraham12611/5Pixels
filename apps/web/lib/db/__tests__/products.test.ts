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

describe("preset-family loaders on an un-migrated database (#208)", () => {
  function mockThenable(result: { data: unknown; error: unknown }) {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "is", "neq", "or", "in", "order"]) {
      q[m] = vi.fn(() => q);
    }
    q.single = vi.fn(async () => result);
    q.maybeSingle = vi.fn(async () => result);
    q.then = (onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onF, onR);
    return q;
  }

  const missingColumn = {
    code: "42703",
    message: 'column products.parent_preset_id does not exist',
    details: null,
    hint: null,
  };
  const missingTable = {
    code: "42P01",
    message: 'relation "public.release_gates" does not exist',
    details: null,
    hint: null,
  };
  const transient = {
    code: "57014",
    message: "canceling statement due to statement timeout",
    details: null,
    hint: null,
  };

  async function wireClient(result: { data: unknown; error: unknown }) {
    const { createClient } = await import("@/lib/supabase/server");
    const query = mockThenable(result);
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => query),
    });
    return query;
  }

  it("getEligibleParentPresets returns [] when family columns are absent (42703)", async () => {
    const { getEligibleParentPresets } = await import("../products");
    await wireClient({ data: null, error: missingColumn });
    await expect(getEligibleParentPresets("filter")).resolves.toEqual({
      parents: [],
      familySchemaAvailable: false,
    });
  });

  it("getEligibleParentPresets returns [] for PostgREST schema-cache misses", async () => {
    const { getEligibleParentPresets } = await import("../products");
    await wireClient({
      data: null,
      error: { ...missingColumn, code: "PGRST204" },
    });
    await expect(getEligibleParentPresets("poster")).resolves.toEqual({
      parents: [],
      familySchemaAvailable: false,
    });
  });

  it("getEligibleParentPresets still throws on real database errors", async () => {
    const { getEligibleParentPresets } = await import("../products");
    await wireClient({ data: null, error: transient });
    await expect(getEligibleParentPresets("filter")).rejects.toEqual(
      transient
    );
  });

  it("getPresetFamilyForAdmin returns null when family columns are absent", async () => {
    const { getPresetFamilyForAdmin } = await import("../products");
    await wireClient({ data: null, error: missingColumn });
    await expect(getPresetFamilyForAdmin("prod-1")).resolves.toEqual({
      family: null,
      familySchemaAvailable: false,
    });
  });

  it("getPresetFamilyForAdmin still throws on real database errors", async () => {
    const { getPresetFamilyForAdmin } = await import("../products");
    const self = {
      data: {
        id: "prod-1",
        slug: "x",
        name: "X",
        public_status: "active",
        parent_preset_id: null,
        standalone_discoverable: false,
        variant_display_name: null,
        variant_sort_order: 0,
        hero_asset_id: null,
      },
      error: null,
    };
    // self resolves ok, members query fails with a transient error
    const { createClient } = await import("@/lib/supabase/server");
    const calls: unknown[] = [];
    let queryIndex = 0;
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn(() => {
        queryIndex += 1;
        calls.push(queryIndex);
        return mockThenable(queryIndex === 1 ? self : {
          data: null,
          error: transient,
        });
      }),
    });
    await expect(getPresetFamilyForAdmin("prod-1")).rejects.toEqual(
      transient
    );
  });

  it("does not flag unrelated missing relations as family-schema absent", async () => {
    const { getPresetFamilyForAdmin } = await import("../products");
    // release_gates is not a preset-family-contract object — a missing
    // relation error naming it must not mark the family schema absent.
    await wireClient({ data: null, error: missingTable });
    await expect(getPresetFamilyForAdmin("prod-1")).resolves.toEqual({
      family: null,
      familySchemaAvailable: true,
    });
  });

  it("does NOT degrade on schema errors naming unrelated objects", async () => {
    const { getEligibleParentPresets } = await import("../products");
    const unrelated = {
      code: "42703",
      message: 'column products.some_other_column does not exist',
      details: null,
      hint: null,
    };
    await wireClient({ data: null, error: unrelated });
    await expect(getEligibleParentPresets("filter")).rejects.toEqual(
      unrelated
    );
  });
});
