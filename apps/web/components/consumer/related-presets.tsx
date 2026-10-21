import { RelatedPresetsSection } from "./related-presets-section";
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

  return (
    <RelatedPresetsSection
      related={related}
      anchor={product}
      isAuthenticated={isAuthenticated}
      favoriteIds={favoriteIds}
      variant={variant}
    />
  );
}
