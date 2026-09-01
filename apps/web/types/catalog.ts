export type ProductType = "filter" | "poster";

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
  version_number: number | null;
  credit_cost: number;
  metadata: Record<string, unknown> | null;
  hero_asset_id: string | null;
  poster_asset_id: string | null;
  preview_gif_asset_id: string | null;
  preview_video_asset_id: string | null;
  public_assets: PublicProductAsset[];
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

export interface CatalogFilters {
  type: ProductType | null;
  category: string | null;
}
