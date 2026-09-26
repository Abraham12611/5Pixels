"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarBlank,
  Check,
  Funnel,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import { LibraryResultCard } from "@/components/consumer/library-result-card";
import { cn } from "@/lib/utils";

export interface LibraryItem {
  id: string;
  productName: string;
  productSlug: string;
  createdAt: string;
  savedAt: string | null;
  downloadedAt: string | null;
  outputUrl: string | null;
  outputWidth: number | null;
  outputHeight: number | null;
}

type LibraryTab = "all" | "saved" | "downloaded";
type DateRange = "any" | "7" | "30" | "90";

const PAGE_SIZE = 12;

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  any: "Any time",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
};

function withinDays(iso: string, days: number): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function GhostCards() {
  const aspects = ["4 / 5", "1 / 1", "4 / 3", "3 / 4"];
  return (
    <div
      aria-hidden
      className="columns-2 gap-5 md:columns-4 [&>*]:mb-5 [&>*]:break-inside-avoid"
    >
      {aspects.map((aspect, i) => (
        <div
          key={i}
          className="shadow-border rounded-xl bg-charcoal-850/50"
          style={{ aspectRatio: aspect }}
        />
      ))}
    </div>
  );
}

function EmptyPanel({
  title,
  body,
  children,
  motif = false,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
  motif?: boolean;
}) {
  return (
    <div className="relative">
      {motif && (
        <div aria-hidden className="opacity-60">
          <GhostCards />
        </div>
      )}
      <div
        className={cn(
          "flex flex-col items-center py-16 text-center",
          motif && "absolute inset-0 justify-center"
        )}
      >
        {motif && <FivePixelMark className="mb-4 opacity-70" />}
        <h2 className="text-cream-50 text-lg font-semibold">{title}</h2>
        <p className="text-text-secondary mt-1.5 max-w-sm text-sm">{body}</p>
        {children && <div className="mt-5 flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function LibraryGrid({ items: initialItems }: { items: LibraryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<LibraryTab>("all");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("any");
  const [preset, setPreset] = useState<string | null>(null);

  const presetNames = useMemo(
    () => [...new Set(items.map((i) => i.productName))].sort(),
    [items]
  );

  const hasFilters =
    dateRange !== "any" || preset !== null || query.trim() !== "";

  const clearFilters = () => {
    setDateRange("any");
    setPreset(null);
    setQuery("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tab === "saved" && !item.savedAt) return false;
      if (tab === "downloaded" && !item.downloadedAt) return false;
      if (dateRange !== "any" && !withinDays(item.createdAt, Number(dateRange)))
        return false;
      if (preset && item.productName !== preset) return false;
      if (q && !item.productName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, dateRange, preset, query]);

  const updateItem = (id: string, patch: Partial<LibraryItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );

  const hasLibrary = items.length > 0;

  // Progressive reveal: an explicit first "Load more", then the sentinel
  // auto-appends — the same rule as /explore (06 §5).
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [autoLoad, setAutoLoad] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination when the result set changes (render-phase adjust idiom).
  const filtersKey = `${tab}|${query}|${dateRange}|${preset}`;
  const [lastFiltersKey, setLastFiltersKey] = useState(filtersKey);
  if (lastFiltersKey !== filtersKey) {
    setLastFiltersKey(filtersKey);
    setVisibleCount(PAGE_SIZE);
    setAutoLoad(false);
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !autoLoad || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoLoad, hasMore]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as LibraryTab)}
          className="w-fit"
        >
          <TabsList variant="line" className="h-10">
            <TabsTrigger value="all" className="px-3">
              All
            </TabsTrigger>
            <TabsTrigger value="saved" className="px-3">
              Saved
            </TabsTrigger>
            <TabsTrigger value="downloaded" className="px-3">
              Downloaded
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <label className="bg-charcoal-850 shadow-border focus-within:shadow-border-hover relative flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-3 transition-shadow sm:w-48 sm:flex-none">
            <MagnifyingGlass
              size={14}
              className="text-text-muted shrink-0"
              aria-hidden
            />
            <span className="sr-only">Search library</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="text-cream-50 placeholder:text-text-muted w-full bg-transparent text-sm outline-none"
            />
          </label>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  "h-9 gap-1.5",
                  dateRange !== "any" && "text-lime-300"
                )}
              >
                <CalendarBlank size={14} />
                <span className="hidden sm:inline">
                  {DATE_RANGE_LABELS[dateRange]}
                </span>
                <span className="sm:hidden">Date</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
                <DropdownMenuItem
                  key={range}
                  onSelect={() => setDateRange(range)}
                  className="justify-between"
                >
                  {DATE_RANGE_LABELS[range]}
                  {dateRange === range && (
                    <Check size={14} className="text-lime-400" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className={cn("h-9 gap-1.5", preset && "text-lime-300")}
              >
                <Funnel size={14} />
                <span className="max-w-28 truncate">
                  {preset ?? "Preset"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onSelect={() => setPreset(null)}
                className="justify-between"
              >
                All presets
                {preset === null && (
                  <Check size={14} className="text-lime-400" />
                )}
              </DropdownMenuItem>
              {presetNames.map((name) => (
                <DropdownMenuItem
                  key={name}
                  onSelect={() => setPreset(name)}
                  className="justify-between"
                >
                  <span className="truncate">{name}</span>
                  {preset === name && (
                    <Check size={14} className="text-lime-400 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active filter chips */}
      {(dateRange !== "any" || preset) && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {dateRange !== "any" && (
            <FilterChip
              label={DATE_RANGE_LABELS[dateRange]}
              onClear={() => setDateRange("any")}
            />
          )}
          {preset && (
            <FilterChip label={preset} onClear={() => setPreset(null)} />
          )}
        </div>
      )}

      {/* Grid / empty states */}
      {!hasLibrary && tab === "all" && !hasFilters ? (
        <EmptyPanel
          motif
          title="Your transformations will appear here."
          body="Create something you want to keep."
        >
          <Button asChild>
            <Link href="/explore">Explore presets</Link>
          </Button>
        </EmptyPanel>
      ) : filtered.length === 0 ? (
        hasFilters ? (
          <EmptyPanel
            title="No results match these filters."
            body="Try widening the date range or clearing a filter."
          >
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                clearFilters();
                setTab("all");
              }}
            >
              View all
            </Button>
          </EmptyPanel>
        ) : tab === "saved" ? (
          <EmptyPanel
            title="Nothing saved yet."
            body="Save results you want to come back to."
          >
            <Button variant="secondary" onClick={() => setTab("all")}>
              View all results
            </Button>
          </EmptyPanel>
        ) : (
          <EmptyPanel
            title="Nothing downloaded yet."
            body="Downloads you prepare will be easy to find here."
          >
            <Button variant="secondary" onClick={() => setTab("all")}>
              View all results
            </Button>
          </EmptyPanel>
        )
      ) : (
        <>
          {/* Uniform owned-content grid — 4:5, 10px gutters (11 §4.2) */}
          <section
            aria-label="Library results"
            className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4"
          >
            {visible.map((item, index) => (
              <LibraryResultCard
                key={item.id}
                item={item}
                priority={index < 4}
                onSaved={(id, saved) =>
                  updateItem(id, {
                    savedAt: saved ? new Date().toISOString() : null,
                  })
                }
                onDownloaded={(id) =>
                  updateItem(id, { downloadedAt: new Date().toISOString() })
                }
                onDeleted={(id) =>
                  setItems((prev) => prev.filter((i) => i.id !== id))
                }
              />
            ))}
          </section>
          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                className="h-11 min-w-44"
                onClick={() => {
                  setVisibleCount((c) => c + PAGE_SIZE);
                  setAutoLoad(true);
                }}
              >
                Load more results
              </Button>
              {autoLoad && (
                <div ref={sentinelRef} aria-hidden className="h-px w-full" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="bg-charcoal-800 text-cream-100 inline-flex items-center gap-1.5 rounded-md py-1 pr-1.5 pl-2.5 text-xs font-medium">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="text-text-muted hover:text-cream-50 grid h-4 w-4 place-items-center rounded transition-colors"
      >
        <X size={11} weight="bold" />
      </button>
    </span>
  );
}
