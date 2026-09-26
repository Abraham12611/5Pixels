"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  SearchPalette,
  type SearchPaletteProps,
} from "@/components/consumer/search-palette";
import { OPEN_SEARCH_EVENT } from "@/lib/ui/open-search";
import { cn } from "@/lib/utils";

type GlobalSearchProps = Omit<SearchPaletteProps, "open" | "onOpenChange"> & {
  /** Icon-only trigger (used by the marketing header on mobile). */
  iconOnly?: boolean;
};

/**
 * Global search trigger + cmdk palette. Opens on click, Cmd/Ctrl+K, or the
 * `OPEN_SEARCH_EVENT` dispatched by non-colocated triggers (landing pill,
 * explore sticky bar). Escape/outside-click close it.
 */
export function GlobalSearch(props: GlobalSearchProps) {
  const { iconOnly, ...paletteProps } = props;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        className={cn(
          "text-text-secondary hover:text-cream-100 focus-visible:ring-lime-500/50 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2",
          iconOnly
            ? "flex h-11 w-11 items-center justify-center rounded-lg"
            : "border-cream-100/10 bg-charcoal-850 hover:border-cream-100/20 rounded-md border px-2.5 py-1.5 text-sm"
        )}
      >
        <MagnifyingGlass size={iconOnly ? 20 : 16} weight="bold" />
        {!iconOnly && (
          <>
            <span className="hidden md:inline">Search</span>
            <kbd className="border-cream-100/15 text-text-muted hidden rounded border px-1.5 py-0.5 font-mono text-[10px] lg:inline">
              ⌘K
            </kbd>
          </>
        )}
      </button>
      <SearchPalette open={open} onOpenChange={setOpen} {...paletteProps} />
    </>
  );
}
