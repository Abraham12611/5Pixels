"use client";

import Link from "next/link";
import { ProductMedia } from "./product-media";
import { FavoriteButton } from "./favorite-button";
import { selectCatalogMediaAsset } from "@/lib/catalog/media";
import { Lightning } from "@phosphor-icons/react";
import type { PublicProductSummary } from "@/types/catalog";

interface ProductCardProps {
  product: PublicProductSummary;
  isAuthenticated: boolean;
  initialIsFavorite?: boolean;
  returnPath?: string;
  priority?: boolean;
}

function cardAspect(mediaAsset: {
  width?: number | null;
  height?: number | null;
} | null): string | undefined {
  const w = mediaAsset?.width;
  const h = mediaAsset?.height;
  if (!w || !h || w <= 0 || h <= 0) return undefined;
  return `${w} / ${h}`;
}

export function ProductCard({
  product,
  isAuthenticated,
  initialIsFavorite = false,
  returnPath = `/explore`,
  priority = false,
}: ProductCardProps) {
  const mediaAsset = selectCatalogMediaAsset(product.public_assets, "card");
  const aspect = cardAspect(mediaAsset);

  return (
    <article className="group border-cream-100/10 bg-charcoal-850 relative flex flex-col overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-0.5 hover:border-lime-500/40 hover:shadow-[0_12px_40px_-12px_rgba(130,234,58,0.15)]">
      <Link
        href={`/presets/${product.slug}`}
        className="bg-charcoal-800 relative block overflow-hidden"
        style={aspect ? { aspectRatio: aspect } : undefined}
        prefetch={false}
      >
        <div className={aspect ? "relative h-full w-full" : "relative aspect-[4/5] w-full"}>
          <ProductMedia
            asset={mediaAsset}
            alt={`Preview for ${product.name}`}
            className="transition duration-500 group-hover:scale-[1.03]"
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        <div className="from-ink-950/60 absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b to-transparent p-3">
          {product.category_name ? (
            <span className="bg-ink-950/70 text-cream-50 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              {product.category_name}
            </span>
          ) : (
            <span />
          )}
          <FavoriteButton
            productId={product.id}
            initialIsFavorite={initialIsFavorite}
            isAuthenticated={isAuthenticated}
            returnPath={returnPath}
            compact
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 opacity-0 transition duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
          <Link
            href={`/app/create/${product.slug}`}
            prefetch={false}
            className="bg-lime-400 text-ink-950 pointer-events-auto inline-flex translate-y-2 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition duration-200 group-hover:translate-y-0 hover:bg-lime-300 focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
          >
            <Lightning size={15} weight="fill" />
            Generate
            {product.credit_cost ? (
              <span className="text-ink-950/70 text-xs font-medium">
                ·{product.credit_cost} cr
              </span>
            ) : null}
          </Link>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-cream-50 font-semibold">
              <Link
                href={`/presets/${product.slug}`}
                className="hover:text-lime-400 focus:outline-none"
                prefetch={false}
              >
                {product.name}
              </Link>
            </h3>
            <span className="bg-charcoal-700 text-cream-100 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
              {product.credit_cost || "Free"}
              {product.credit_cost ? " cr" : ""}
            </span>
          </div>
          <p className="text-text-secondary mt-1 line-clamp-2 text-sm">
            {product.short_description}
          </p>
        </div>
        <div className="text-text-muted mt-3 flex items-center gap-2 text-xs">
          <span className="capitalize">{product.type}</span>
          {product.version_number ? (
            <>
              <span aria-hidden>·</span>
              <span>v{product.version_number}</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
