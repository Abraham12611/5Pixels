import Link from "next/link";
import { ProductMedia } from "./product-media";
import { FavoriteButton } from "./favorite-button";
import { selectCatalogMediaAsset } from "@/lib/catalog/media";
import type { PublicProductSummary } from "@/types/catalog";

interface ProductCardProps {
  product: PublicProductSummary;
  isAuthenticated: boolean;
  initialIsFavorite?: boolean;
  returnPath?: string;
  priority?: boolean;
}

export function ProductCard({
  product,
  isAuthenticated,
  initialIsFavorite = false,
  returnPath = `/explore`,
  priority = false,
}: ProductCardProps) {
  const mediaAsset = selectCatalogMediaAsset(product.public_assets, "card");

  return (
    <article className="group border-cream-100/10 bg-charcoal-850 relative flex flex-col overflow-hidden rounded-2xl border transition hover:border-lime-500/30 hover:shadow-lg">
      <Link
        href={`/presets/${product.slug}`}
        className="bg-charcoal-800 relative block aspect-[4/5] overflow-hidden"
        prefetch={false}
      >
        <ProductMedia
          asset={mediaAsset}
          alt={`Preview for ${product.name}`}
          className="transition duration-500 group-hover:scale-105"
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
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
