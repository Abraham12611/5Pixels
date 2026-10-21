import Link from "next/link";
import { ProductCard } from "./product-card";
import { PresetQuickViewHost } from "./preset-quick-view";
import { MobileSection } from "./mobile/mobile-section";
import { MobileRail } from "./mobile/mobile-rail";
import type {
  PublicProductDetail,
  PublicProductSummary,
} from "@/types/catalog";

type RelatedAnchor = Pick<
  PublicProductDetail,
  "id" | "slug" | "type" | "category_name" | "category_slug"
>;

interface RelatedPresetsSectionProps {
  /** Resolved related products — the anchor itself is filtered out here. */
  related: PublicProductSummary[];
  /** The preset the rail anchors to — supplies title, see-all, returnPath. */
  anchor: RelatedAnchor;
  isAuthenticated: boolean;
  favoriteIds: string[];
  /** grid (default, desktop) or rail (mobile composition, spec 07 §3). */
  variant?: "grid" | "rail";
}

/**
 * Presentational related-presets rail. Server-import-free on purpose so
 * `PresetLightbox` can re-render it client-side during a variant swap with
 * already-fetched data. `RelatedPresets` remains the async fetch wrapper.
 */
export function RelatedPresetsSection({
  related,
  anchor,
  isAuthenticated,
  favoriteIds,
  variant = "grid",
}: RelatedPresetsSectionProps) {
  const filtered = related.filter((p) => p.id !== anchor.id).slice(0, 6);

  if (filtered.length === 0) {
    return null;
  }

  const seeAllHref = anchor.category_slug
    ? `/explore?category=${anchor.category_slug}`
    : "/explore";
  const returnPath = `/presets/${anchor.slug}`;

  const cards = filtered.map((relatedProduct, index) => (
    <ProductCard
      key={relatedProduct.id}
      product={relatedProduct}
      isAuthenticated={isAuthenticated}
      initialIsFavorite={favoriteIds.includes(relatedProduct.id)}
      returnPath={returnPath}
      variant={variant === "rail" ? "rail" : "grid"}
      priority={index < 2}
    />
  ));

  const title = `More ${anchor.category_name ?? anchor.type} presets`;

  return (
    <PresetQuickViewHost
      isAuthenticated={isAuthenticated}
      favoriteIds={favoriteIds}
      returnPath={returnPath}
    >
      {variant === "rail" ? (
        <MobileSection
          title={title}
          seeAllHref={seeAllHref}
          seeAllLabel="View all"
          bleed
        >
          <MobileRail label={title} itemClassName="w-44 sm:w-52">
            {cards}
          </MobileRail>
        </MobileSection>
      ) : (
        <section className="border-cream-100/10 mt-10 border-t pt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-cream-50 text-lg font-semibold">{title}</h2>
            <Link
              href={seeAllHref}
              className="text-sm font-medium text-lime-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cards}
          </div>
        </section>
      )}
    </PresetQuickViewHost>
  );
}
