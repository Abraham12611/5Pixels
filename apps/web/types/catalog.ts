export type ProductType = "filter" | "poster";

export interface OutputSizeOption {
  name: string;
  /** Fallback/preview dimensions. When `match_source` is set the server
   *  resolves real dims from the uploaded photo and these act as a fallback. */
  width: number;
  height: number;
  is_default?: boolean;
  /** The result keeps the uploaded photo's aspect ratio ("auto" on providers
   *  that support it, resolved source dims elsewhere). */
  match_source?: boolean;
  /** The result keeps the preset reference asset's aspect ratio — resolved
   *  server-side from the first attached reference's real dimensions. */
  match_reference?: boolean;
}

export interface PublicProductSummary {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  short_description: string | null;
  long_description: string | null;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  featured_rank: number | null;
  version_id: string | null;
  version_number: number | null;
  credit_cost: number;
  output_sizes: OutputSizeOption[];
  metadata: Record<string, unknown> | null;
  hero_asset_id: string | null;
  poster_asset_id: string | null;
  preview_gif_asset_id: string | null;
  preview_video_asset_id: string | null;
  public_assets: PublicProductAsset[];
  created_at: string | null;
  /** very_high | high | medium | creative — consumer-facing fidelity signal. */
  likeness_level: string | null;
}

export interface PublicProductAsset {
  role: string;
  asset_id: string;
  sort_order: number | null;
  rights_metadata: Record<string, unknown> | null;
  bucket: string;
  storage_key: string;
  mime_type: string;
  width: number | null;
  height: number | null;
}

export interface PublicProductField {
  id: string;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: string;
  required: boolean | null;
  sort_order: number | null;
  config: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
}

export type PublicProductDetail = PublicProductSummary & {
  active_fields: PublicProductField[];
  public_assets: PublicProductAsset[];
};

/**
 * A favorited preset. `isAvailable` is false when the preset has been retired
 * or hidden since the user saved it — Favorites renders those as muted cards
 * instead of dropping them silently.
 */
export interface FavoriteProduct {
  product: PublicProductSummary;
  isAvailable: boolean;
  favoritedAt: string;
}

export interface CatalogFilters {
  type: ProductType | null;
  category: string | null;
}
