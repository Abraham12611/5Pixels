/**
 * Pure helpers for reading a `?next=` return intent. Kept server-safe so both
 * pages and actions can share them. The create-flow intent is the one that
 * carries preset context worth surfacing in auth UI.
 */

/** Extracts the preset slug when `next` points at `/app/create/<slug>`. */
export function createIntentSlug(next: string | null | undefined): string | null {
  if (!next) return null;
  const match = /^\/app\/create\/([^/?#]+)/.exec(next);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Human-readable destination for an arbitrary relative `next` path. */
export function intentLabel(next: string | null | undefined): string | null {
  if (!next) return null;
  if (next.startsWith("/app/library")) return "your Library";
  if (next.startsWith("/app/favorites")) return "your Favorites";
  if (next.startsWith("/app/billing")) return "Billing";
  if (next.startsWith("/app/account")) return "Account";
  if (next.startsWith("/app/results") || next.startsWith("/app/generations"))
    return "your result";
  if (next.startsWith("/app")) return "5Pixels";
  return null;
}
