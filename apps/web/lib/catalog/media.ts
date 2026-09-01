import type { PublicProductAsset } from "@/types/catalog";

export type MediaKind = "card" | "hero";

const CARD_ROLE_ORDER: string[] = [
  "preview_video",
  "preview_gif",
  "poster",
  "hero",
];

const HERO_ROLE_ORDER: string[] = [
  "hero",
  "poster",
  "preview_video",
  "preview_gif",
];

/**
 * Choose the best public asset for a given surface.
 *
 * Cards prefer motion previews (video/GIF) to create a tactile browsing
 * experience. The hero/detail surface prefers a static hero/poster first.
 */
export function selectCatalogMediaAsset(
  publicAssets: PublicProductAsset[],
  kind: MediaKind
): PublicProductAsset | null {
  const order = kind === "card" ? CARD_ROLE_ORDER : HERO_ROLE_ORDER;

  for (const role of order) {
    const match = publicAssets.find((asset) => asset.role === role);
    if (match) {
      return match;
    }
  }

  // If nothing matches the preferred roles, fall back to the first public
  // image asset, but never an internal/unrecognized asset.
  return publicAssets.find((asset) => isImageMimeType(asset.mime_type)) ?? null;
}

export function isImageMimeType(mimeType: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

export function isVideoMimeType(mimeType: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("video/");
}

export function isMotionMimeType(mimeType: string): boolean {
  return isVideoMimeType(mimeType) || mimeType === "image/gif";
}
