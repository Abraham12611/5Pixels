import Link from "next/link";
import { ProductCard } from "./product-card";
import { PresetQuickViewHost } from "./preset-quick-view";
import { MobileSection } from "./mobile/mobile-section";
import { MobileRail } from "./mobile/mobile-rail";
import { getPublicProducts } from "@/lib/db/explore";
import type { PublicProductDetail } from "@/types/catalog";

interface RelatedPresetsProps {
  product: PublicProductDetail;
  isAuthenticated: boolean;
  favoriteIds: string[];
  /** grid (default, desktop) or rail (mobile composition, spec 07 §3). */
  variant?: "grid" | "rail";
}

export async function RelatedPresets({
  product,
  isAuthenticated,
  favoriteIds,
  variant = "grid",
}: RelatedPresetsProps) {
  const { data: related } = await getPublicProducts(
    product.type ?? undefined,
    product.category_slug ?? undefined
  );

  const filtered = related.filter((p) => p.id !== product.id).slice(0, 6);

  if (filtered.length === 0) {
    return null;
  }

  const seeAllHref = product.category_slug
    ? `/explore?category=${product.category_slug}`
    : "/explore";

  const cards = filtered.map((relatedProduct, index) => (
    <ProductCard
      key={relatedProduct.id}
      product={relatedProduct}
      isAuthenticated={isAuthenticated}
      initialIsFavorite={favoriteIds.includes(relatedProduct.id)}
      returnPath={`/presets/${product.slug}`}
      variant={variant === "rail" ? "rail" : "grid"}
      priority={index < 2}
    />
  ));

  const title = `More ${product.category_name ?? product.type} presets`;

  return (
    <PresetQuickViewHost
      isAuthenticated={isAuthenticated}
      favoriteIds={favoriteIds}
      returnPath={`/presets/${product.slug}`}
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
