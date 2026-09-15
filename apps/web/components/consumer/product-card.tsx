"use client";

import Link from "next/link";
import { HoverPreviewMedia } from "./hover-preview-media";
import { FavoriteButton } from "./favorite-button";
import { BADGE_LABELS, productBadges } from "@/lib/catalog/badges";
import { isImageMimeType, isVideoMimeType } from "@/lib/catalog/media";
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
}

function stillAsset(assets: PublicProductAsset[]): PublicProductAsset | null {
  return (
    assets.find(
      (a) => a.role === "poster" && isImageMimeType(a.mime_type)
    ) ??
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

function cardAspect(asset: PublicProductAsset | null): string | undefined {
  const w = asset?.width;
  const h = asset?.height;
  if (!w || !h || w <= 0 || h <= 0) return undefined;
  return `${w} / ${h}`;
}

export function ProductCard({
  product,
  isAuthenticated,
  initialIsFavorite = false,
  returnPath = `/explore`,
  priority = false,
  variant = "grid",
}: ProductCardProps) {
  const still = stillAsset(product.public_assets);
  const video = videoAsset(product.public_assets);
  const aspect = cardAspect(still);
  const badges = productBadges(product);
  const detailHref = `/presets/${product.slug}`;
  const createHref = `/app/create/${product.slug}`;

  return (
    <article
      className={cn(
        "group shadow-border hover:shadow-border-hover relative flex flex-col overflow-hidden rounded-xl bg-charcoal-850 transition-shadow",
        variant === "rail" && "w-44 shrink-0 sm:w-52"
      )}
    >
      {/* Media — whole surface links to preset detail */}
      <div
        className="bg-charcoal-800 relative overflow-hidden"
        style={{ aspectRatio: aspect ?? "4 / 5" }}
      >
        <HoverPreviewMedia
          still={still}
          video={video}
          alt={`Preview for ${product.name}`}
          priority={priority}
          sizes={
            variant === "rail"
              ? "(max-width: 640px) 44vw, 208px"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          }
        />

        {/* Badges + favorite */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2.5">
          <span className="flex flex-col items-start gap-1">
            {badges.map((badge) => (
              <span
                key={badge}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                  badge === "new"
                    ? "bg-lime-400 text-ink-950"
                    : "bg-ink-950/70 text-cream-50 backdrop-blur-sm"
                )}
              >
                {BADGE_LABELS[badge]}
              </span>
            ))}
          </span>
          <span className="pointer-events-auto">
            <FavoriteButton
              productId={product.id}
              initialIsFavorite={initialIsFavorite}
              isAuthenticated={isAuthenticated}
              returnPath={returnPath}
              compact
            />
          </span>
        </div>

        {/* Credit chip — authenticated surfaces only */}
        {isAuthenticated && (
          <span className="bg-ink-950/70 text-cream-50 absolute bottom-2.5 right-2.5 z-20 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur-sm">
            {product.credit_cost
              ? `${product.credit_cost} ${
                  product.credit_cost === 1 ? "credit" : "credits"
                }`
              : "Free"}
          </span>
        )}

        {/* Hover/focus action */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
          <Link
            href={createHref}
            prefetch={false}
            className="bg-lime-400 text-ink-950 pointer-events-auto inline-flex translate-y-1.5 items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold shadow-lg transition-[transform,background-color] duration-200 hover:bg-lime-300 group-focus-within:translate-y-0 group-hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
          >
            <Lightning size={14} weight="fill" />
            Try this look
          </Link>
        </div>
      </div>

      {/* Stretched link — single link covering the card */}
      <Link
        href={detailHref}
        prefetch={false}
        className="focus-visible:ring-lime-500/60 absolute inset-0 z-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset"
      >
        <span className="sr-only">View {product.name}</span>
      </Link>

      {/* Meta */}
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-cream-50 min-w-0 truncate text-sm font-semibold">
            {product.name}
          </h3>
          {product.category_name && variant === "grid" && (
            <span className="text-text-muted shrink-0 text-[11px]">
              {product.category_name}
            </span>
          )}
        </div>
        {variant === "grid" && product.short_description && (
          <p className="text-text-secondary mt-1 line-clamp-2 text-[13px]">
            {product.short_description}
          </p>
        )}
      </div>
    </article>
  );
}
