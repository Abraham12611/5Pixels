import { describe, expect, it } from "vitest";
import {
  isImageMimeType,
  isMotionMimeType,
  isVideoMimeType,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import type { PublicProductAsset } from "@/types/catalog";

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
