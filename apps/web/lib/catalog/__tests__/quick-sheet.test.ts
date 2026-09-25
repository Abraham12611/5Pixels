import { describe, expect, it } from "vitest";
import { toQuickSheetPreset } from "@/lib/catalog/quick-sheet";
import type { PublicProductAsset, PublicProductSummary } from "@/types/catalog";

const asset = (
  role: string,
  storageKey: string,
  mimeType = "image/jpeg"
): PublicProductAsset => ({
  role,
  asset_id: `a-${storageKey}`,
  sort_order: null,
  rights_metadata: null,
  bucket: "product-public",
  storage_key: storageKey,
  mime_type: mimeType,
  width: 800,
  height: 1000,
});

const product = (
  overrides: Partial<PublicProductSummary> = {}
): PublicProductSummary => ({
  id: "p1",
  slug: "test-look",
  name: "Test Look",
  type: "filter",
  short_description: "Short",
  long_description: null,
  category_id: "c1",
  category_slug: "cinematic",
  category_name: "Cinematic",
  featured_rank: null,
  version_id: "v1",
  version_number: 1,
  credit_cost: 4,
  output_sizes: [],
  metadata: null,
  hero_asset_id: null,
  poster_asset_id: null,
  preview_gif_asset_id: null,
  preview_video_asset_id: null,
  public_assets: [
    asset("poster", "poster.jpg"),
    asset("preview_video", "loop.mp4", "video/mp4"),
    asset("example_result", "out1.jpg"),
    asset("example_result", "out2.jpg"),
  ],
  created_at: null,
  likeness_level: null,
  ...overrides,
});

describe("toQuickSheetPreset", () => {
  it("maps fields and public asset URLs", () => {
    const item = toQuickSheetPreset(product());
    expect(item.slug).toBe("test-look");
    expect(item.creditCost).toBe(4);
    expect(item.available).toBe(true);
    expect(item.previewUrl).toContain("/poster.jpg");
    expect(item.previewVideoUrl).toContain("/loop.mp4");
    expect(item.exampleUrls).toHaveLength(2);
    expect(item.exampleUrls[0]).toContain("/out1.jpg");
  });

  it("prefers example_result assets for examples", () => {
    const item = toQuickSheetPreset(product());
    expect(item.exampleUrls.every((u) => u.includes("out"))).toBe(true);
  });

  it("falls back to non-poster images when no example_result exists", () => {
    const item = toQuickSheetPreset(
      product({
        public_assets: [
          asset("poster", "poster.jpg"),
          asset("hero", "hero.jpg"),
        ],
      })
    );
    expect(item.exampleUrls).toEqual([expect.stringContaining("/hero.jpg")]);
  });

  it("marks presets without a version as unavailable", () => {
    const item = toQuickSheetPreset(product({ version_id: null }));
    expect(item.available).toBe(false);
  });

  it("returns null media when no assets exist", () => {
    const item = toQuickSheetPreset(product({ public_assets: [] }));
    expect(item.previewUrl).toBeNull();
    expect(item.previewVideoUrl).toBeNull();
    expect(item.exampleUrls).toEqual([]);
  });
});
