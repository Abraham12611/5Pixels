"use client";

import { useCallback, useState } from "react";
import { Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  applyLibraryFilters,
  countActiveLibraryFilters,
  DATE_RANGE_LABELS,
  SOURCE_LABELS,
  type LibraryDateRange,
  type LibraryFilterState,
  type LibrarySource,
} from "@/lib/library/filters";
import type { LibraryItem } from "@/components/consumer/library-grid";
import { cn } from "@/lib/utils";

interface LibraryFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applied: LibraryFilterState;
  items: LibraryItem[];
  onApply: (next: LibraryFilterState) => void;
}

/**
 * T3 filter modal for the Library Results segment (`11 §4.3`) — same sheet
 * grammar as the catalog `FilterModal`, but filters apply to local state over
 * owned items so the staged `Show N results` count is computed, not fetched.
 */
export function LibraryFilterModal({
  open,
  onOpenChange,
  applied,
  items,
  onApply,
}: LibraryFilterModalProps) {
  const [staged, setStaged] = useState<LibraryFilterState>(applied);
  const presetNames = Array.from(
    new Set(items.map((i) => i.productName))
  ).sort();

  // Re-sync staged state on each open (render-phase adjust, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setStaged(applied);
  }

  const stagedCount = applyLibraryFilters(items, staged).length;

  const patch = (p: Partial<LibraryFilterState>) =>
    setStaged((prev) => ({ ...prev, ...p }));

  const handleReset = useCallback(() => {
    setStaged((prev) => ({
      source: "all",
      query: "",
      dateRange: "any",
      preset: null,
      sort: prev.sort, // Reset clears filters, not the sort order.
    }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(staged);
    onOpenChange(false);
  }, [staged, onApply, onOpenChange]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      tier="full"
      ariaLabel="Filter results"
      showClose={false}
      className="flex flex-col"
      bodyClassName="flex flex-1 flex-col overflow-hidden px-0 py-0"
      footer={
        <Button type="button" size="lg" className="w-full" onClick={handleApply}>
          Show {stagedCount} {stagedCount === 1 ? "result" : "results"}
        </Button>
      }
    >
      {/* Header */}
      <div className="border-cream-100/10 flex h-14 shrink-0 items-center justify-between border-b px-4">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close filters"
          className="focus-visible:ring-lime-500/70 text-text-secondary hover:text-cream-50 -ml-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X size={22} />
        </button>
        <h2 className="text-cream-50 font-display text-base font-semibold">
          Filters
        </h2>
        <button
          type="button"
          onClick={handleReset}
          className="focus-visible:ring-lime-500/70 text-lime-400 -mr-2 flex h-11 items-center rounded-full px-3 text-sm font-semibold transition-colors hover:text-lime-300 focus-visible:ring-2 focus-visible:outline-none"
        >
          Reset
        </button>
      </div>

      {/* Scrollable body */}
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-4 py-6">
        {/* Search */}
        <section aria-label="Search">
          <h3 className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
            Search
          </h3>
          <label className="bg-charcoal-800 shadow-border focus-within:shadow-border-hover flex h-12 items-center gap-2 rounded-xl px-3 transition-shadow">
            <MagnifyingGlass
              size={16}
              className="text-text-muted shrink-0"
              aria-hidden
            />
            <span className="sr-only">Search results by preset name</span>
            <input
              type="search"
              value={staged.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder="Search by preset name"
              className="text-cream-50 placeholder:text-text-muted w-full bg-transparent text-sm outline-none"
            />
          </label>
        </section>

        {/* Source — the old All / Saved / Downloaded tabs live here now */}
        <section aria-label="Source">
          <h3 className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
            Source
          </h3>
          <div
            role="radiogroup"
            className="bg-charcoal-800 grid grid-cols-3 gap-1 rounded-xl p-1"
          >
            {(Object.keys(SOURCE_LABELS) as LibrarySource[]).map((value) => {
              const active = staged.source === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => patch({ source: value })}
                  className={cn(
                    "focus-visible:ring-lime-500/70 flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "bg-lime-400 text-ink-950"
                      : "text-text-secondary hover:text-cream-50"
                  )}
                >
                  {SOURCE_LABELS[value]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Date range */}
        <section aria-label="Date range">
          <h3 className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
            Date
          </h3>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {(Object.keys(DATE_RANGE_LABELS) as LibraryDateRange[]).map(
              (value) => {
                const active = staged.dateRange === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => patch({ dateRange: value })}
                    className={cn(
                      "focus-visible:ring-lime-500/70 flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      active
                        ? "border-lime-400/60 bg-lime-400/10 text-cream-50"
                        : "border-cream-100/10 bg-charcoal-800 text-text-secondary hover:text-cream-50"
                    )}
                  >
                    <span className="truncate text-sm font-semibold">
                      {DATE_RANGE_LABELS[value]}
                    </span>
                    {active && (
                      <Check
                        size={18}
                        weight="bold"
                        className="text-lime-400 shrink-0"
                      />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* Preset */}
        {presetNames.length > 0 && (
          <section aria-label="Preset">
            <h3 className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
              Preset
            </h3>
            <div role="radiogroup" className="divide-cream-100/5 divide-y">
              {presetNames.map((name) => {
                const active = staged.preset === name;
                const count = items.filter(
                  (i) => i.productName === name
                ).length;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => patch({ preset: active ? null : name })}
                    className="focus-visible:ring-lime-500/70 flex min-h-12 w-full items-center justify-between rounded-lg px-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          active
                            ? "text-cream-50 font-semibold"
                            : "text-text-secondary"
                        )}
                      >
                        {name}
                      </span>
                      <span className="text-text-muted text-xs">
                        {count} {count === 1 ? "result" : "results"}
                      </span>
                    </span>
                    {active && (
                      <Check
                        size={18}
                        weight="bold"
                        className="text-lime-400 shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Sheet>
  );
}

export { countActiveLibraryFilters };
