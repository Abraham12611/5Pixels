"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import type { ProductType } from "@/types/catalog";

interface CategoryOption {
  slug: string;
  name: string;
}

interface CatalogFiltersProps {
  categories: CategoryOption[];
  activeType: ProductType | null;
  activeCategory: string | null;
}

const TYPE_OPTIONS: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "filter", label: "Filters" },
  { value: "poster", label: "Posters" },
];

export function CatalogFilters({
  categories,
  activeType,
  activeCategory,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
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
    updateQuery({ type: value === "all" ? null : value, category: null });
  };

  const handleCategoryChange = (value: string) => {
    updateQuery({ category: value === "all" ? null : value });
  };

  return (
    <div
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Catalog filters"
    >
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
                  ? "text-ink-950 bg-lime-500 hover:bg-lime-400"
                  : "border-cream-100/10 bg-charcoal-800 text-cream-50 hover:bg-charcoal-700 border hover:border-lime-500/30"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="category" className="text-text-secondary text-sm">
          Category
        </label>
        <Select
          id="category"
          value={activeCategory ?? "all"}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={isPending}
          className="min-w-[10rem]"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
