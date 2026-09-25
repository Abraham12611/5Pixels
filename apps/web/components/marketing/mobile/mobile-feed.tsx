"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { PresetQuickSheet } from "@/components/consumer/preset-quick-sheet";
import { recordRecentPreset } from "@/lib/search/recents";
import type { LandingFeedItem } from "./landing-feed-types";

interface MobileFeedProps {
  items: LandingFeedItem[];
  categories: { slug: string; name: string }[];
}

/**
 * Mobile preset feed — the leader-style tappable grid. Chips filter by
 * category; every card opens the quick-view sheet (no navigation, no auth).
 */
export function MobileFeed({ items, categories }: MobileFeedProps) {
  const [chip, setChip] = useState<string>("all");
  const [selected, setSelected] = useState<LandingFeedItem | null>(null);

  const openItem = (item: LandingFeedItem) => {
    recordRecentPreset({
      slug: item.slug,
      name: item.name,
      thumbUrl: item.previewUrl,
    });
    setSelected(item);
  };

  const trending = items.slice(0, 3);
  const filtered = useMemo(
    () =>
      chip === "all" ? items : items.filter((i) => i.categorySlug === chip),
    [items, chip]
  );

  const usedCategories = categories.filter((c) =>
    items.some((i) => i.categorySlug === c.slug)
  );

  return (
    <>
      {/* Filter chips */}
      <div
        role="tablist"
        aria-label="Filter looks"
        className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4"
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

      {/* Trending rail */}
      {chip === "all" && trending.length > 0 && (
        <section aria-label="Trending" className="mt-7">
          <h2 className="px-4 text-xs font-bold tracking-[0.18em] text-lime-400 uppercase">
            Trending
          </h2>
          <div className="-mx-4 mt-3 flex scrollbar-none gap-3 overflow-x-auto px-4">
            {trending.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className="media-frame relative aspect-[3/4] w-44 shrink-0 overflow-hidden rounded-xl text-left"
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
          </div>
        </section>
      )}

      {/* Masonry feed */}
      <section aria-label="All looks" className="mt-7">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-xs font-bold tracking-[0.18em] text-lime-400 uppercase">
            {chip === "all"
              ? "All looks"
              : usedCategories.find((c) => c.slug === chip)?.name}
          </h2>
          <Link
            href="/explore"
            className="text-text-muted flex items-center gap-1 text-[11px] font-medium"
          >
            Browse all
            <ArrowUpRight size={11} weight="bold" />
          </Link>
        </div>

        <div className="mt-3 columns-2 gap-3 [column-fill:_balance]">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
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
          <p className="text-text-muted px-4 py-10 text-center text-sm">
            No looks in this category yet — check back soon.
          </p>
        )}
      </section>

      <PresetQuickSheet
        item={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        isAuthenticated={false}
        returnPath="/"
      />
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "text-ink-950 bg-lime-400"
          : "bg-charcoal-800 text-text-secondary hover:text-cream-50"
      )}
    >
      {label}
    </button>
  );
}
