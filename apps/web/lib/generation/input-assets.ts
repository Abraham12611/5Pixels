import {
  SOURCE_ALLOWED_TYPES,
  SOURCE_MAX_BYTES as SOURCE_MAX_BYTES_LIMIT,
} from "./validation";

export const USER_ASSET_BUCKET = "user-assets";
export const MAX_SOURCE_BYTES = SOURCE_MAX_BYTES_LIMIT;
export const ALLOWED_SOURCE_MIME_TYPES = SOURCE_ALLOWED_TYPES;
/**
 * Decompression-bomb bound for user inputs (#179): matches the provider-side
 * pixel cap (PIL MAX_IMAGE_PIXELS ≈ 89MP, enforced by fal's image validator
 * upstream) so anything we transmit also fits the model's own guard. Stored
 * object dimensions can be missing — unknown dims are checked downstream
 * by the provider, not here.
 */
export const MAX_SOURCE_PIXELS = 89_478_485;

export interface UserInputAssetRow {
  assetId: string;
  bucket: string;
  storageKey: string;
  mediaType: string | null;
  mimeType: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  moderationStatus: string | null;
  moderationObjectVersion: string | null;
  deletedAt: string | null;
}

/**
 * Per-image gate run before quoting/transmission (#179): bucket, media
 * class, byte and pixel bounds, soft-delete, and moderation state. Returns
 * a user-safe rejection reason or null when usable. Moderation is
 * fail-closed in both directions — a rejected/flagged asset is blocked,
 * and a status outside the known set (compromised data) is blocked rather
 * than assumed safe. 'pending' passes here because the caller screens the
 * image itself and stamps the verdict before quoting; only 'approved'
 * assets may skip that review.
 */
export function inputAssetRejectionReason(
  row: UserInputAssetRow
): string | null {
  if (row.bucket !== USER_ASSET_BUCKET || row.deletedAt) {
    return "One of your images is no longer available.";
  }
  if (row.mediaType !== "image") {
    return "Inputs must be images.";
  }
  if (row.mimeType && !ALLOWED_SOURCE_MIME_TYPES.includes(row.mimeType)) {
    return "Inputs must be JPEG, PNG, or WebP images.";
  }
  if (row.bytes !== null && row.bytes > MAX_SOURCE_BYTES) {
    return "Each image must be 20 MB or smaller.";
  }
  if (
    row.width !== null &&
    row.height !== null &&
    row.width * row.height > MAX_SOURCE_PIXELS
  ) {
    return "One of your images is too large to process.";
  }
  if (
    row.moderationStatus !== "pending" &&
    row.moderationStatus !== "approved"
  ) {
    return "One of your images can't be used for generation.";
  }
  return null;
}
