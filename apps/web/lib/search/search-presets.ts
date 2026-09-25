import { publicAssetUrl } from "@/lib/catalog/media";
import { selectCatalogMediaAsset } from "@/lib/catalog/media";
import { toQuickSheetPreset } from "@/lib/catalog/quick-sheet";
import type { SearchPreset } from "@/lib/search";
import type { PublicProductSummary } from "@/types/catalog";

/**
 * Build the palette's preset rows from catalog summaries — shared between the
 * app header (signed-in shell) and marketing surfaces (anonymous shell) so
 * both render identical search data.
 */
export function buildSearchPresets(
  featured: PublicProductSummary[],
  newest: PublicProductSummary[] = []
): SearchPreset[] {
  const newSlugs = new Set(newest.map((p) => p.slug));
  return featured.map((p, index) => {
    const asset = selectCatalogMediaAsset(p.public_assets, "card");
    const badge =
      p.featured_rank !== null && index < 5
        ? "trending"
        : newSlugs.has(p.slug)
          ? "new"
          : null;
    return {
      slug: p.slug,
      name: p.name,
      description: p.short_description,
      categoryName: p.category_name,
      categorySlug: p.category_slug,
      type: p.type,
      creditCost: p.credit_cost,
      thumbUrl: asset ? publicAssetUrl(asset.bucket, asset.storage_key) : null,
      badge,
      quickView: toQuickSheetPreset(p),
    };
  });
}
