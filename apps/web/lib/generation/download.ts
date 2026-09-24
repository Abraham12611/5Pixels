/**
 * Download helpers for the result surface (25_MOBILE_WEB_POLISH/10 §5).
 * `<a download>` against a signed URL behaves differently across mobile
 * browsers — these helpers centralise the iOS detection, reachability probe
 * and filename conventions so the actions stay honest about what happened.
 */

const IOS_UA_RE = /iP(hone|ad|od)/;
const NON_SAFARI_IOS_RE = /CriOS|FxiOS|EdgiOS|OPiOS|Mercury/i;

/** iOS/iPadOS Safari — where `<a download>` opens the file in a new tab. */
export function isIosSafari(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
  platform = typeof navigator !== "undefined" ? navigator.platform : "",
  maxTouchPoints =
    typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0
): boolean {
  const ios =
    IOS_UA_RE.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
  if (!ios) return false;
  return /Safari/i.test(ua) && !NON_SAFARI_IOS_RE.test(ua);
}

/** File extension for a saved output, defaulting to jpg. */
export function extForMime(mime: string | null | undefined): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Human filename for a saved output, e.g. `5pixels-cyber-punk-a1b2c3d4.jpg`. */
export function resultFilename(
  productSlug: string,
  generationId: string,
  mimeType?: string | null,
  index?: number
): string {
  const suffix = index != null ? `-${index + 1}` : "";
  return `5pixels-${productSlug}-${generationId.slice(0, 8)}${suffix}.${extForMime(mimeType)}`;
}

/** Triggers a browser download for a signed URL. */
export function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export type UrlCheck = "ok" | "expired" | "unknown";

/**
 * Cheap reachability probe for signed URLs — a HEAD request is enough for
 * Storage. A network or CORS failure means "can't verify", and the download
 * is still attempted rather than blocked on a false negative.
 */
export async function checkDownloadUrl(url: string): Promise<UrlCheck> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok ? "ok" : "expired";
  } catch {
    return "unknown";
  }
}
