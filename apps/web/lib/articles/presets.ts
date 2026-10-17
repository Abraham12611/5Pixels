import {
  isPresetUuid,
  presetCardDataFromProduct,
  type PresetCardData,
} from "@/lib/articles/preset-card";
import {
  getPublicProductBySlug,
  getPublicProducts,
} from "@/lib/db/explore";

/**
 * Server-side preset resolvers for article preset blocks (#127) — used by
 * the staff preview, publish validation and the public reader (#131).
 *
 * All resolution goes through the anon-safe catalog RPCs
 * (get_public_catalog / get_public_product_by_slug): they expose strictly
 * public metadata for ACTIVE products only. A retired, unpublished or
 * tampered reference simply resolves to null — never an error, never
 * private data. Rendering a card therefore cannot trigger generation or
 * touch credits; the only navigation it offers is the public preset page.
 */

export {
  collectDocumentPresetIds,
  isPinnedVersionStale,
  presetCardDataFromProduct,
} from "@/lib/articles/preset-card";
export type { PresetCardData } from "@/lib/articles/preset-card";

/** Resolve a preset block's canonical reference to public card data. */
export async function resolvePresetCardById(
  presetId: string
): Promise<PresetCardData | null> {
  if (!isPresetUuid(presetId)) return null;
  const { data } = await getPublicProducts(
    undefined,
    undefined,
    [presetId],
    undefined,
    "featured",
    1,
    1
  );
  const product = data[0];
  return product ? presetCardDataFromProduct(product) : null;
}

/** Resolve by slug — used when a document stores only the deep-link slug. */
export async function resolvePresetCardBySlug(
  slug: string
): Promise<PresetCardData | null> {
  if (!slug || slug.length > 120) return null;
  const { data } = await getPublicProductBySlug(slug);
  return data ? presetCardDataFromProduct(data) : null;
}

/**
 * Batch resolution for a published document — one catalog page per 50 ids
 * (the RPC's server-side page-size bound). Missing ids are simply absent
 * from the map: the reader renders the unavailable fallback.
 */
export async function resolvePresetCardMap(
  presetIds: string[]
): Promise<Map<string, PresetCardData>> {
  const ids = [...new Set(presetIds.filter(isPresetUuid))];
  const map = new Map<string, PresetCardData>();
  for (let i = 0; i < ids.length; i += 50) {
    const { data } = await getPublicProducts(
      undefined,
      undefined,
      ids.slice(i, i + 50),
      undefined,
      "featured",
      1,
      50
    );
    for (const product of data) {
      map.set(product.id, presetCardDataFromProduct(product));
    }
  }
  return map;
}
