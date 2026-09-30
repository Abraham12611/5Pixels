"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/ui/filter-chip";
import { Fire, Sparkle, SquaresFour } from "@phosphor-icons/react";

interface CategoryChipWallProps {
  categories: { slug: string; name: string }[];
  activeCategory: string | null;
  activeSort: string;
}

const SORT_CHIPS: { value: string; label: string; icon: typeof Fire }[] = [
  { value: "featured", label: "Trending", icon: Fire },
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
          return (
            <FilterChip
              key={chip.value}
              label={chip.label}
              icon={<Icon size={14} weight="fill" />}
              active={activeSort === chip.value}
              onClick={() => handleSortClick(chip.value)}
              disabled={isPending}
              semantics="toggle"
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          icon={<SquaresFour size={14} weight="fill" />}
          active={activeCategory === null}
          onClick={() => handleCategoryClick(null)}
          disabled={isPending}
          semantics="toggle"
        />

        {categories.map((category) => (
          <FilterChip
            key={category.slug}
            label={category.name}
            active={activeCategory === category.slug}
            onClick={() => handleCategoryClick(category.slug)}
            disabled={isPending}
            semantics="toggle"
          />
        ))}
      </div>
    </div>
  );
}
