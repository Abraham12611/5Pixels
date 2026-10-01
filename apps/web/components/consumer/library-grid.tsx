"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowsDownUp,
  CheckSquare,
  Funnel,
  Trash,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { SheetActionRow } from "@/components/ui/sheet";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import { LibraryResultCard } from "@/components/consumer/library-result-card";
import dynamic from "next/dynamic";
const LibraryFilterModal = dynamic(() =>
  import("@/components/consumer/library-filter-modal").then(
    (m) => m.LibraryFilterModal
  )
);
import {
  applyLibraryFilters,
  countActiveLibraryFilters,
  DATE_RANGE_LABELS,
  DEFAULT_LIBRARY_FILTERS,
  SORT_LABELS,
  SOURCE_LABELS,
  type LibraryFilterState,
} from "@/lib/library/filters";
import {
  deleteGeneration,
  markGenerationDownloaded,
} from "@/lib/library/actions";
import { useIsNarrow } from "@/lib/ui/use-media-query";
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

const PAGE_SIZE = 12;

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
  const [filters, setFilters] = useState<LibraryFilterState>(
    DEFAULT_LIBRARY_FILTERS
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const isNarrow = useIsNarrow();
  const [, startTransition] = useTransition();

  const filtered = applyLibraryFilters(items, filters);
  const activeFilterCount = countActiveLibraryFilters(filters);
  const hasFilters = activeFilterCount > 0;
  const hasLibrary = items.length > 0;

  // --- Progressive reveal: explicit first "Load more", then sentinel ---
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [autoLoad, setAutoLoad] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filtersKey = `${filters.source}|${filters.query}|${filters.dateRange}|${filters.preset}|${filters.sort}`;
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

  // --- Scroll-up reveal for the filter row (11 §3) ---
  const [filtersHidden, setFiltersHidden] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 200 && y > lastScrollY.current + 8) {
        setFiltersHidden(true);
      } else if (y < lastScrollY.current - 8 || y <= 200) {
        setFiltersHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // --- Selection mode (11 §4.4) ---
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const enterSelection = useCallback((id: string) => {
    setSelecting(true);
    setSelected(new Set([id]));
  }, []);

  const exitSelection = useCallback(() => {
    setSelecting(false);
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, exitSelection]);

  const selectedItems = filtered.filter((i) => selected.has(i.id));

  const updateItem = (id: string, patch: Partial<LibraryItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );

  const handleBulkDownload = async () => {
    const downloadable = selectedItems.filter((i) => i.outputUrl);
    if (downloadable.length === 0) return;
    const toastId = toast.loading(
      `Downloading 1 of ${downloadable.length}…`
    );
    try {
      for (const [index, item] of downloadable.entries()) {
        toast.loading(
          `Downloading ${index + 1} of ${downloadable.length}…`,
          { id: toastId }
        );
        const a = document.createElement("a");
        a.href = item.outputUrl as string;
        a.download = "";
        a.target = "_blank";
        a.rel = "noreferrer";
        a.click();
        updateItem(item.id, { downloadedAt: new Date().toISOString() });
        void markGenerationDownloaded(item.id);
        // Browsers throttle rapid programmatic downloads — small settle gap.
        await new Promise((r) => setTimeout(r, 350));
      }
      toast.success(`Downloaded ${downloadable.length} results`, {
        id: toastId,
      });
      exitSelection();
    } catch {
      toast.error("Downloads stopped partway — try again.", { id: toastId });
    }
  };

  const handleBulkDelete = () => {
    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) return;
    setBusy(`Deleting 1 of ${ids.length}…`);
    startTransition(async () => {
      try {
        for (const [index, id] of ids.entries()) {
          setBusy(`Deleting ${index + 1} of ${ids.length}…`);
          const result = await deleteGeneration(id);
          if (!result.success) {
            throw new Error(result.error ?? "delete failed");
          }
          setItems((prev) => prev.filter((i) => i.id !== id));
        }
        toast.success(
          `Deleted ${ids.length} ${ids.length === 1 ? "result" : "results"}`
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not delete everything."
        );
      } finally {
        setBusy(null);
        setBulkDeleteOpen(false);
        exitSelection();
      }
    });
  };

  const clearFilters = () => setFilters(DEFAULT_LIBRARY_FILTERS);

  return (
    <div>
      {/* Filter row — scrolls away on scroll-down, returns on scroll-up
          (11 §3). Swaps to the selection header while selecting (§4.4). */}
      <div
        className={cn(
          "bg-ink-950/95 supports-[backdrop-filter]:bg-ink-950/85 sticky top-[120px] z-20 -mx-4 mb-5 px-4 py-2 backdrop-blur-sm transition-all duration-200 sm:-mx-6 sm:px-6",
          !selecting &&
            filtersHidden &&
            "-translate-y-[130%] opacity-0"
        )}
      >
        {selecting ? (
          <div className="flex h-10 items-center justify-between">
            <span
              aria-live="polite"
              className="text-cream-50 text-sm font-semibold"
            >
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={exitSelection}
              className="focus-visible:ring-lime-500/70 text-text-secondary hover:text-cream-50 flex h-10 items-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex h-10 items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-haspopup="dialog"
              className="focus-visible:ring-lime-500/70 bg-charcoal-850 shadow-border hover:shadow-border-hover text-cream-50 flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-shadow focus-visible:ring-2 focus-visible:outline-none"
            >
              <Funnel size={15} aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-lime-400 text-ink-950 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSortOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                "focus-visible:ring-lime-500/70 bg-charcoal-850 shadow-border hover:shadow-border-hover flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-shadow focus-visible:ring-2 focus-visible:outline-none",
                filters.sort !== "newest"
                  ? "text-lime-300"
                  : "text-text-secondary"
              )}
            >
              <ArrowsDownUp size={15} aria-hidden />
              {SORT_LABELS.find((s) => s.value === filters.sort)?.label}
            </button>
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="focus-visible:ring-lime-500/70 text-text-secondary hover:text-cream-50 ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <CheckSquare size={15} aria-hidden />
              Select
            </button>
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {!selecting && hasFilters && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {filters.source !== "all" && (
            <FilterChip
              label={SOURCE_LABELS[filters.source]}
              onClear={() =>
                setFilters((f) => ({ ...f, source: "all" }))
              }
            />
          )}
          {filters.dateRange !== "any" && (
            <FilterChip
              label={DATE_RANGE_LABELS[filters.dateRange]}
              onClear={() => setFilters((f) => ({ ...f, dateRange: "any" }))}
            />
          )}
          {filters.preset && (
            <FilterChip
              label={filters.preset}
              onClear={() => setFilters((f) => ({ ...f, preset: null }))}
            />
          )}
          {filters.query.trim() !== "" && (
            <FilterChip
              label={`“${filters.query.trim()}”`}
              onClear={() => setFilters((f) => ({ ...f, query: "" }))}
            />
          )}
        </div>
      )}

      {/* Grid / empty states */}
      {!hasLibrary ? (
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
        <EmptyPanel
          title="No results match these filters."
          body="Try widening the date range or clearing a filter."
        >
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </EmptyPanel>
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
                selecting={selecting}
                selected={selected.has(item.id)}
                onToggleSelect={toggleSelect}
                onEnterSelection={enterSelection}
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
          {hasMore && !selecting && (
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

      {/* Selection-mode docked bar — sits above the tab bar on mobile,
          floats bottom-center on desktop */}
      {selecting && (
        <div
          className={cn(
            "fixed inset-x-0 z-40 px-4 md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2",
            "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6"
          )}
        >
          <div className="border-cream-100/10 bg-charcoal-850/95 supports-[backdrop-filter]:bg-charcoal-850/90 mx-auto flex max-w-md items-center gap-2 rounded-2xl border p-2 shadow-lg backdrop-blur-md md:rounded-full">
            <Button
              variant="secondary"
              className="h-11 flex-1 md:flex-none md:px-5"
              onClick={() => void handleBulkDownload()}
              disabled={selected.size === 0 || busy !== null}
            >
              <ArrowDown size={15} weight="bold" />
              Download
            </Button>
            <Button
              variant="destructive"
              className="h-11 flex-1 md:flex-none md:px-5"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selected.size === 0 || busy !== null}
            >
              <Trash size={15} weight="bold" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <LibraryFilterModal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        applied={filters}
        items={items}
        onApply={setFilters}
      />

      {/* Sort — T1 sheet */}
      <Sheet
        open={sortOpen}
        onOpenChange={setSortOpen}
        tier="action"
        title="Sort results"
      >
        <div className="space-y-1">
          {SORT_LABELS.map((option) => (
            <SheetActionRow
              key={option.value}
              label={option.label}
              icon={
                option.value === filters.sort ? (
                  <span className="bg-lime-400 h-2 w-2 rounded-full" />
                ) : (
                  <span className="border-cream-100/20 h-2 w-2 rounded-full border" />
                )
              }
              onClick={() => {
                setSortOpen(false);
                setFilters((f) => ({ ...f, sort: option.value }));
              }}
            />
          ))}
        </div>
      </Sheet>

      {/* Bulk delete confirm — T1 sheet on mobile, dialog on desktop. Names
          the count and permanence (02 §3.2). */}
      {isNarrow ? (
        <Sheet
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          tier="action"
          title={`Delete ${selected.size} ${selected.size === 1 ? "result" : "results"}?`}
        >
          <div className="space-y-3">
            <p className="text-text-secondary text-sm">
              This permanently removes {selected.size}{" "}
              {selected.size === 1 ? "result" : "results"} and their files.
              This can&apos;t be undone.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={handleBulkDelete}
              disabled={busy !== null}
            >
              {busy ?? "Delete permanently"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={busy !== null}
            >
              Keep them
            </Button>
          </div>
        </Sheet>
      ) : (
        <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <DialogContent className="bg-charcoal-850 border-cream-100/10 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-cream-50">
                Delete {selected.size}{" "}
                {selected.size === 1 ? "result" : "results"}?
              </DialogTitle>
              <DialogDescription className="text-text-secondary">
                This permanently removes the selected results and their
                files. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={busy !== null}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={busy !== null}
              >
                {busy ?? "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
