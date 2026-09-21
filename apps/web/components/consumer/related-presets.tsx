import Link from "next/link";
import { ProductCard } from "./product-card";
import { getPublicProducts } from "@/lib/db/explore";
import type { PublicProductDetail } from "@/types/catalog";

interface RelatedPresetsProps {
  product: PublicProductDetail;
  isAuthenticated: boolean;
  favoriteIds: string[];
}

export async function RelatedPresets({
  product,
  isAuthenticated,
  favoriteIds,
}: RelatedPresetsProps) {
  const { data: related } = await getPublicProducts(
    product.type ?? undefined,
    product.category_slug ?? undefined
  );

  const filtered = related
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <section className="border-cream-100/10 mt-10 border-t pt-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-cream-50 text-lg font-semibold">
          More {product.category_name ?? product.type} presets
        </h2>
        <Link
          href={
            product.category_slug
              ? `/explore?category=${product.category_slug}`
              : "/explore"
          }
          className="text-lime-400 text-sm font-medium hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((relatedProduct, index) => (
          <ProductCard
            key={relatedProduct.id}
            product={relatedProduct}
            isAuthenticated={isAuthenticated}
            initialIsFavorite={favoriteIds.includes(relatedProduct.id)}
            returnPath={`/presets/${product.slug}`}
            priority={index < 2}
          />
        ))}
      </div>
    </section>
  );
}
