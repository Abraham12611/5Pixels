"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import { LibraryGrid, type LibraryItem } from "@/components/consumer/library-grid";
import { FavoritesGrid } from "@/components/consumer/favorites-grid";
import { RunsList, type LibraryRun } from "@/components/consumer/runs-list";
import { ProductCard } from "@/components/consumer/product-card";
import { PresetQuickViewHost } from "@/components/consumer/preset-quick-view";
import { isFailureStatus } from "@/lib/generation/stages";
import { cn } from "@/lib/utils";
import type { FavoriteProduct, PublicProductSummary } from "@/types/catalog";

export type LibrarySegment = "results" | "presets" | "runs";

const SEGMENTS: { value: LibrarySegment; label: string }[] = [
  { value: "results", label: "Results" },
  { value: "presets", label: "Presets" },
  { value: "runs", label: "Runs" },
];

export function parseLibrarySegment(tab: string | null): LibrarySegment {
  return tab === "presets" || tab === "runs" ? tab : "results";
}

export interface ActiveRun {
  id: string;
  productName: string;
  status: string;
  thumb: string | null;
}

function runStatusChip(status: string): { label: string; className: string } {
  if (isFailureStatus(status)) {
    return { label: "Failed", className: "bg-error/15 text-error" };
  }
  return { label: "In progress", className: "bg-cream-100/10 text-cream-100" };
}

function InProgressRail({ runs }: { runs: ActiveRun[] }) {
  return (
    <section className="mb-8" aria-label="In progress">
      <h2 className="text-text-secondary mb-3 text-sm font-medium">
        In progress
      </h2>
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {runs.map((gen) => {
          const chip = runStatusChip(gen.status);
          return (
            <Link
              key={gen.id}
              href={`/app/generations/${gen.id}`}
              className="group shadow-border hover:shadow-border-hover w-36 shrink-0 snap-start overflow-hidden rounded-xl bg-charcoal-850 transition-colors sm:w-40"
            >
              <span className="bg-charcoal-800 media-frame relative block aspect-[4/5]">
                {gen.thumb ? (
                  <Image
                    src={gen.thumb}
                    alt=""
                    fill
                    unoptimized
                    sizes="160px"
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="bg-charcoal-700 h-8 w-8 animate-pulse rounded-md" />
                  </span>
                )}
              </span>
              <span className="block p-2.5">
                <span className="text-cream-50 block truncate text-xs font-medium">
                  {gen.productName}
                </span>
                <span
                  className={cn(
                    "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    chip.className
                  )}
                >
                  {chip.label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function GhostCards() {
  const aspects = ["4 / 5", "1 / 1", "4 / 3", "3 / 4"];
  return (
    <div
      aria-hidden
      className="columns-2 gap-5 opacity-60 md:columns-4 [&>*]:mb-5 [&>*]:break-inside-avoid"
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

function PresetsPanel({
  favorites,
  suggestions,
}: {
  favorites: FavoriteProduct[];
  suggestions: PublicProductSummary[];
}) {
  if (favorites.length > 0) {
    return <FavoritesGrid favorites={favorites} />;
  }

  return (
    <PresetQuickViewHost isAuthenticated returnPath="/app/library?tab=presets">
      <div className="relative">
        <GhostCards />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <FivePixelMark className="mb-4 opacity-70" />
          <h2 className="text-cream-50 text-lg font-semibold">
            Looks you save appear here.
          </h2>
          <p className="text-text-secondary mt-1.5 max-w-sm text-sm">
            Tap the heart on any preset and it will wait for you here.
          </p>
          <Button asChild className="mt-5">
            <Link href="/explore">Browse looks</Link>
          </Button>
        </div>
      </div>
      {suggestions.length > 0 && (
        <section aria-label="Suggested looks" className="mt-10">
          <h2 className="text-text-secondary mb-3 text-sm font-medium">
            Start with these
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {suggestions.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated
                returnPath="/app/library?tab=presets"
              />
            ))}
          </div>
        </section>
      )}
    </PresetQuickViewHost>
  );
}

interface LibrarySegmentsProps {
  initialTab: LibrarySegment;
  results: LibraryItem[];
  activeRuns: ActiveRun[];
  favorites: FavoriteProduct[];
  suggestions: PublicProductSummary[];
  runs: LibraryRun[];
}

/**
 * One Library, three segments (`11 §3`): Results (owned outputs + in-progress
 * rail), Presets (saved looks), Runs (every generation incl. failures). The
 * active segment lives in `?tab=` so deep links and shared URLs restore it.
 */
export function LibrarySegments({
  initialTab,
  results,
  activeRuns,
  favorites,
  suggestions,
  runs,
}: LibrarySegmentsProps) {
  const [segment, setSegmentState] = useState<LibrarySegment>(initialTab);

  // history.replaceState, not router.replace — a soft navigation would refetch
  // the page and re-sign every asset URL on each segment switch.
  const setSegment = (value: string) => {
    const next = parseLibrarySegment(value);
    setSegmentState(next);
    const href =
      next === "results" ? "/app/library" : `/app/library?tab=${next}`;
    window.history.replaceState(null, "", href);
  };

  return (
    <Tabs value={segment} onValueChange={setSegment}>
      <div className="bg-ink-950 sticky top-14 z-30 -mx-4 px-4 pb-4 sm:-mx-6 sm:px-6">
        <TabsList
          aria-label="Library sections"
          className="bg-charcoal-850 shadow-border grid h-11 w-full grid-cols-3 rounded-full p-1"
        >
          {SEGMENTS.map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "text-text-secondary h-full rounded-full text-sm font-medium",
                "data-[state=active]:bg-charcoal-700 data-[state=active]:text-cream-50"
              )}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="results">
        {activeRuns.length > 0 && <InProgressRail runs={activeRuns} />}
        <LibraryGrid items={results} />
      </TabsContent>

      <TabsContent value="presets">
        <PresetsPanel favorites={favorites} suggestions={suggestions} />
      </TabsContent>

      <TabsContent value="runs">
        <RunsList runs={runs} />
      </TabsContent>
    </Tabs>
  );
}
