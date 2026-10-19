import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicProductBySlug = vi.fn();
vi.mock("@/lib/db/explore", () => ({
  getPublicProductBySlug: (...args: unknown[]) =>
    getPublicProductBySlug(...args),
  getUserFavoriteProductIds: vi.fn(async () => []),
}));

import { generateMetadata } from "../page";

/**
 * Page-level regression for #181 indexing policy: the pure rules live in
 * `lib/catalog/discovery` — this asserts `generateMetadata` actually wires
 * the resolved product into canonical/robots output for each visibility
 * state, including the orphaned-dependent edge case.
 */

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "warm-look",
    name: "Warm Look",
    type: "filter",
    short_description: "A warm grade",
    long_description: null,
    credit_cost: 5,
    public_assets: [],
    parent_preset_id: null,
    standalone_discoverable: false,
    parent_slug: null,
    parent_name: null,
    parent_is_public: null,
    ...overrides,
  };
}

function meta(p: unknown) {
  getPublicProductBySlug.mockResolvedValue({ data: p });
  return generateMetadata({
    params: Promise.resolve({ slug: "warm-look" }),
  });
}

beforeEach(() => getPublicProductBySlug.mockReset());

describe("preset detail generateMetadata — canonical policy (#181)", () => {
  it("self-canonicals a root preset", async () => {
    const metadata = await meta(product());
    expect(metadata.alternates?.canonical).toBe("/presets/warm-look");
    expect(metadata.robots).toBeUndefined();
  });

  it("self-canonicals a standalone-discoverable variant", async () => {
    const metadata = await meta(
      product({
        parent_preset_id: "root1",
        standalone_discoverable: true,
        parent_slug: "root-look",
        parent_name: "Root Look",
        parent_is_public: true,
      })
    );
    expect(metadata.alternates?.canonical).toBe("/presets/warm-look");
    expect(metadata.robots).toBeUndefined();
  });

  it("canonicals a dependent variant to its reachable parent", async () => {
    const metadata = await meta(
      product({
        parent_preset_id: "root1",
        parent_slug: "root-look",
        parent_name: "Root Look",
        parent_is_public: true,
      })
    );
    expect(metadata.alternates?.canonical).toBe("/presets/root-look");
    expect(metadata.robots).toBeUndefined();
  });

  it("noindexes a dependent variant whose parent is unreachable", async () => {
    const metadata = await meta(
      product({
        parent_preset_id: "root1",
        parent_slug: "root-look",
        parent_name: "Root Look",
        parent_is_public: false,
      })
    );
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBeUndefined();
  });

  it("keeps title/description/OG output regardless of index policy", async () => {
    const metadata = await meta(
      product({ parent_preset_id: "root1", parent_is_public: true })
    );
    expect(metadata.title).toBe("Warm Look — 5Pixels");
    expect(metadata.description).toBe("A warm grade");
    expect(metadata.openGraph?.title).toBe("Warm Look — 5Pixels");
  });

  it("returns the not-found title when the slug does not resolve", async () => {
    const metadata = await meta(null);
    expect(metadata.title).toBe("Preset not found — 5Pixels");
  });
});
