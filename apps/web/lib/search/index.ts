import type { ProductType } from "@/types/catalog";
import type { QuickSheetPreset } from "@/lib/catalog/quick-sheet";

export type PresetBadge = "trending" | "new";

export interface SearchPreset {
  slug: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  type: ProductType;
  creditCost: number;
  thumbUrl: string | null;
  badge: PresetBadge | null;
  /** Sheet-ready model — mobile taps open the quick sheet instead of navigating. */
  quickView?: QuickSheetPreset;
}

export interface SearchCategory {
  slug: string;
  name: string;
}

export interface SearchLibraryItem {
  id: string;
  productName: string;
  productSlug: string;
  status: string;
  createdAt: string;
  thumbUrl: string | null;
}

export type SearchScope = "all" | "presets" | "categories" | "library";

/**
 * Tokenized substring match: every whitespace-separated query token must
 * appear somewhere in the haystack. Case-insensitive.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

function presetHaystack(p: SearchPreset): string {
  return [
    p.name,
    p.description ?? "",
    p.categoryName ?? "",
    p.type === "filter" ? "filter look style" : "poster",
  ].join(" ");
}

export function filterPresets(
  presets: SearchPreset[],
  query: string
): SearchPreset[] {
  return presets.filter((p) => matchesQuery(presetHaystack(p), query));
}

export function filterCategories(
  categories: SearchCategory[],
  query: string
): SearchCategory[] {
  return categories.filter((c) => matchesQuery(c.name, query));
}

export function filterLibrary(
  items: SearchLibraryItem[],
  query: string
): SearchLibraryItem[] {
  return items.filter((i) => matchesQuery(i.productName, query));
}
