"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, X } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { fetchCategoryCounts } from "@/lib/catalog/browser";
import { buildCatalogSearchParams } from "@/lib/catalog/filters";
import type { CatalogSort } from "@/lib/db/explore";
import type { ProductType } from "@/types/catalog";
import { cn } from "@/lib/utils";

export interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently applied search — kept fixed while staging type/category/sort. */
  appliedSearch: string | null;
  appliedType: ProductType | null;
  appliedCategory: string | null;
  appliedSort: CatalogSort;
  categories: { slug: string; name: string }[];
}

const TYPE_OPTIONS: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "filter", label: "Filters" },
  { value: "poster", label: "Posters" },
];

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "credits_asc", label: "Credits: low to high" },
  { value: "credits_desc", label: "Credits: high to low" },
];

/**
 * T3 full-screen filter modal (25_MOBILE_WEB_POLISH/06 §4). Changes are staged
 * locally and applied as a single navigation via `Show N looks`; the count is
 * fetched live against the public catalog RPC.
 */
export function FilterModal({
  open,
  onOpenChange,
  appliedSearch,
  appliedType,
  appliedCategory,
  appliedSort,
  categories,
}: FilterModalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [type, setType] = useState<ProductType | "all">(appliedType ?? "all");
  const [category, setCategory] = useState<string | null>(appliedCategory);
  const [sort, setSort] = useState<CatalogSort>(appliedSort);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [countTotal, setCountTotal] = useState<number | null>(null);

  // Re-sync staged state on each open — the "adjust state during render"
  // pattern keeps this synchronous (no setState inside an effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setType(appliedType ?? "all");
      setCategory(appliedCategory);
      setSort(appliedSort);
    }
  }

  // Live counts: one broad fetch grouped client-side (catalogue is small —
  // see 20_OPEN_QUESTIONS Q5). Debounced so rapid taps don't spam the RPC.
  const countScope = type === "all" ? null : type;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchCategoryCounts(countScope, appliedSearch).then((result) => {
        if (cancelled) return;
        setCounts(result.counts);
        setCountTotal(result.total);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, countScope, appliedSearch]);

  const stagedCount = category ? (counts?.[category] ?? 0) : countTotal;

  const handleReset = useCallback(() => {
    setType("all");
    setCategory(null);
    setSort("featured");
  }, []);

  const handleApply = useCallback(() => {
    const query = buildCatalogSearchParams({
      type: type === "all" ? null : type,
      category,
      search: appliedSearch,
      sort,
    });
    onOpenChange(false);
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [type, category, sort, appliedSearch, pathname, router, onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // Closing without applying keeps the applied URL params — staged state
      // is discarded on next open via the effect above.
      onOpenChange(next);
    },
    [onOpenChange]
  );

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      tier="full"
      ariaLabel="Filter looks"
      showClose={false}
      className="flex flex-col"
      bodyClassName="flex flex-1 flex-col overflow-hidden px-0 py-0"
      footer={
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleApply}
        >
          {stagedCount === null
            ? "Show looks"
            : `Show ${stagedCount} ${stagedCount === 1 ? "look" : "looks"}`}
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
        {/* Type */}
        <section aria-label="Type">
          <h3 className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
            Type
          </h3>
          <div
            role="radiogroup"
            className="bg-charcoal-800 grid grid-cols-3 gap-1 rounded-xl p-1"
          >
            {TYPE_OPTIONS.map((option) => {
              const active = type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(option.value)}
                  className={cn(
                    "focus-visible:ring-lime-500/70 flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "bg-lime-400 text-ink-950"
                      : "text-text-secondary hover:text-cream-50"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Category — single-select (matches the catalog RPC), tap again to clear */}
        <section aria-label="Category">
          <h3 className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
            Category
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((c) => {
              const active = category === c.slug;
              const count = counts?.[c.slug];
              return (
                <button
                  key={c.slug}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => setCategory(active ? null : c.slug)}
                  className={cn(
                    "focus-visible:ring-lime-500/70 flex min-h-14 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "border-lime-400/60 bg-lime-400/10 text-cream-50"
                      : "border-cream-100/10 bg-charcoal-800 text-text-secondary hover:text-cream-50"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {c.name}
                    </span>
                    <span className="text-text-muted text-xs">
                      {count === undefined ? "…" : `${count} ${count === 1 ? "look" : "looks"}`}
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

        {/* Sort */}
        <section aria-label="Sort">
          <h3 className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
            Sort
          </h3>
          <div role="radiogroup" className="divide-cream-100/5 divide-y">
            {SORT_OPTIONS.map((option) => {
              const active = sort === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSort(option.value)}
                  className="focus-visible:ring-lime-500/70 flex min-h-12 w-full items-center justify-between rounded-lg px-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "text-sm",
                      active
                        ? "text-cream-50 font-semibold"
                        : "text-text-secondary"
                    )}
                  >
                    {option.label}
                  </span>
                  {active && (
                    <Check
                      size={18}
                      weight="bold"
                      className="text-lime-400"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Sheet>
  );
}

export { SORT_OPTIONS as EXPLORE_SORT_OPTIONS };
