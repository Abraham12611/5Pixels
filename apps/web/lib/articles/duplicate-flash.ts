/**
 * One-shot sessionStorage hand-off for the duplicate→new-editor warning
 * (#126). The editor mounts fresh after navigation, so a media-copy warning
 * from `duplicateArticleAction` is stashed before the push and consumed —
 * once — by the new studio on mount. Client-safe.
 */

const DUPLICATE_FLASH_KEY = "article-studio-duplicate-flash";

export function stashDuplicateWarning(warning?: string): void {
  if (!warning || typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(DUPLICATE_FLASH_KEY, JSON.stringify({ warning }));
}

/** Reads and clears the carried-over warning. Returns undefined if none. */
export function consumeDuplicateWarning(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  const raw = sessionStorage.getItem(DUPLICATE_FLASH_KEY);
  if (raw === null) return undefined;
  sessionStorage.removeItem(DUPLICATE_FLASH_KEY);
  try {
    const parsed = JSON.parse(raw) as { warning?: unknown };
    return typeof parsed.warning === "string" ? parsed.warning : undefined;
  } catch {
    return undefined;
  }
}
