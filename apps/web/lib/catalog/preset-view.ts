import {
  getPublicProductBySlug,
  getPublicProductEditorial,
  getPublicProducts,
} from "@/lib/db/explore";
import type {
  PublicProductDetail,
  PublicProductSummary,
} from "@/types/catalog";

/**
 * Serializable per-preset payload shared by the detail page's SSR pass and
 * the client-side variant swap in `PresetLightbox`. Everything here must
 * stay JSON-safe — it crosses the server-action boundary.
 */
export interface PresetView {
  product: PublicProductDetail;
  publicPromptRecipe: string | null;
  /** Same-category siblings for the "More … presets" rail, minus this one. */
  related: PublicProductSummary[];
}

/**
 * The variant-specific slice of the detail page: editorial recipe + related
 * rail. The family rail is intentionally absent — `getPresetFamilyRail`
 * returns the same member list for every sibling, so the client flips
 * `isCurrent` locally instead of refetching it.
 */
export async function buildPresetView(
  product: PublicProductDetail
): Promise<PresetView> {
  const [editorial, related] = await Promise.all([
    getPublicProductEditorial(product.id),
    getPublicProducts(
      product.type ?? undefined,
      product.category_slug ?? undefined
    ),
  ]);
  return {
    product,
    publicPromptRecipe: editorial?.publicPromptRecipe ?? null,
    related: related.data
      .filter((p) => p.id !== product.id)
      .slice(0, 6),
  };
}

/** Full swap payload for a slug — used by the `fetchPresetView` action. */
export async function loadPresetView(
  slug: string
): Promise<PresetView | null> {
  const { data: product, error } = await getPublicProductBySlug(slug);
  if (error || !product) return null;
  return buildPresetView(product);
}
