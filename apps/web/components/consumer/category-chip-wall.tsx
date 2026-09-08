"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Fire, Sparkle, SquaresFour } from "@phosphor-icons/react";

interface CategoryChipWallProps {
  categories: { slug: string; name: string }[];
  activeCategory: string | null;
  activeSort: string;
}

const SORT_CHIPS: { value: string; label: string; icon: typeof Fire }[] = [
  { value: "featured", label: "Viral", icon: Fire },
  { value: "newest", label: "New", icon: Sparkle },
];

export function CategoryChipWall({
  categories,
  activeCategory,
  activeSort,
}: CategoryChipWallProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
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

  const handleCategoryClick = (slug: string | null) => {
    updateQuery({ category: slug, page: null });
  };

  const handleSortClick = (sort: string) => {
    const nextSort = sort === "featured" ? null : sort;
    updateQuery({ sort: nextSort, page: null });
  };

  return (
    <div
      className="space-y-3"
      aria-label="Browse by category or sort"
      aria-busy={isPending}
    >
      <div className="flex flex-wrap gap-2">
        {SORT_CHIPS.map((chip) => {
          const Icon = chip.icon;
          const isActive = activeSort === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => handleSortClick(chip.value)}
              disabled={isPending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50",
                isActive
                  ? "bg-lime-500 text-ink-950 hover:bg-lime-400"
                  : "border-cream-100/10 bg-charcoal-800 text-cream-50 hover:border-lime-500/30 hover:text-lime-400 border"
              )}
            >
              <Icon size={14} weight="fill" />
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleCategoryClick(null)}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50",
            activeCategory === null
              ? "bg-lime-500 text-ink-950 hover:bg-lime-400"
              : "border-cream-100/10 bg-charcoal-800 text-cream-50 hover:border-lime-500/30 hover:text-lime-400 border"
          )}
        >
          <SquaresFour size={14} weight="fill" />
          All
        </button>

        {categories.map((category) => {
          const isActive = activeCategory === category.slug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => handleCategoryClick(category.slug)}
              disabled={isPending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50",
                isActive
                  ? "bg-lime-500 text-ink-950 hover:bg-lime-400"
                  : "border-cream-100/10 bg-charcoal-800 text-cream-50 hover:border-lime-500/30 hover:text-lime-400 border"
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
