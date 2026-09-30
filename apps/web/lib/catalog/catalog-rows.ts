import type { PublicProductSummary } from "@/types/catalog";

/**
 * Shared row → summary mapping for `get_public_catalog` results. Used by the
 * server-side fetcher (`lib/db/explore.ts`) and the browser fetcher
 * (`lib/catalog/browser.ts`) so both return identical shapes.
 */
export function mapCatalogRow(
  row: PublicProductSummary & { total_count?: number }
): PublicProductSummary {
  const {
    id,
    slug,
    name,
    type,
    short_description,
    long_description,
    category_id,
    category_slug,
    category_name,
    featured_rank,
    version_id,
    version_number,
    credit_cost,
    output_sizes,
    metadata,
    hero_asset_id,
    poster_asset_id,
    preview_gif_asset_id,
    preview_video_asset_id,
    public_assets,
    created_at,
    likeness_level,
  } = row;

  return {
    id,
    slug,
    name,
    type,
    short_description,
    long_description,
    category_id,
    category_slug,
    category_name,
    featured_rank,
    version_id: version_id ?? null,
    version_number,
    credit_cost: Number(credit_cost),
    output_sizes: Array.isArray(output_sizes) ? output_sizes : [],
    metadata,
    hero_asset_id,
    poster_asset_id,
    preview_gif_asset_id,
    preview_video_asset_id,
    public_assets,
    created_at: created_at ?? null,
    likeness_level: likeness_level ?? null,
  };
}
