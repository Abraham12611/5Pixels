"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FilterChip } from "@/components/ui/filter-chip";
import { Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { MobileSection } from "@/components/consumer/mobile/mobile-section";
import {
  MobileRail,
  MobileRailMoreCard,
} from "@/components/consumer/mobile/mobile-rail";
import { useLandingQuickView } from "./landing-quick-view";
import type { LandingFeedItem } from "./landing-feed-types";

const TRENDING_COUNT = 6;

interface MobileFeedProps {
  items: LandingFeedItem[];
  categories: { slug: string; name: string }[];
}

/**
 * Mobile preset feed — the leader-style tappable grid (05 §2.3–§2.4). Chips
 * filter in place and stick beneath the header once the hero scrolls out;
 * every card opens the shared quick sheet via `LandingQuickViewHost`.
 */
export function MobileFeed({ items, categories }: MobileFeedProps) {
  const [chip, setChip] = useState<string>("all");
  const openItem = useLandingQuickView();

  const trending = items.slice(0, TRENDING_COUNT);
  const filtered = useMemo(
    () =>
      chip === "all" ? items : items.filter((i) => i.categorySlug === chip),
    [items, chip]
  );

  const usedCategories = categories.filter((c) =>
    items.some((i) => i.categorySlug === c.slug)
  );

  const activeCategoryName =
    chip === "all"
      ? "All looks"
      : (usedCategories.find((c) => c.slug === chip)?.name ?? "Looks");

  return (
    <>
      {/* Sticky chips row — pins beneath the header past the hero (05 §2.3) */}
      <div className="border-cream-100/5 bg-ink-950/90 sticky top-16 z-20 border-b backdrop-blur-md">
        <div
          role="tablist"
          aria-label="Filter looks"
          className="scrollbar-none flex gap-2 overflow-x-auto px-5 py-2.5"
        >
          <FilterChip
            label="All"
            active={chip === "all"}
            onClick={() => setChip("all")}
          />
          {usedCategories.map((c) => (
            <FilterChip
              key={c.slug}
              label={c.name}
              active={chip === c.slug}
              onClick={() => setChip(c.slug)}
            />
          ))}
        </div>
      </div>

      {/* Trending rail */}
      {chip === "all" && trending.length > 0 && (
        <MobileSection title="Trending" seeAllHref="/explore" bleed>
          <MobileRail label="Trending looks" itemClassName="w-[156px]">
            {trending.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem?.(item)}
                aria-label={`${item.name}, ${item.type}${
                  item.creditCost
                    ? `, ${item.creditCost} ${item.creditCost === 1 ? "credit" : "credits"}`
                    : ""
                }`}
                className="media-frame relative aspect-[4/5] w-full overflow-hidden rounded-xl text-left"
              >
                {item.thumbUrl ? (
                  <Image
                    src={item.thumbUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="bg-charcoal-800 absolute inset-0 flex items-center justify-center">
                    <Sparkle
                      size={28}
                      weight="fill"
                      className="text-lime-400"
                    />
                  </span>
                )}
                <span className="from-ink-950/90 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-2.5 pt-8">
                  <span className="font-display text-cream-50 block truncate text-sm">
                    {item.name}
                  </span>
                  {item.categoryName && (
                    <span className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                      {item.categoryName}
                    </span>
                  )}
                </span>
              </button>
            ))}
            <MobileRailMoreCard href="/explore" />
          </MobileRail>
        </MobileSection>
      )}

      {/* Masonry feed */}
      <MobileSection title={activeCategoryName} seeAllHref="/explore">
        <div className="columns-2 gap-3 [column-fill:_balance]">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem?.(item)}
              className="media-frame group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl text-left"
            >
              <span
                className={cn(
                  "relative block w-full",
                  i % 3 === 0
                    ? "aspect-[3/4]"
                    : i % 3 === 1
                      ? "aspect-[4/5]"
                      : "aspect-square"
                )}
              >
                {item.thumbUrl ? (
                  <Image
                    src={item.thumbUrl}
                    alt={`${item.name} preset`}
                    fill
                    className="object-cover transition-transform duration-300 group-active:scale-[1.03]"
                    unoptimized
                  />
                ) : (
                  <span className="bg-charcoal-800 absolute inset-0 flex items-center justify-center">
                    <Sparkle
                      size={28}
                      weight="fill"
                      className="text-lime-400"
                    />
                  </span>
                )}
              </span>
              <span className="from-ink-950/95 via-ink-950/40 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-2.5 pt-10">
                <span className="text-cream-50 block truncate text-[13px] font-bold tracking-wide uppercase">
                  {item.name}
                </span>
                <span className="text-cream-100/60 text-[10px] font-medium tracking-wider uppercase">
                  {item.categoryName ?? "Preset"}
                </span>
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-text-muted py-10 text-center text-sm">
            No looks in this category yet — check back soon.
          </p>
        )}
      </MobileSection>
    </>
  );
}
