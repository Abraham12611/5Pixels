"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  SearchPalette,
  type SearchPaletteProps,
} from "@/components/consumer/search-palette";

type GlobalSearchProps = Omit<SearchPaletteProps, "open" | "onOpenChange">;

/**
 * Global search trigger + cmdk palette. Opens on click or Cmd/Ctrl+K.
 * The keyboard shortcut toggles the palette; Escape/outside-click close it and
 * Radix Dialog returns focus to the trigger automatically.
 */
export function GlobalSearch(props: GlobalSearchProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        aria-keyshortcuts="Control+K Meta+K"
        className="border-cream-100/10 bg-charcoal-850 text-text-secondary hover:border-cream-100/20 hover:text-cream-100 focus-visible:ring-lime-500/50 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        <MagnifyingGlass size={16} weight="bold" />
        <span className="hidden md:inline">Search</span>
        <kbd className="border-cream-100/15 text-text-muted hidden rounded border px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </button>
      <SearchPalette open={open} onOpenChange={setOpen} {...props} />
    </>
  );
}
