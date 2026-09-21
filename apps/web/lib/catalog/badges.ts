import type { PublicProductSummary } from "@/types/catalog";

export type ProductBadge = "new" | "trending";

/** A preset counts as NEW for two weeks after it goes live. */
export const NEW_BADGE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export const BADGE_LABELS: Record<ProductBadge, string> = {
  new: "New",
  trending: "Trending",
};

/**
 * Canonical card badges. TRENDING comes from an explicit featured_rank; NEW
 * comes from created_at. A product can carry both; order is NEW then TRENDING.
 */
export function productBadges(
  product: Pick<PublicProductSummary, "featured_rank" | "created_at">,
  now: number = Date.now()
): ProductBadge[] {
  const badges: ProductBadge[] = [];

  if (product.created_at) {
    const age = now - new Date(product.created_at).getTime();
    if (age >= 0 && age <= NEW_BADGE_WINDOW_MS) badges.push("new");
  }

  if (product.featured_rank != null) badges.push("trending");

  return badges;
}

/**
 * Consumer-language fidelity label from the product's likeness_level.
 * Returns null when unset — surfaces should simply omit the chip.
 */
export function fidelityLabel(
  likenessLevel: string | null | undefined
): string | null {
  switch (likenessLevel) {
    case "very_high":
    case "high":
      return "High fidelity";
    case "medium":
      return "Balanced";
    case "creative":
      return "Creative";
    default:
      return null;
  }
}
