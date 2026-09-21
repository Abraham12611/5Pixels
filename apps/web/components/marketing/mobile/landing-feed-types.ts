import type { PublicProductSummary } from "@/types/catalog";
import { selectCatalogMediaAsset } from "@/lib/catalog/media";

export interface LandingFeedItem {
  id: string;
  slug: string;
  name: string;
  type: string;
  shortDescription: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  creditCost: number;
  thumbUrl: string | null;
  exampleUrls: string[];
}

function publicAssetUrl(bucket: string, storageKey: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${storageKey}`;
}

export function toFeedItem(p: PublicProductSummary): LandingFeedItem {
  const card = selectCatalogMediaAsset(p.public_assets, "card");
  const examples = p.public_assets
    .filter((a) => a.role !== "poster")
    .slice(0, 3)
    .map((a) => publicAssetUrl(a.bucket, a.storage_key));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    shortDescription: p.short_description,
    categoryName: p.category_name,
    categorySlug: p.category_slug,
    creditCost: p.credit_cost,
    thumbUrl: card ? publicAssetUrl(card.bucket, card.storage_key) : null,
    exampleUrls: examples,
  };
}
