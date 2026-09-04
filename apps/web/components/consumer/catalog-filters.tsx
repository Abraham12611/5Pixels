"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ProductType } from "@/types/catalog";
import type { CatalogSort } from "@/lib/db/explore";

interface CategoryOption {
  slug: string;
  name: string;
}

interface CatalogFiltersProps {
  categories: CategoryOption[];
  activeType: ProductType | null;
  activeCategory: string | null;
  search: string | null;
  sort: CatalogSort;
  pageSize: number;
}

const TYPE_OPTIONS: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "filter", label: "Filters" },
  { value: "poster", label: "Posters" },
];

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "credits_asc", label: "Credits: Low to High" },
  { value: "credits_desc", label: "Credits: High to Low" },
];

const PAGE_SIZE_OPTIONS = [12, 24, 48];

export function CatalogFilters({
  categories,
  activeType,
  activeCategory,
  search,
  sort,
  pageSize,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search ?? "");

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page when filters change.
      if (
        "search" in updates ||
        "sort" in updates ||
        "category" in updates ||
        "type" in updates ||
        "page_size" in updates
      ) {
        params.delete("page");
      }
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [pathname, router, searchParams]
  );

  const handleTypeClick = (value: ProductType | "all") => {
    updateQuery({ type: value === "all" ? null : value, page: null });
  };

  const handleCategoryChange = (value: string) => {
    updateQuery({ category: value === "all" ? null : value });
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateQuery({
      search: searchValue.trim() || null,
    });
  };

  return (
    <div className="space-y-4" aria-label="Catalog filters">
      <div
        role="tablist"
        aria-label="Filter by product type"
        className="flex flex-wrap gap-2"
      >
        {TYPE_OPTIONS.map((option) => {
          const isActive =
            activeType === option.value ||
            (option.value === "all" && activeType === null);
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={isPending}
              onClick={() => handleTypeClick(option.value)}
              className={cn(
                "focus:ring-offset-ink-950 rounded-full px-4 py-2 text-sm font-medium transition focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50",
                isActive
                  ? "bg-lime-500 text-ink-950 hover:bg-lime-400"
                  : "border-cream-100/10 bg-charcoal-800 text-cream-50 hover:bg-charcoal-700 border hover:border-lime-500/30"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Input
            type="search"
            name="search"
            placeholder="Search presets..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            disabled={isPending}
            className="w-full"
          />
        </form>

        <div className="flex items-center gap-2">
          <label htmlFor="category" className="text-text-secondary text-sm">
            Category
          </label>
          <Select
            id="category"
            value={activeCategory ?? "all"}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={isPending}
            className="min-w-[10rem] flex-1"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-text-secondary text-sm">
            Sort
          </label>
          <Select
            id="sort"
            value={sort}
            onChange={(e) =>
              updateQuery({ sort: e.target.value as CatalogSort })
            }
            disabled={isPending}
            className="min-w-[10rem] flex-1"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="page_size" className="text-text-secondary text-sm">
            Show
          </label>
          <Select
            id="page_size"
            value={String(pageSize)}
            onChange={(e) => updateQuery({ page_size: e.target.value })}
            disabled={isPending}
            className="min-w-[5rem] flex-1"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
