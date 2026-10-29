import { supabaseUrl } from "@/lib/supabase/env";
import type { PublicProductAsset } from "@/types/catalog";

export type MediaKind = "card" | "hero";

/** Public catalog assets live in public buckets — build the object URL directly. */
export function publicAssetUrl(bucket: string, storageKey: string): string {
  // A leading slash in storage_key produces a // path segment Storage 400s
  // on — normalize rather than emit a broken card URL.
  return `${supabaseUrl()}/storage/v1/object/public/${bucket}/${storageKey.replace(/^\/+/, "")}`;
}

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


export interface PublicPrimaryMediaRow {
  id: string;
  bucket: string;
  storage_key: string;
  mime_type: string;
  width: number | null;
  height: number | null;
}

/**
 * Use the product's current hero/poster pointers rather than stale
 * product_assets role links that variants can inherit from their parent.
 * Preserve other existing public media in the RPC response.
 */
export function reconcilePrimaryCatalogMedia(
  original: PublicProductAsset[],
  pointers: { hero_asset_id: string | null; poster_asset_id: string | null },
  primaryRows: PublicPrimaryMediaRow[]
): PublicProductAsset[] {
  const byId = new Map(primaryRows.map((asset) => [asset.id, asset]));
  const current = [
    { role: "poster", id: pointers.poster_asset_id },
    { role: "hero", id: pointers.hero_asset_id },
  ];
  const selected = original.filter((a) => {
    if (a.role === "hero" && pointers.hero_asset_id)
      return a.asset_id === pointers.hero_asset_id;
    if (a.role === "poster" && pointers.poster_asset_id)
      return a.asset_id === pointers.poster_asset_id;
    return true;
  });
  for (const { role, id } of current) {
    if (!id || selected.some((a) => a.role === role && a.asset_id === id)) continue;
    const a = byId.get(id);
    if (!a || a.bucket !== "preset-media" || !isImageMimeType(a.mime_type)) continue;
    selected.push({
      role, asset_id: id, sort_order: 0, rights_metadata: null,
      bucket: a.bucket, storage_key: a.storage_key, mime_type: a.mime_type,
      width: a.width, height: a.height,
    });
  }
  return selected;
}
