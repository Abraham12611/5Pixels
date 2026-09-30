export interface RecentPreset {
  slug: string;
  name: string;
  thumbUrl: string | null;
}

export const RECENT_PRESETS_KEY = "5px:recent-presets";
const MAX_RECENTS = 6;

/**
 * Read recently opened presets from localStorage. Client-side only — returns
 * an empty list when storage is unavailable or contents are malformed.
 */
export function getRecentPresets(): RecentPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentPreset =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentPreset).slug === "string" &&
          typeof (item as RecentPreset).name === "string"
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/**
 * Record a preset view. Dedupes by slug, most-recent first, capped at
 * MAX_RECENTS entries.
 */
export function recordRecentPreset(entry: RecentPreset): RecentPreset[] {
  if (typeof window === "undefined") return [];
  const next = [
    entry,
    ...getRecentPresets().filter((r) => r.slug !== entry.slug),
  ].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(RECENT_PRESETS_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — recents are a convenience, not critical.
  }
  return next;
}

/** Remove all recorded recents (the palette's idle-state "Clear" action). */
export function clearRecentPresets(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_PRESETS_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
