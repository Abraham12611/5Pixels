"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lightning } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/consumer/favorite-button";
import { ImageViewer } from "@/components/consumer/mobile/image-viewer";
import { useMediaQuery } from "@/lib/ui/use-media-query";
import { cn } from "@/lib/utils";
import type { QuickSheetPreset } from "@/lib/catalog/quick-sheet";

interface PresetQuickSheetProps {
  /** Null = closed. Parents keep the selected preset in state. */
  item: QuickSheetPreset | null;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  initialIsFavorite?: boolean;
  returnPath: string;
  /** Forwarded from the surface so a sheet toggle updates the grid below it. */
  onFavoriteToggled?: (productId: string, isFavorite: boolean) => void;
  /** Renders above a parent overlay (e.g. the search palette). */
  nested?: boolean;
}

/**
 * T2 content sheet for fast preset evaluation (25_MOBILE_WEB_POLISH/07 §2).
 * One implementation for every discovery surface — landing feed, explore
 * grid, related rail, favorites, search rows. The shared Sheet supplies the
 * dismissal contract: scrim tap, drag handle, Escape, and browser Back with
 * body-scroll restoration.
 */
export function PresetQuickSheet({
  item,
  onOpenChange,
  isAuthenticated,
  initialIsFavorite = false,
  returnPath,
  onFavoriteToggled,
  nested = false,
}: PresetQuickSheetProps) {
  return (
    <Sheet
      open={item !== null}
      onOpenChange={onOpenChange}
      tier="content"
      ariaLabel={item ? `${item.name} quick preview` : undefined}
      showClose
      nested={nested}
      bodyClassName="px-0"
      footer={item ? <SheetFooter item={item} /> : undefined}
    >
      {item ? (
        <QuickSheetBody
          key={item.id}
          item={item}
          isAuthenticated={isAuthenticated}
          initialIsFavorite={initialIsFavorite}
          returnPath={returnPath}
          onFavoriteToggled={onFavoriteToggled}
        />
      ) : null}
    </Sheet>
  );
}

function QuickSheetBody({
  item,
  isAuthenticated,
  initialIsFavorite,
  returnPath,
  onFavoriteToggled,
}: {
  item: QuickSheetPreset;
  isAuthenticated: boolean;
  initialIsFavorite: boolean;
  returnPath: string;
  onFavoriteToggled?: (productId: string, isFavorite: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <>
      {/* 4:5 media — video loops muted under the still poster */}
      <div className="bg-charcoal-800 relative aspect-[4/5] w-full overflow-hidden">
        {item.previewVideoUrl && !reducedMotion ? (
          <video
            src={item.previewVideoUrl}
            poster={item.previewUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            aria-label={`${item.name} preview`}
            className="h-full w-full object-cover"
          />
        ) : item.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- public Storage URL, sheet needs instant paint
          <img
            src={item.previewUrl}
            alt={`${item.name} preview`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="bg-charcoal-700 h-full w-full" aria-hidden />
        )}
        <div className="absolute top-3 right-3">
          <FavoriteButton
            productId={item.id}
            initialIsFavorite={initialIsFavorite}
            isAuthenticated={isAuthenticated}
            returnPath={returnPath}
            preset={{ name: item.name, thumbUrl: item.previewUrl }}
            onToggled={(fav) => onFavoriteToggled?.(item.id, fav)}
          />
        </div>
      </div>

      <div className="space-y-5 px-5 pt-5">
        {/* Name + meta chips */}
        <div>
          <h3 className="text-cream-50 text-xl font-semibold">{item.name}</h3>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Chip>{item.type === "poster" ? "Poster" : "Filter"}</Chip>
            {item.categoryName ? <Chip>{item.categoryName}</Chip> : null}
            <Chip>
              <Lightning size={11} weight="fill" className="text-lime-400" />
              {item.creditCost} {item.creditCost === 1 ? "credit" : "credits"}
            </Chip>
          </div>
        </div>

        {item.shortDescription ? (
          <p className="text-text-secondary text-sm leading-relaxed">
            <span className={cn(!expanded && "line-clamp-2")}>
              {item.shortDescription}
            </span>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-1.5 font-medium text-lime-300 transition-colors hover:text-lime-200"
            >
              {expanded ? "Less" : "More"}
            </button>
          </p>
        ) : null}

        {/* Examples → nested viewer */}
        {item.exampleUrls.length > 0 ? (
          <div>
            <p className="text-text-muted mb-2 text-[11px] font-semibold tracking-wider uppercase">
              Examples
            </p>
            <div className="grid grid-cols-3 gap-2">
              {item.exampleUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setViewerIndex(index)}
                  aria-label={`View example ${index + 1} for ${item.name}`}
                  className="bg-charcoal-800 focus-visible:ring-offset-charcoal-850 relative aspect-square overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-lime-500/70 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- public Storage thumbs don't need next/image */}
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <ImageViewer
        open={viewerIndex !== null}
        onOpenChange={(open) => {
          if (!open) setViewerIndex(null);
        }}
        src={item.exampleUrls[viewerIndex ?? 0] ?? ""}
        alt={`${item.name} example ${(viewerIndex ?? 0) + 1}`}
        caption={`Example ${(viewerIndex ?? 0) + 1} of ${item.exampleUrls.length}`}
        nested
      />
    </>
  );
}

function SheetFooter({ item }: { item: QuickSheetPreset }) {
  if (!item.available) {
    return (
      <div className="space-y-2">
        <p className="text-text-secondary text-center text-xs">
          This look isn&apos;t available right now.
        </p>
        <Button asChild className="w-full">
          <Link
            href={
              item.categorySlug
                ? `/explore?category=${item.categorySlug}`
                : "/explore"
            }
          >
            Find a similar look
            <ArrowRight className="ml-1.5 h-4 w-4" weight="bold" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button asChild className="w-full">
        <Link href={`/app/create/${item.slug}`}>
          <Lightning className="mr-1.5 h-4 w-4" weight="fill" />
          Use this look
        </Link>
      </Button>
      <Link
        href={`/presets/${item.slug}`}
        className="text-text-secondary hover:text-cream-50 flex items-center justify-center gap-1 py-1 text-[13px] font-medium transition-colors"
      >
        View full details
        <ArrowRight className="h-3.5 w-3.5" weight="bold" />
      </Link>
      <p className="text-text-muted text-center text-[11px]">
        No account needed until you generate.
      </p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-charcoal-800 text-text-secondary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium">
      {children}
    </span>
  );
}
