import { describe, expect, it } from "vitest";
import {
  isImageMimeType,
  isMotionMimeType,
  isVideoMimeType,
  resolveProductAspectRatio,
  selectCatalogMediaAsset,
  reconcilePrimaryCatalogMedia,
} from "@/lib/catalog/media";
import type { PublicProductAsset, PublicProductSummary } from "@/types/catalog";

function asset(role: string, mimeType: string): PublicProductAsset {
  return {
    role,
    asset_id: `asset-${role}`,
    sort_order: 0,
    rights_metadata: null,
    bucket: "preset-media",
    storage_key: `${role}.mp4`,
    mime_type: mimeType,
    width: 100,
    height: 100,
  };
}

describe("selectCatalogMediaAsset", () => {
  it("prefers video preview for cards", () => {
    const assets = [
      asset("hero", "image/png"),
      asset("preview_video", "video/mp4"),
    ];
    expect(selectCatalogMediaAsset(assets, "card")?.role).toBe("preview_video");
  });

  it("falls back to poster for cards when no motion preview exists", () => {
    const assets = [asset("hero", "image/png"), asset("poster", "image/png")];
    expect(selectCatalogMediaAsset(assets, "card")?.role).toBe("poster");
  });

  it("prefers hero for hero/detail surfaces", () => {
    const assets = [
      asset("poster", "image/png"),
      asset("hero", "image/png"),
      asset("preview_video", "video/mp4"),
    ];
    expect(selectCatalogMediaAsset(assets, "hero")?.role).toBe("hero");
  });

  it("returns null when no public assets are available", () => {
    expect(selectCatalogMediaAsset([], "card")).toBeNull();
  });

  it("falls back to the first image asset if roles do not match", () => {
    const assets = [asset("style_reference", "image/png")];
    expect(selectCatalogMediaAsset(assets, "card")?.role).toBe(
      "style_reference"
    );
  });
});

describe("mime type helpers", () => {
  it("identifies image mime types", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/gif")).toBe(true);
    expect(isImageMimeType("video/mp4")).toBe(false);
    expect(isImageMimeType("")).toBe(false);
  });

  it("identifies video mime types", () => {
    expect(isVideoMimeType("video/mp4")).toBe(true);
    expect(isVideoMimeType("image/gif")).toBe(false);
    expect(isVideoMimeType("image/webm")).toBe(false);
  });

  it("treats gifs as motion", () => {
    expect(isMotionMimeType("image/gif")).toBe(true);
    expect(isMotionMimeType("video/webm")).toBe(true);
    expect(isMotionMimeType("image/png")).toBe(false);
  });
});

describe("resolveProductAspectRatio", () => {
  const base = {
    type: "filter" as const,
    output_sizes: [],
    metadata: null,
  };

  function dimsAsset(
    role: string,
    width: number | null,
    height: number | null
  ): PublicProductAsset {
    const a = asset(role, "image/jpeg");
    a.width = width;
    a.height = height;
    return a;
  }

  it("uses the primary asset's stored dimensions", () => {
    const product = {
      ...base,
      public_assets: [dimsAsset("poster", 768, 1376)],
    } as Pick<PublicProductSummary, "public_assets" | "metadata" | "output_sizes" | "type">;
    expect(resolveProductAspectRatio(product, product.public_assets[0])).toBe(
      "768 / 1376"
    );
  });

  it("rejects corrupt dimensions and falls back to a valid sibling asset", () => {
    const product = {
      ...base,
      public_assets: [
        dimsAsset("poster", 101123846, 134877194),
        dimsAsset("hero", 896, 1200),
      ],
    } as Pick<PublicProductSummary, "public_assets" | "metadata" | "output_sizes" | "type">;
    expect(
      resolveProductAspectRatio(product, product.public_assets[0])
    ).toBe("896 / 1200");
  });

  it("reads poster_config aspect_ratio when no asset dims exist", () => {
    const product = {
      ...base,
      type: "poster" as const,
      public_assets: [dimsAsset("poster", null, null)],
      metadata: { poster_config: { aspect_ratio: "9:16" } },
    } as Pick<PublicProductSummary, "public_assets" | "metadata" | "output_sizes" | "type">;
    expect(resolveProductAspectRatio(product, null)).toBe("9 / 16");
  });

  it("reads the default output size when metadata is empty", () => {
    const product = {
      ...base,
      public_assets: [],
      output_sizes: [
        { id: "s1", label: "Portrait", width: 1080, height: 1350, is_default: true },
      ],
    } as unknown as Pick<PublicProductSummary, "public_assets" | "metadata" | "output_sizes" | "type">;
    expect(resolveProductAspectRatio(product, null)).toBe("1080 / 1350");
  });

  it("defaults posters to 9/16 and filters to 3/4 when nothing resolves", () => {
    expect(
      resolveProductAspectRatio(
        { ...base, type: "poster", public_assets: [] },
        null
      )
    ).toBe("9 / 16");
    expect(
      resolveProductAspectRatio({ ...base, public_assets: [] }, null)
    ).toBe("3 / 4");
  });
});

describe("reconcilePrimaryCatalogMedia (#244)", () => {
  it("replaces an inherited hero role with the variant's current hero and adds its poster", () => {
    const oldParentHero = asset("hero", "image/png");
    const childHero = {
      id: "child-hero",
      bucket: "preset-media",
      storage_key: "child-hero.png",
      mime_type: "image/png",
      width: 640,
      height: 640,
    };
    const childPoster = {
      ...childHero,
      id: "child-poster",
      storage_key: "child-poster.png",
    };
    const result = reconcilePrimaryCatalogMedia(
      [oldParentHero, asset("example_result", "image/png")],
      { hero_asset_id: childHero.id, poster_asset_id: childPoster.id },
      [childHero, childPoster]
    );
    expect(result.find((a) => a.role === "hero")?.asset_id).toBe("child-hero");
    expect(result.find((a) => a.role === "poster")?.asset_id).toBe("child-poster");
    expect(result.some((a) => a.asset_id === oldParentHero.asset_id)).toBe(false);
    expect(result.some((a) => a.role === "example_result")).toBe(true);
    expect(selectCatalogMediaAsset(result, "hero")?.asset_id).toBe("child-hero");
    expect(selectCatalogMediaAsset(result, "card")?.asset_id).toBe("child-poster");
  });

  it("does not expose private or non-image primary rows", () => {
    const result = reconcilePrimaryCatalogMedia(
      [asset("hero", "image/png")],
      { hero_asset_id: "private-hero", poster_asset_id: null },
      [{
        id: "private-hero",
        bucket: "user-assets",
        storage_key: "private.png",
        mime_type: "image/png",
        width: null,
        height: null,
      }]
    );
    expect(result).toEqual([]);
  });

  it("preserves original media for legacy products with no primary pointers", () => {
    const media = [asset("hero", "image/png")];
    expect(reconcilePrimaryCatalogMedia(
      media,
      { hero_asset_id: null, poster_asset_id: null },
      []
    )).toEqual(media);
  });
});
