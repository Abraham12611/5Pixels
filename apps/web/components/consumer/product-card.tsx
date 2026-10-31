"use client";

import { useState } from "react";
import Link from "next/link";
import { HoverPreviewMedia } from "./hover-preview-media";
import { FavoriteButton } from "./favorite-button";
import { usePresetQuickView } from "./preset-quick-view";
import { BADGE_LABELS, productBadges } from "@/lib/catalog/badges";
import {
  isImageMimeType,
  isVideoMimeType,
  resolveProductAspectRatio,
} from "@/lib/catalog/media";
import { Lightning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { PublicProductAsset, PublicProductSummary } from "@/types/catalog";

interface ProductCardProps {
  product: PublicProductSummary;
  isAuthenticated: boolean;
  initialIsFavorite?: boolean;
  returnPath?: string;
  priority?: boolean;
  /** grid = masonry cell; rail = fixed-width horizontal-scroll card. */
  variant?: "grid" | "rail";
  /** Called after the server confirms a favorite toggle. */
  onFavoriteChange?: (productId: string, isFavorite: boolean) => void;
}

function stillAsset(assets: PublicProductAsset[]): PublicProductAsset | null {
  return (
    assets.find((a) => a.role === "poster" && isImageMimeType(a.mime_type)) ??
    assets.find((a) => a.role === "hero" && isImageMimeType(a.mime_type)) ??
    assets.find(
      (a) => isImageMimeType(a.mime_type) && a.mime_type !== "image/gif"
    ) ??
    assets.find((a) => isImageMimeType(a.mime_type)) ??
    null
  );
}

function videoAsset(assets: PublicProductAsset[]): PublicProductAsset | null {
  return (
    assets.find(
      (a) => a.role === "preview_video" && isVideoMimeType(a.mime_type)
    ) ?? null
  );
}

export function ProductCard({
  product,
  isAuthenticated,
  initialIsFavorite = false,
  returnPath = `/explore`,
  priority = false,
  variant = "grid",
  onFavoriteChange,
}: ProductCardProps) {
  const still = stillAsset(product.public_assets);
  const video = videoAsset(product.public_assets);
  const initialAspect = resolveProductAspectRatio(product, still ?? video);
  const [naturalAspect, setNaturalAspect] = useState<string | null>(null);
  const aspect = naturalAspect ?? initialAspect;

  const badges = productBadges(product);
  const detailHref = `/presets/${product.slug}`;
  const createHref = `/app/create/${product.slug}`;
  const openQuickView = usePresetQuickView();

  return (
    <article
      data-explore-card="true"
      style={{ aspectRatio: aspect }}
      className={cn(
        "group/explore-card bg-charcoal-850 relative isolate min-w-0 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/8 transition-[box-shadow,transform] hover:ring-white/20",
        variant === "rail" ? "w-44 sm:w-52" : "w-full break-inside-avoid"
      )}
    >
      {/* Full-bleed media — adapts to the hero/poster's natural aspect ratio */}
      <div className="bg-charcoal-800 absolute inset-0 overflow-hidden">
        <HoverPreviewMedia
          still={still}
          video={video}
          alt={`Preview for ${product.name}`}
          priority={priority}
          onNaturalRatio={setNaturalAspect}
          sizes={
            variant === "rail"
              ? "(max-width: 640px) 44vw, 208px"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          }
        />

        {/* Top-to-bottom subtle ambient shade on hover + permanent bottom readability scrim */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75 opacity-80 transition-opacity duration-200 group-hover/explore-card:opacity-100 group-focus-within/explore-card:opacity-100"
        />

        {/* Top row: mode/category chip + badges on left, favorite button on right */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-20 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                  badge === "new"
                    ? "text-ink-950 bg-[#D1FE17]"
                    : "bg-ink-950/70 text-cream-50 backdrop-blur-sm"
                )}
              >
                {BADGE_LABELS[badge]}
              </span>
            ))}
            {product.category_name && variant === "grid" && (
              <span
                data-explore-mode-chip="true"
                className="text-cream-50/90 truncate rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-medium drop-shadow-sm backdrop-blur-md transition-opacity md:opacity-0 md:group-focus-within/explore-card:opacity-100 md:group-hover/explore-card:opacity-100"
              >
                {product.category_name}
              </span>
            )}
          </div>
          <span className="pointer-events-auto shrink-0">
            <FavoriteButton
              productId={product.id}
              initialIsFavorite={initialIsFavorite}
              isAuthenticated={isAuthenticated}
              returnPath={returnPath}
              compact
              onToggled={(fav) => onFavoriteChange?.(product.id, fav)}
            />
          </span>
        </div>

        {/* Bottom overlay: preset title on left + Higgsfield-style Recreate/Try pill on right */}
        <div
          data-explore-card-actions="true"
          className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex min-w-0 items-end justify-between gap-2"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-cream-50 truncate text-xs font-semibold drop-shadow-sm sm:text-sm">
              {product.name}
            </h3>
            {variant === "grid" && product.short_description && (
              <p className="sr-only">{product.short_description}</p>
            )}
          </div>
          <Link
            href={createHref}
            prefetch={false}
            className="text-ink-950 pointer-events-auto inline-flex shrink-0 translate-y-1 items-center gap-1 rounded-lg bg-[#D1FE17] px-2.5 py-1.5 text-xs font-semibold opacity-0 shadow-lg transition-[transform,opacity,background-color] duration-200 group-focus-within/explore-card:translate-y-0 group-focus-within/explore-card:opacity-100 group-hover/explore-card:translate-y-0 group-hover/explore-card:opacity-100 hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 max-md:hidden"
          >
            <Lightning size={13} weight="fill" />
            Try this look
          </Link>
        </div>
      </div>

      {/* Stretched link — single link covering the card */}
      <Link
        href={detailHref}
        prefetch={false}
        className="absolute inset-0 z-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60 focus-visible:ring-inset"
      >
        <span className="sr-only">View {product.name}</span>
      </Link>

      {/* Mobile quick view — sits above the link on touch widths so a card
          tap previews the preset; the heart (z-20) stays on top. */}
      {openQuickView ? (
        <button
          type="button"
          onClick={() => openQuickView(product)}
          aria-label={`Preview ${product.name}`}
          className="absolute inset-0 z-[15] rounded-xl md:hidden"
        />
      ) : null}
    </article>
  );
}
