"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FunnelSimple,
  MagnifyingGlass,
  SortAscending,
  X,
} from "@phosphor-icons/react";
import { FilterModal } from "@/components/consumer/mobile/filter-modal";
import { ProductCard } from "@/components/consumer/product-card";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Sheet, SheetActionRow } from "@/components/ui/sheet";
import { fetchCatalogPage } from "@/lib/catalog/browser";
import { buildCatalogSearchParams } from "@/lib/catalog/filters";
import { openGlobalSearch } from "@/lib/ui/open-search";
import type { CatalogSort } from "@/lib/db/explore";
import type { ParsedCatalogFilters } from "@/lib/catalog/filters";
import type { ProductType, PublicProductSummary } from "@/types/catalog";
import { cn } from "@/lib/utils";

interface ExploreMobileBrowserProps {
  /** Server-rendered first page (or the requested prefix when ?page=N). */
  initialProducts: PublicProductSummary[];
  initialPage: number;
  totalCount: number;
  filters: ParsedCatalogFilters;
  categories: { slug: string; name: string }[];
  isAuthenticated: boolean;
  favoriteIds: string[];
  returnPath: string;
  /** Featured fallbacks rendered when a filtered query returns nothing. */
  suggestions: PublicProductSummary[];
  /** `top-14` under the 56px app header, `top-16` under the 64px marketing one. */
  headerOffsetClass: string;
}

const SORT_LABELS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "credits_asc", label: "Credits: low to high" },
  { value: "credits_desc", label: "Credits: high to low" },
];

/**
 * Mobile `/explore` composition (25_MOBILE_WEB_POLISH/06 §2): sticky
 * search/filter/sort bar, horizontal chips, progressive "Load more" with
 * auto-load after the first tap, and the T3 filter modal. Rendered `md:hidden`
 * by the page — desktop keeps the inline `CatalogFilters` + pagination.
 */
export function ExploreMobileBrowser({
  initialProducts,
  initialPage,
  totalCount,
  filters,
  categories,
  isAuthenticated,
  favoriteIds,
  returnPath,
  suggestions,
  headerOffsetClass,
}: ExploreMobileBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState(initialProducts);
  const [loadedPage, setLoadedPage] = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(initialPage > 1);
  const [autoLoad, setAutoLoad] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchCollapsed, setSearchCollapsed] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const hasMore = loadedPage < totalPages;
  const activeFilterCount =
    (filters.type ? 1 : 0) + (filters.category ? 1 : 0);

  // Collapse the search field to an icon while scrolling down; restore on
  // scroll up so two of three controls stay reachable (06 §2).
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 140 && y > lastScrollY.current + 8) {
        setSearchCollapsed(true);
      } else if (y < lastScrollY.current - 8 || y <= 140) {
        setSearchCollapsed(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navigate = useCallback(
    (updates: {
      type?: ProductType | null;
      category?: string | null;
      search?: string | null;
      sort?: CatalogSort;
    }) => {
      const merged = {
        type: ("type" in updates ? updates.type : filters.type) ?? null,
        category:
          ("category" in updates ? updates.category : filters.category) ??
          null,
        search:
          ("search" in updates ? updates.search : filters.search) ?? null,
        sort: updates.sort ?? filters.sort,
      };
      const query = buildCatalogSearchParams(merged);
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [filters, pathname, router]
  );

  const loadPage = useCallback(
    async (page: number): Promise<PublicProductSummary[]> => {
      const { products } = await fetchCatalogPage({
        type: filters.type,
        category: filters.category,
        search: filters.search,
        sort: filters.sort,
        page,
        pageSize: filters.pageSize,
      });
      return products;
    },
    [filters]
  );

  // Deep-linked ?page=N renders only page N server-side — backfill the missing
  // prefix so the feed reads as one continuous list (06 §5 restoration).
  useEffect(() => {
    if (initialPage <= 1) return;
    let cancelled = false;
    void Promise.all(
      Array.from({ length: initialPage - 1 }, (_, i) => loadPage(i + 1))
    ).then((pages) => {
      if (cancelled) return;
      setItems((current) => {
        const seen = new Set(current.map((p) => p.id));
        const prefix = pages.flat().filter((p) => !seen.has(p.id));
        return [...prefix, ...current];
      });
      setLoadingEarlier(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- backfill once per mount
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(false);
    const nextPage = loadedPage + 1;
    const products = await loadPage(nextPage);
    setLoadingMore(false);
    if (products.length === 0 && nextPage <= totalPages) {
      setLoadError(true);
      return;
    }
    setItems((current) => {
      const seen = new Set(current.map((p) => p.id));
      return [...current, ...products.filter((p) => !seen.has(p.id))];
    });
    setLoadedPage(nextPage);
    // Keep ?page= shareable without triggering a server navigation.
    const query = buildCatalogSearchParams({ ...filters, page: nextPage });
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname
    );
  }, [filters, hasMore, loadedPage, loadingMore, loadPage, pathname, totalPages]);

  // After the first manual tap, subsequent pages may auto-load on scroll; the
  // button stays rendered as the fallback and for keyboard users (06 §5).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    // No observer → the explicit button remains the only loader (spec fallback).
    if (!sentinel || !autoLoad || !hasMore || !("IntersectionObserver" in window))
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoLoad, hasMore, loadMore]);

  const handleLoadMoreTap = useCallback(() => {
    setAutoLoad(true);
    void loadMore();
  }, [loadMore]);

  const clearFilters = () =>
    router.push(
      filters.search
        ? `${pathname}?${buildCatalogSearchParams({
            type: null,
            category: null,
            search: filters.search,
          })}`
        : pathname
    );

  return (
    <div>
      {/* Sticky control bar — sits under the app/marketing header. */}
      <div
        className={cn(
          "bg-ink-950/95 border-cream-100/10 sticky z-30 -mx-4 border-b backdrop-blur-md",
          headerOffsetClass
        )}
      >
        <div className="flex h-14 items-center gap-2 px-4">
          {searchCollapsed ? (
            <button
              type="button"
              aria-label="Open search"
              onClick={openGlobalSearch}
              className="focus-visible:ring-lime-500/70 border-cream-100/10 bg-charcoal-800 text-text-secondary flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors hover:text-cream-50 focus-visible:ring-2 focus-visible:outline-none"
            >
              <MagnifyingGlass size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={openGlobalSearch}
              aria-label="Open search"
              className="border-cream-100/10 bg-charcoal-800 text-text-muted focus-visible:ring-lime-500/70 flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border pr-3 pl-3.5 text-sm transition-colors hover:text-cream-50 focus-visible:ring-2 focus-visible:outline-none"
            >
              <MagnifyingGlass size={16} className="shrink-0" />
              <span className="truncate">
                {filters.search ? `“${filters.search}”` : "Search looks…"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
            className={cn(
              "focus-visible:ring-lime-500/70 flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
              activeFilterCount > 0
                ? "border-lime-400/60 bg-lime-400/10 text-lime-300"
                : "border-cream-100/10 bg-charcoal-800 text-text-secondary hover:text-cream-50"
            )}
          >
            <FunnelSimple size={16} weight="bold" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-lime-400 text-ink-950 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-label="Sort looks"
            className="focus-visible:ring-lime-500/70 border-cream-100/10 bg-charcoal-800 text-text-secondary flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors hover:text-cream-50 focus-visible:ring-2 focus-visible:outline-none"
          >
            <SortAscending size={18} />
          </button>
        </div>
      </div>

      {/* Chips row — All + categories, matching the landing feed grammar. */}
      <div
        role="tablist"
        aria-label="Filter by category"
        className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4"
      >
        <FilterChip
          label="All"
          active={filters.category === null}
          onClick={() => navigate({ category: null })}
        />
        {categories.map((c) => (
          <FilterChip
            key={c.slug}
            label={c.name}
            active={filters.category === c.slug}
            onClick={() => navigate({ category: c.slug })}
          />
        ))}
      </div>

      {/* Result count + active-filter chip */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-text-muted text-[13px]">
          {totalCount} {totalCount === 1 ? "look" : "looks"}
          {filters.search ? ` matching “${filters.search}”` : ""}
        </p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="focus-visible:ring-lime-500/70 text-text-secondary hover:text-lime-400 inline-flex items-center gap-1 rounded-full text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X size={12} weight="bold" />
            Clear filters
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <MagnifyingGlass
            className="text-text-muted h-12 w-12"
            aria-hidden
          />
          <h2 className="text-cream-50 mt-4 text-xl font-semibold">
            No looks match{filters.search ? ` “${filters.search}”` : " these filters"}
          </h2>
          <p className="text-text-secondary mt-2 max-w-xs text-sm">
            Try a different category or search, or start from one of these.
          </p>
          {activeFilterCount > 0 || filters.search ? (
            <Button
              variant="secondary"
              className="mt-5"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          ) : null}
          {suggestions.length > 0 && (
            <div className="mt-8 grid w-full grid-cols-3 gap-3">
              {suggestions.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isAuthenticated={isAuthenticated}
                  initialIsFavorite={favoriteIdSet.has(product.id)}
                  returnPath={returnPath}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {loadingEarlier && (
            <p className="text-text-muted mt-4 text-center text-xs">
              Loading earlier looks…
            </p>
          )}

          <section
            aria-label="Catalog presets"
            className="columns-2 gap-4 pt-4 [&>*]:mb-4 [&>*]:break-inside-avoid"
          >
            {items.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={isAuthenticated}
                initialIsFavorite={favoriteIdSet.has(product.id)}
                returnPath={returnPath}
                priority={index < 4}
              />
            ))}
            {loadingMore && (
              <>
                <div className="media-frame bg-charcoal-800 aspect-[3/4] animate-pulse rounded-xl" />
                <div className="media-frame bg-charcoal-800 aspect-[3/4] animate-pulse rounded-xl" />
              </>
            )}
          </section>

          {hasMore && (
            <div className="flex flex-col items-center gap-2 py-6">
              <Button
                variant="secondary"
                size="lg"
                className="w-full max-w-xs"
                disabled={loadingMore}
                onClick={handleLoadMoreTap}
              >
                {loadingMore ? "Loading…" : "Load more looks"}
              </Button>
              {loadError && (
                <p className="text-error text-xs">
                  Couldn&apos;t load more — tap to try again.
                </p>
              )}
              <div ref={sentinelRef} aria-hidden className="h-px w-full" />
            </div>
          )}
        </>
      )}

      <FilterModal
        open={filterOpen}
        onOpenChange={setFilterOpen}
        appliedSearch={filters.search}
        appliedType={filters.type}
        appliedCategory={filters.category}
        appliedSort={filters.sort}
        categories={categories}
      />

      <Sheet
        open={sortOpen}
        onOpenChange={setSortOpen}
        tier="action"
        title="Sort looks"
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
                navigate({ sort: option.value });
              }}
            />
          ))}
        </div>
      </Sheet>
    </div>
  );
}

