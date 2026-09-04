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
import { ProductCard } from "@/components/consumer/product-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchX, ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-cream-50 text-3xl font-bold sm:text-4xl">
            Explore looks
          </h1>
          <p className="text-text-secondary mt-2">
            Browse curated Filters and Posters. Pick one, upload your photo, and
            we handle the rest.
          </p>
        </div>
        <Link
          href="/app/favorites"
          className="text-sm font-medium text-lime-400 hover:underline"
        >
          View your favorites →
        </Link>
      </div>

      {filters.errors.length > 0 && (
        <div
          role="alert"
          className="border-error/30 bg-error/10 text-error mb-6 rounded-xl border px-4 py-3 text-sm"
        >
          {filters.errors.join(" ")}
        </div>
      )}

      <CatalogFilters
        key={filters.search ?? ""}
        categories={categories}
        activeType={filters.type}
        activeCategory={filters.category}
        search={filters.search}
        sort={filters.sort}
        pageSize={filters.pageSize}
      />

      <p className="text-text-muted mb-6 text-sm">
        {totalCount} {totalCount === 1 ? "preset" : "presets"}
        {filters.search ? ` matching "${filters.search}"` : ""}
      </p>

      {products.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <SearchX className="text-text-muted h-12 w-12" aria-hidden />
          <h2 className="text-cream-50 mt-4 text-xl font-semibold">
            No presets match your filters
          </h2>
          <p className="text-text-secondary mt-2 max-w-md">
            Try changing the category, type, or search term above, or come back
            later for new looks.
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/explore">Clear filters</Link>
          </Button>
        </div>
      ) : (
        <>
          <section
            aria-label="Catalog presets"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
                className={filters.page <= 1 ? "pointer-events-none opacity-50" : ""}
              >
                <Link
                  href={`/explore?${buildCatalogSearchParams({
                    ...filters,
                    page: filters.page - 1,
                  })}`}
                  aria-disabled={filters.page <= 1}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
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
                  filters.page >= totalPages ? "pointer-events-none opacity-50" : ""
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
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
