import { z } from "zod";
import { supabaseUrl } from "@/lib/supabase/env";

/**
 * Shared constants + pure helpers for the article media pipeline (#129).
 *
 * Pipeline: private staging bucket (`article-media`) -> explicit promotion to
 * the public bucket (`article-media-public`) at publish -> revoked back to
 * private on unpublish/archive. Blocks never persist raw storage URLs — they
 * persist `asset://{assetId}` references or allowlisted external URLs.
 */

export const ARTICLE_MEDIA_BUCKET = "article-media";
export const ARTICLE_MEDIA_PUBLIC_BUCKET = "article-media-public";

export const ARTICLE_IMAGE_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
export const ARTICLE_VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB
export const ARTICLE_MEDIA_MAX_DIMENSION = 12000;
export const ARTICLE_MEDIA_MIN_DIMENSION = 8;
export const ARTICLE_MEDIA_QUOTA_BYTES = 512 * 1024 * 1024; // per-article
export const ARTICLE_MEDIA_QUOTA_COUNT = 100; // per-article

export type ArticleMediaKind = "upload" | "generation_derivative";
export type ArticleMediaState = "pending" | "ready" | "published";

export const ARTICLE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const ARTICLE_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;
export const ARTICLE_MEDIA_MIME_TYPES = [
  ...ARTICLE_IMAGE_MIME_TYPES,
  ...ARTICLE_VIDEO_MIME_TYPES,
] as const;
export type ArticleMediaMimeType = (typeof ARTICLE_MEDIA_MIME_TYPES)[number];

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isArticleImageMime(mimeType: string): boolean {
  return (ARTICLE_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isArticleVideoMime(mimeType: string): boolean {
  return (ARTICLE_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function articleMediaExtension(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType] ?? null;
}

export function mediaTypeForMime(mimeType: string): "image" | "video" {
  return isArticleVideoMime(mimeType) ? "video" : "image";
}

export function maxBytesForMime(mimeType: string): number {
  return isArticleVideoMime(mimeType)
    ? ARTICLE_VIDEO_MAX_BYTES
    : ARTICLE_IMAGE_MAX_BYTES;
}

/**
 * Client/app-level bound check — the DB RPCs re-enforce the same numbers.
 * Throws on violation; returns the media kind on success.
 */
export function validateArticleMediaFile(
  mimeType: string,
  bytes: number
): "image" | "video" {
  if (!articleMediaExtension(mimeType)) {
    throw new Error("Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4 or WebM.");
  }
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new Error("File appears to be empty");
  }
  const limit = maxBytesForMime(mimeType);
  if (bytes > limit) {
    const mb = Math.round(limit / 1024 / 1024);
    throw new Error(`File exceeds the ${mb} MB limit`);
  }
  return mediaTypeForMime(mimeType);
}

/* --------------------------------------------------------------------------
 * Storage paths — collision-resistant, owner/article/asset-scoped.
 *   staging:   staff/{uploaderId}/articles/{articleId}/{assetId}.{ext}
 *   published: articles/{articleId}/{assetId}.{ext}   (immutable per asset)
 * ------------------------------------------------------------------------ */

export function buildArticleStagingPath(
  uploaderId: string,
  articleId: string,
  assetId: string,
  mimeType: string
): string {
  const ext = articleMediaExtension(mimeType);
  if (
    !ext ||
    !UUID_RE.test(uploaderId) ||
    !UUID_RE.test(articleId) ||
    !UUID_RE.test(assetId)
  ) {
    throw new Error("Invalid article media path inputs");
  }
  return `staff/${uploaderId}/articles/${articleId}/${assetId}.${ext}`;
}

export function buildArticlePublishedPath(
  articleId: string,
  assetId: string,
  extension: string
): string {
  if (!UUID_RE.test(articleId) || !UUID_RE.test(assetId)) {
    throw new Error("Invalid article media path inputs");
  }
  const ext = extension.toLowerCase();
  if (!Object.values(MIME_TO_EXT).includes(ext)) {
    throw new Error("Invalid extension");
  }
  return `articles/${articleId}/${assetId}.${ext}`;
}

const STAGING_PATH_RE =
  /^staff\/([0-9a-f-]{36})\/articles\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.[a-z0-9]+$/i;

/** Parse + verify a staging path belongs to (uploader, article); returns ids. */
export function parseArticleStagingPath(path: string): {
  uploaderId: string;
  articleId: string;
  assetId: string;
} | null {
  if (path.includes("..") || path.includes("\\")) return null;
  const m = STAGING_PATH_RE.exec(path);
  if (!m) return null;
  return { uploaderId: m[1], articleId: m[2], assetId: m[3] };
}

/* --------------------------------------------------------------------------
 * asset:// URIs — the only internal media reference persisted in documents.
 * ------------------------------------------------------------------------ */

export const ASSET_URI_SCHEME = "asset://";

export function assetUri(assetId: string): string {
  if (!UUID_RE.test(assetId)) throw new Error("Invalid asset id");
  return `${ASSET_URI_SCHEME}${assetId.toLowerCase()}`;
}

export function parseAssetUri(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith(ASSET_URI_SCHEME)) {
    return null;
  }
  const id = value.slice(ASSET_URI_SCHEME.length);
  return UUID_RE.test(id) ? id : null;
}

/* --------------------------------------------------------------------------
 * Editor-facing preview URL — the staff-gated proxy route. Anything the
 * editor displays for a private staging object flows through here so no
 * signed URL or private bucket path is ever persisted or rendered to the
 * outside world.
 * ------------------------------------------------------------------------ */

export const ARTICLE_MEDIA_PROXY_BASE = "/api/articles/media/";

export function articleMediaProxyUrl(
  assetId: string,
  options?: { width?: number }
): string {
  if (!UUID_RE.test(assetId)) throw new Error("Invalid asset id");
  const base = `${ARTICLE_MEDIA_PROXY_BASE}${assetId}`;
  return options?.width ? `${base}?w=${options.width}` : base;
}

export const ARTICLE_MEDIA_THUMB_WIDTHS = [160, 400, 800, 1200, 1600] as const;

/* --------------------------------------------------------------------------
 * Recognising our own URLs inside draft documents so they can be normalised
 * back to asset:// references before persistence.
 * ------------------------------------------------------------------------ */

const PROXY_URL_RE = /^\/api\/articles\/media\/([0-9a-f-]{36})(?:\?.*)?$/i;

/**
 * Map any URL the editor may legitimately carry back to an article asset id:
 *   asset://{id}
 *   /api/articles/media/{id}[?…]
 *   {supabase}/storage/v1/object/{public|sign}/{article buckets}/…{assetId}.{ext}
 * Returns null for anything else (external URLs handled separately).
 */
export function extractAssetIdFromMediaUrl(url: string): string | null {
  const fromUri = parseAssetUri(url);
  if (fromUri) return fromUri;

  const proxy = PROXY_URL_RE.exec(url);
  if (proxy) return proxy[1];

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const supa = supabaseUrl();
  if (!supa || parsed.origin !== new URL(supa).origin) return null;

  const m = /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([\w-]+)\/(.+)$/.exec(
    parsed.pathname
  );
  if (!m) return null;
  const [, bucket, objectPath] = m;
  if (bucket === ARTICLE_MEDIA_BUCKET) {
    const parts = parseArticleStagingPath(objectPath);
    return parts?.assetId ?? null;
  }
  if (bucket === ARTICLE_MEDIA_PUBLIC_BUCKET) {
    const pm = /^articles\/[0-9a-f-]{36}\/([0-9a-f-]{36})\.[a-z0-9]+$/i.exec(
      objectPath
    );
    return pm?.[1] ?? null;
  }
  return null;
}

/* --------------------------------------------------------------------------
 * External URLs — only allowlisted https hosts may be embedded. Everything
 * else becomes a plain link at render time. Keep this list short; each host
 * must be a stable, HTTPS-only media CDN. Empty by default.
 * ------------------------------------------------------------------------ */

export const ARTICLE_EXTERNAL_MEDIA_HOSTS: readonly string[] = (
  process.env.NEXT_PUBLIC_ARTICLE_MEDIA_HOSTS ?? ""
)
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedExternalMediaUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return ARTICLE_EXTERNAL_MEDIA_HOSTS.includes(parsed.hostname.toLowerCase());
}

/* --------------------------------------------------------------------------
 * Content sniffing — real bytes over declared metadata.
 * ------------------------------------------------------------------------ */

/**
 * Detect the real MIME type of an upload from its magic bytes.
 * Returns one of ARTICLE_MEDIA_MIME_TYPES or null for anything else —
 * SVG/HTML/scripts are deliberately not sniffeable into an allowed type.
 */
export function sniffArticleMediaMime(head: Uint8Array): string | null {
  if (head.length < 12) return null;
  const b = head;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: "GIF87a" | "GIF89a"
  if (
    b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 &&
    b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61
  ) {
    return "image/gif";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  // MP4/MOV: bytes 4..8 == "ftyp"
  if (
    b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70
  ) {
    return "video/mp4";
  }
  // WebM/MKV: EBML header 1A 45 DF A3
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

/* --------------------------------------------------------------------------
 * Zod + row types shared across actions/queries/UI.
 * ------------------------------------------------------------------------ */

export const articleMediaMetadataSchema = z.object({
  altText: z.string().max(300).optional(),
  caption: z.string().max(1000).optional(),
});
export type ArticleMediaMetadataInput = z.infer<
  typeof articleMediaMetadataSchema
>;

/** Joined article_assets + assets row shape used by staff reads. */
export interface ArticleMediaItem {
  /** article_assets.id — the library row. */
  id: string;
  articleId: string;
  /** assets.id — the block reference (asset://{assetId}). */
  assetId: string;
  kind: ArticleMediaKind;
  state: ArticleMediaState;
  mediaType: "image" | "video";
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  altText: string;
  caption: string;
  sourceGenerationId: string | null;
  createdAt: string;
  publishedAt: string | null;
}
