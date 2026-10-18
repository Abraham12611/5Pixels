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

/** Public projection of a version's input contract (#176) — how many images
 *  the preset accepts and whether a custom prompt is allowed. Never carries
 *  provider routes or recipe data. */
export interface PublicInputCapability {
  mode: "single" | "multi";
  min_images: number;
  max_images: number;
  roles: { name: string; optional?: boolean }[];
  prompt: { enabled: boolean; max_chars: number };
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
  /** Non-null when this product is a family variant (#176). Optional so
   *  clients/fixtures built before #176 remain valid. */
  parent_preset_id?: string | null;
  /** Variant opted into independent discovery; roots always false. */
  standalone_discoverable?: boolean;
  /** Published children count — powers "N styles" badges on family roots. */
  variant_count?: number;
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
  /** Short label for family rails ("Warm"); NULL on roots/standalone. */
  variant_display_name?: string | null;
  /** Family root id — own id for roots/standalone, parent id for variants. */
  family_id?: string;
  /** The version's consumer-facing input contract. */
  input_capability?: PublicInputCapability | null;
};

/** get_preset_family member row (#176). */
export interface PresetFamilyMember {
  product_id: string;
  slug: string;
  name: string;
  variant_display_name: string | null;
  variant_sort_order: number;
  is_parent: boolean;
  is_current: boolean;
  public_status: string;
  credit_cost: number;
  hero_asset_id: string | null;
  poster_asset_id: string | null;
  preview_gif_asset_id: string | null;
  preview_video_asset_id: string | null;
}

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
