import { describe, expect, it } from "vitest";
import {
  collectDocumentPresetIds,
  isPinnedVersionStale,
  presetCardDataFromProduct,
} from "../preset-card";
import type { PublicProductSummary } from "@/types/catalog";

/**
 * #127 — the pure card-data contract shared by the editor, staff preview
 * and public reader. The mapper is the privacy boundary: it only consumes
 * PublicProductSummary rows (public catalog RPC output), so the tests pin
 * exactly which fields can ever surface on an article page.
 */

const PID = "11111111-2222-3333-4444-555555555555";
const VID = "66666666-7777-4888-8999-000000000000";

function product(
  overrides: Partial<PublicProductSummary> = {}
): PublicProductSummary {
  return {
    id: PID,
    slug: "film-grain-portrait",
    name: "Film Grain Portrait",
    type: "filter",
    short_description: "Analog grain, soft skin tones",
    long_description: null,
    category_id: "cat-1",
    category_slug: "portrait",
    category_name: "Portrait",
    featured_rank: 1,
    version_id: VID,
    version_number: 3,
    credit_cost: 4,
    output_sizes: [],
    metadata: null,
    hero_asset_id: null,
    poster_asset_id: null,
    preview_gif_asset_id: null,
    preview_video_asset_id: null,
    public_assets: [],
    created_at: null,
    likeness_level: null,
    ...overrides,
  };
}

describe("presetCardDataFromProduct", () => {
  it("maps only public fields and builds the canonical deep link", () => {
    const card = presetCardDataFromProduct(product());
    expect(card).toMatchObject({
      productId: PID,
      slug: "film-grain-portrait",
      name: "Film Grain Portrait",
      type: "filter",
      shortDescription: "Analog grain, soft skin tones",
      categoryName: "Portrait",
      creditCost: 4,
      activeVersionId: VID,
      versionNumber: 3,
      href: "/presets/film-grain-portrait",
    });
    // The type has no private fields by construction — assert the shape
    // anyway so a future PublicProductSummary field can't leak silently.
    expect(Object.keys(card).sort()).toEqual([
      "activeVersionId",
      "categoryName",
      "creditCost",
      "href",
      "imageUrl",
      "name",
      "productId",
      "shortDescription",
      "slug",
      "type",
      "versionNumber",
      "videoUrl",
    ]);
  });

  it("routes mp4 preview assets to videoUrl and images to imageUrl", () => {
    const video = presetCardDataFromProduct(
      product({
        public_assets: [
          {
            role: "preview_video",
            asset_id: "a1",
            sort_order: 0,
            rights_metadata: null,
            bucket: "catalog-media",
            storage_key: "p/film.mp4",
            mime_type: "video/mp4",
            width: 640,
            height: 800,
          },
          {
            role: "poster",
            asset_id: "a2",
            sort_order: 1,
            rights_metadata: null,
            bucket: "catalog-media",
            storage_key: "p/film.png",
            mime_type: "image/png",
            width: 640,
            height: 800,
          },
        ],
      })
    );
    expect(video.videoUrl).toContain("/p/film.mp4");
    expect(video.imageUrl).toBeNull();

    const image = presetCardDataFromProduct(
      product({
        public_assets: [
          {
            role: "poster",
            asset_id: "a2",
            sort_order: 1,
            rights_metadata: null,
            bucket: "catalog-media",
            storage_key: "p/film.png",
            mime_type: "image/png",
            width: 640,
            height: 800,
          },
        ],
      })
    );
    expect(image.imageUrl).toContain("/p/film.png");
    expect(image.videoUrl).toBeNull();
  });

  it("keeps gif previews on imageUrl — gif is motion but not a video", () => {
    const card = presetCardDataFromProduct(
      product({
        public_assets: [
          {
            role: "preview_gif",
            asset_id: "a3",
            sort_order: 0,
            rights_metadata: null,
            bucket: "catalog-media",
            storage_key: "p/film.gif",
            mime_type: "image/gif",
            width: 640,
            height: 800,
          },
        ],
      })
    );
    expect(card.imageUrl).toContain("/p/film.gif");
    expect(card.videoUrl).toBeNull();
  });

  it("renders media-less presets with a graceful fallback (no URL)", () => {
    const card = presetCardDataFromProduct(product({ public_assets: [] }));
    expect(card.imageUrl).toBeNull();
    expect(card.videoUrl).toBeNull();
  });
});

describe("isPinnedVersionStale", () => {
  const card = presetCardDataFromProduct(product());

  it("is fresh when unpinned or pinned to the active version", () => {
    expect(isPinnedVersionStale(card, "")).toBe(false);
    expect(isPinnedVersionStale(card, VID)).toBe(false);
  });

  it("is stale when the pin no longer matches the public version", () => {
    expect(
      isPinnedVersionStale(card, "99999999-9999-4999-8999-999999999999")
    ).toBe(true);
  });
});

describe("collectDocumentPresetIds", () => {
  it("collects presetIds from nested preset blocks only", () => {
    const ids = collectDocumentPresetIds([
      { type: "paragraph", props: {} },
      {
        type: "preset",
        props: { presetId: PID },
        children: [
          { type: "preset", props: { presetId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" } },
        ],
      },
      { type: "preset", props: { presetId: "" } },
      { type: "preset", props: { presetId: PID } },
      // forged shapes must not throw or leak
      { type: "preset" },
      { type: "preset", props: { presetId: 42 } },
      null as never,
    ]);
    expect(ids).toEqual([PID, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"]);
  });
});
