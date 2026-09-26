import type { LibraryItem } from "@/components/consumer/library-grid";

export type LibrarySource = "all" | "saved" | "downloaded";
export type LibraryDateRange = "any" | "7" | "30" | "90";
export type LibrarySort = "newest" | "oldest" | "preset";

export interface LibraryFilterState {
  source: LibrarySource;
  query: string;
  dateRange: LibraryDateRange;
  preset: string | null;
  sort: LibrarySort;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilterState = {
  source: "all",
  query: "",
  dateRange: "any",
  preset: null,
  sort: "newest",
};

export const DATE_RANGE_LABELS: Record<LibraryDateRange, string> = {
  any: "Any time",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
};

export const SORT_LABELS: { value: LibrarySort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "preset", label: "By preset" },
];

export const SOURCE_LABELS: Record<LibrarySource, string> = {
  all: "All results",
  saved: "Saved",
  downloaded: "Downloaded",
};

export function countActiveLibraryFilters(f: LibraryFilterState): number {
  // Sort has its own trigger — Filters(n) counts only filter facets.
  return (
    (f.source !== "all" ? 1 : 0) +
    (f.query.trim() !== "" ? 1 : 0) +
    (f.dateRange !== "any" ? 1 : 0) +
    (f.preset !== null ? 1 : 0)
  );
}

function withinDays(iso: string, days: number): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

export function applyLibraryFilters(
  items: LibraryItem[],
  f: LibraryFilterState
): LibraryItem[] {
  const q = f.query.trim().toLowerCase();
  const out = items.filter((item) => {
    if (f.source === "saved" && !item.savedAt) return false;
    if (f.source === "downloaded" && !item.downloadedAt) return false;
    if (f.dateRange !== "any" && !withinDays(item.createdAt, Number(f.dateRange)))
      return false;
    if (f.preset && item.productName !== f.preset) return false;
    if (q && !item.productName.toLowerCase().includes(q)) return false;
    return true;
  });
  switch (f.sort) {
    case "oldest":
      return out.sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
      );
    case "preset":
      return out.sort((a, b) => a.productName.localeCompare(b.productName));
    default:
      return out.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
  }
}
