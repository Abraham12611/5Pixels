"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { openGlobalSearch } from "@/lib/ui/open-search";

/**
 * Landing search entry (05 §2.2) — keeps the pill visual, opens the search
 * palette via the header's `GlobalSearch` instead of navigating to /explore.
 */
export function SearchEntryButton() {
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      aria-label="Search looks"
      className="border-cream-100/10 bg-charcoal-850 text-text-muted focus-visible:ring-lime-500/70 flex w-full items-center gap-3 rounded-full border px-4 py-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <MagnifyingGlass size={18} />
      Search looks
    </button>
  );
}
