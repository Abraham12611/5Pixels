import { describe, expect, it, vi } from "vitest";
import { pickFamilyStillUrl } from "@/lib/catalog/family";
import type { PublicProductDetail, PublicProductAsset } from "@/types/catalog";

vi.mock("@/lib/supabase/env", () => ({
  supabaseUrl: () => "https://supabase.example.test",
}));

const publicAsset = (role: string, id: string, key: string): PublicProductAsset => ({
  role,
  asset_id: id,
  sort_order: 0,
  rights_metadata: null,
  bucket: "preset-media",
  storage_key: key,
  mime_type: "image/png",
  width: 500,
  height: 500,
});

function detail(
  heroAssetId: string | null,
  posterAssetId: string | null,
  assets: PublicProductAsset[]
): Pick<PublicProductDetail, "poster_asset_id" | "hero_asset_id" | "public_assets"> {
  return {
    hero_asset_id: heroAssetId,
    poster_asset_id: posterAssetId,
    public_assets: assets,
  };
}

describe("family rail member thumbnails (#242)", () => {
  const oldParentHero = publicAsset("hero", "parent-hero", "original.png");

  it("prefers a child variant's own poster even when the public RPC still returns the parent's old hero link", () => {
    const phantom = detail("child-hero", "child-poster", [oldParentHero]);
    const ownPublicAssets = new Map([
      ["child-hero", {
        id: "child-hero", bucket: "preset-media",
        storage_key: "phantom-hero.png", mime_type: "image/png",
      }],
      ["child-poster", {
        id: "child-poster", bucket: "preset-media",
        storage_key: "phantom-poster.png", mime_type: "image/png",
      }],
    ]);

    expect(pickFamilyStillUrl(phantom, ownPublicAssets)).toBe(
      "https://supabase.example.test/storage/v1/object/public/preset-media/phantom-poster.png"
    );
    expect(pickFamilyStillUrl(detail("parent-hero", null, [oldParentHero]), ownPublicAssets))
      .toContain("original.png");
  });

  it("uses the variant's own hero when no poster is available", () => {
    const own = new Map([
      ["child-hero", {
        id: "child-hero", bucket: "preset-media",
        storage_key: "phantom-hero.png", mime_type: "image/png",
      }],
    ]);
    expect(pickFamilyStillUrl(detail("child-hero", null, [oldParentHero]), own))
      .toContain("phantom-hero.png");
  });

  it("does not leak inherited or private imagery when the variant's primary assets cannot be resolved", () => {
    const own = new Map([
      ["child-poster", {
        id: "child-poster", bucket: "private-user-assets",
        storage_key: "never-show.png", mime_type: "image/png",
      }],
    ]);
    expect(pickFamilyStillUrl(detail("child-hero", "child-poster", [oldParentHero]), own))
      .toBeNull();
  });

  it("uses a matching public RPC asset as a fallback when the metadata fetch is unavailable", () => {
    const ownHero = publicAsset("hero", "child-hero", "child.png");
    expect(pickFamilyStillUrl(detail("child-hero", null, [oldParentHero, ownHero]), new Map()))
      .toContain("child.png");
  });

  it("preserves legacy linked hero images when there is no primary pointer", () => {
    expect(pickFamilyStillUrl(detail(null, null, [oldParentHero]), new Map()))
      .toContain("original.png");
  });
});
