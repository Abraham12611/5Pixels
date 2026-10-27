import { supabaseUrl } from "@/lib/supabase/env";
import type {
  OutputSizeOption,
  PublicProductAsset,
  PublicProductSummary,
} from "@/types/catalog";

export type MediaKind = "card" | "hero";

/** Public catalog assets live in public buckets — build the object URL directly. */
export function publicAssetUrl(bucket: string, storageKey: string): string {
  if (storageKey.startsWith("/") || storageKey.startsWith("https://")) {
    return storageKey;
  }
  return `${supabaseUrl()}/storage/v1/object/public/${bucket}/${storageKey}`;
}

function validDims(
  width: number | null | undefined,
  height: number | null | undefined
): string | null {
  if (
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    width <= 20000 &&
    height <= 20000
  ) {
    return `${width} / ${height}`;
  }
  return null;
}

function parseAspectString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const colon = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(trimmed);
  if (colon) {
    const w = Number(colon[1]);
    const h = Number(colon[2]);
    if (w > 0 && h > 0) return `${w} / ${h}`;
  }
  if (trimmed === "portrait") return "9 / 16";
  if (trimmed === "landscape") return "16 / 9";
  if (trimmed === "square") return "1 / 1";
  return null;
}

/**
 * Resolve the natural CSS `aspect-ratio` string (`"W / H"`) for a preset card
 * from its primary hero/poster asset, any sibling public asset with dimensions,
 * poster_config/metadata hints, or its default output_sizes entry.
 */
export function resolveProductAspectRatio(
  product: Pick<
    PublicProductSummary,
    "public_assets" | "metadata" | "output_sizes" | "type"
  >,
  primaryAsset?: PublicProductAsset | null
): string {
  const fromPrimary = validDims(primaryAsset?.width, primaryAsset?.height);
  if (fromPrimary) return fromPrimary;

  for (const role of ["poster", "hero", "preview_video", "preview_gif", "example_result"]) {
    const asset = product.public_assets?.find((a) => a.role === role);
    const ratio = validDims(asset?.width, asset?.height);
    if (ratio) return ratio;
  }

  for (const asset of product.public_assets ?? []) {
    const ratio = validDims(asset.width, asset.height);
    if (ratio) return ratio;
  }

  const meta = (product.metadata ?? {}) as Record<string, unknown>;
  const posterConfig = (meta.poster_config ?? {}) as Record<string, unknown>;
  const fromMeta =
    parseAspectString(posterConfig.aspect_ratio) ??
    parseAspectString(meta.aspect_ratio) ??
    parseAspectString(posterConfig.layout_template);
  if (fromMeta) return fromMeta;

  const sizes: OutputSizeOption[] = Array.isArray(product.output_sizes)
    ? product.output_sizes
    : [];
  const defaultSize = sizes.find((s) => s.is_default) ?? sizes[0];
  const fromSize = validDims(defaultSize?.width, defaultSize?.height);
  if (fromSize) return fromSize;

  return product.type === "poster" ? "9 / 16" : "3 / 4";
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
