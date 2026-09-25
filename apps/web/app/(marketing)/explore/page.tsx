import { createClient } from "@/lib/supabase/server";
import {
  getActiveCategories,
  getPublicProducts,
  getUserFavoriteProductIds,
} from "@/lib/db/explore";
import {
  parseCatalogSearchParams,
  buildCatalogSearchParams,
} from "@/lib/catalog/filters";
import { CatalogFilters } from "@/components/consumer/catalog-filters";
import { CategoryChipWall } from "@/components/consumer/category-chip-wall";
import { ExploreMobileBrowser } from "@/components/consumer/mobile/explore-browser";
import { ProductCard } from "@/components/consumer/product-card";
import { PresetQuickViewHost } from "@/components/consumer/preset-quick-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseCatalogSearchParams(params);

  const currentQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    currentQuery.set(key, Array.isArray(value) ? value[0] : value);
  }
  const returnPath = `/explore${currentQuery.toString() ? `?${currentQuery.toString()}` : ""}`;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(userData.user);

  const [{ data: products, totalCount = 0, error }, categories, favoriteIds] =
    await Promise.all([
      getPublicProducts(
        filters.type ?? undefined,
        filters.category ?? undefined,
        undefined,
        filters.search ?? undefined,
        filters.sort,
        filters.page,
        filters.pageSize
      ),
      getActiveCategories(),
      isAuthenticated ? getUserFavoriteProductIds() : Promise.resolve([]),
    ]);

  const favoriteIdSet = new Set(favoriteIds);
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));

  if (error) {
    throw new Error(error);
  }

  // Fallback looks for the mobile empty state ("No looks match" + suggestions).
  const suggestions =
    products.length === 0
      ? (
          await getPublicProducts(
            undefined,
            undefined,
            undefined,
            undefined,
            "featured",
            1,
            3
          )
        ).data
      : [];

  const activeCategoryName =
    categories.find((c) => c.slug === filters.category)?.name ?? null;

  const heading = activeCategoryName
    ? activeCategoryName
    : filters.type === "filter"
      ? "Filters"
      : filters.type === "poster"
        ? "Posters"
        : filters.sort === "newest"
          ? "New looks"
          : "Trending now";

  const subcopy = activeCategoryName
    ? `Curated ${filters.type ?? "filters and posters"} in the ${activeCategoryName} category.`
    : filters.sort === "newest"
      ? "The freshest presets added this week."
      : "The looks getting the most traction right now.";

  // Remounts the mobile browser whenever an applied filter changes so staged
  // client state (loaded pages, auto-load) never leaks across navigations.
  const mobileKey = buildCatalogSearchParams({
    type: filters.type,
    category: filters.category,
    search: filters.search,
    sort: filters.sort,
    page: filters.page,
  });

  return (
    <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 md:py-10 lg:py-12">
      {filters.errors.length > 0 && (
        <div
          role="alert"
          className="border-error/30 bg-error/10 text-error mb-6 rounded-xl border px-4 py-3 text-sm"
        >
          {filters.errors.join(" ")}
        </div>
      )}

      <PresetQuickViewHost
        isAuthenticated={isAuthenticated}
        favoriteIds={favoriteIds}
        returnPath={returnPath}
      >
        {/* Mobile composition — sticky bar, chips, progressive grid (06 §2). */}
        <div className="md:hidden">
          <div className="mb-4 flex items-center gap-2">
            <h1 className="text-cream-50 text-2xl font-bold">{heading}</h1>
            {filters.sort === "featured" &&
              !filters.category &&
              !filters.type && (
                <Badge
                  variant="secondary"
                  className="border-none bg-lime-400/15 text-lime-300"
                >
                  <Lightning className="mr-1 h-3 w-3" />
                  Trending
                </Badge>
              )}
          </div>
          <ExploreMobileBrowser
            key={mobileKey}
            initialProducts={products}
            initialPage={filters.page}
            totalCount={totalCount}
            filters={filters}
            categories={categories}
            isAuthenticated={isAuthenticated}
            favoriteIds={favoriteIds}
            returnPath={returnPath}
            suggestions={suggestions}
            headerOffsetClass={isAuthenticated ? "top-14" : "top-16"}
          />
        </div>

        {/* Desktop composition — inline filters + numbered pagination. */}
        <div className="hidden md:block">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              {activeCategoryName && (
                <p className="text-text-muted mb-1.5 text-[11px] font-semibold tracking-wider uppercase">
                  Category
                </p>
              )}
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-cream-50 text-3xl font-bold sm:text-4xl">
                  {heading}
                </h1>
                {filters.sort === "featured" &&
                  !filters.category &&
                  !filters.type && (
                    <Badge
                      variant="secondary"
                      className="border-none bg-lime-400/15 text-lime-300"
                    >
                      <Lightning className="mr-1 h-3 w-3" />
                      Trending
                    </Badge>
                  )}
              </div>
              <p className="text-text-secondary mt-2">{subcopy}</p>
            </div>
            <Link
              href="/app/favorites"
              className="text-sm font-medium text-lime-400 hover:underline"
            >
              View your favorites →
            </Link>
          </div>

          <section className="mb-8" aria-label="Browse categories">
            <CategoryChipWall
              categories={categories}
              activeCategory={filters.category}
              activeSort={filters.sort}
            />
          </section>

          <CatalogFilters
            key={filters.search ?? ""}
            activeType={filters.type}
            search={filters.search}
            sort={filters.sort}
            pageSize={filters.pageSize}
          />

          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-text-muted text-sm">
              {totalCount} {totalCount === 1 ? "preset" : "presets"}
              {filters.search ? ` matching "${filters.search}"` : ""}
            </p>
            {(filters.category || filters.type || filters.search) && (
              <Link
                href="/explore"
                className="text-text-secondary text-[13px] font-medium transition-colors hover:text-lime-400"
              >
                Explore all presets
              </Link>
            )}
          </div>

          {products.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <MagnifyingGlass
                className="text-text-muted h-12 w-12"
                aria-hidden
              />
              <h2 className="text-cream-50 mt-4 text-xl font-semibold">
                No presets match your filters
              </h2>
              <p className="text-text-secondary mt-2 max-w-md">
                Try changing the category, type, or search term above, or come
                back later for new looks.
              </p>
              <Button asChild variant="secondary" className="mt-6">
                <Link href="/explore">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <>
              <section
                aria-label="Catalog presets"
                className={
                  products.length <= 4
                    ? "grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2"
                    : "columns-2 gap-5 md:columns-3 xl:columns-4 [&>*]:mb-5 [&>*]:break-inside-avoid"
                }
              >
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isAuthenticated={isAuthenticated}
                    initialIsFavorite={favoriteIdSet.has(product.id)}
                    returnPath={returnPath}
                    priority={index < 4}
                  />
                ))}
              </section>

              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-10 flex items-center justify-between gap-4"
                >
                  <Button
                    asChild
                    variant="secondary"
                    disabled={filters.page <= 1}
                    className={
                      filters.page <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  >
                    <Link
                      href={`/explore?${buildCatalogSearchParams({
                        ...filters,
                        page: filters.page - 1,
                      })}`}
                      aria-disabled={filters.page <= 1}
                    >
                      <CaretLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Link>
                  </Button>

                  <p className="text-text-secondary text-sm">
                    Page {filters.page} of {totalPages}
                  </p>

                  <Button
                    asChild
                    variant="secondary"
                    disabled={filters.page >= totalPages}
                    className={
                      filters.page >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    <Link
                      href={`/explore?${buildCatalogSearchParams({
                        ...filters,
                        page: filters.page + 1,
                      })}`}
                      aria-disabled={filters.page >= totalPages}
                    >
                      Next
                      <CaretRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </PresetQuickViewHost>
    </main>
  );
}
