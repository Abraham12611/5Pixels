import {
  isImageMimeType,
  isVideoMimeType,
  publicAssetUrl,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import type { PublicProductSummary } from "@/types/catalog";

/**
 * Normalized model for the preset quick sheet (25_MOBILE_WEB_POLISH/07 §2).
 * Every discovery surface — explore grid, landing feed, related rail,
 * favorites, search rows — maps its own data into this shape so one sheet
 * implementation serves them all.
 */
export interface QuickSheetPreset {
  id: string;
  slug: string;
  name: string;
  type: string;
  shortDescription: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  creditCost: number;
  /** Still image for the 4:5 media frame (hero → poster → first image). */
  previewUrl: string | null;
  /** Short looping mp4 when the preset has one; rendered as the poster's
   *  motion layer and disabled under prefers-reduced-motion. */
  previewVideoUrl: string | null;
  /** Up to three example outputs — tap targets for the nested ImageViewer. */
  exampleUrls: string[];
  /** False when the preset has no purchasable version — the sheet then shows
   *  the retired state with a "Find a similar look" escape. */
  available: boolean;
}

export function toQuickSheetPreset(p: PublicProductSummary): QuickSheetPreset {
  const assets = p.public_assets;

  const video =
    assets.find(
      (a) => a.role === "preview_video" && isVideoMimeType(a.mime_type)
    ) ??
    assets.find((a) => isVideoMimeType(a.mime_type)) ??
    null;

  const preferredStill = selectCatalogMediaAsset(assets, "hero");
  const still =
    preferredStill && isImageMimeType(preferredStill.mime_type)
      ? preferredStill
      : (assets.find(
          (a) => isImageMimeType(a.mime_type) && a.mime_type !== "image/gif"
        ) ??
        assets.find((a) => isImageMimeType(a.mime_type)) ??
        null);

  const resultAssets = assets.filter(
    (a) => a.role === "example_result" && isImageMimeType(a.mime_type)
  );
  // Older catalog rows may not tag example assets — fall back to the first
  // non-poster images like the landing feed does.
  const examplePool = (
    resultAssets.length > 0
      ? resultAssets
      : assets.filter(
          (a) => a.role !== "poster" && isImageMimeType(a.mime_type)
        )
  ).slice(0, 3);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    shortDescription: p.short_description,
    categoryName: p.category_name,
    categorySlug: p.category_slug,
    creditCost: p.credit_cost,
    previewUrl: still ? publicAssetUrl(still.bucket, still.storage_key) : null,
    previewVideoUrl: video
      ? publicAssetUrl(video.bucket, video.storage_key)
      : null,
    exampleUrls: examplePool.map((a) =>
      publicAssetUrl(a.bucket, a.storage_key)
    ),
    available: p.version_id != null,
  };
}
