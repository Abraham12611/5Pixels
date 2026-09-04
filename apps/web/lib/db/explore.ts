import { createClient } from "@/lib/supabase/server";
import type {
  PublicProductSummary,
  PublicProductDetail,
} from "@/types/catalog";

const GENERIC_ERROR = "Unable to load the catalog. Please try again.";

export interface CatalogResult<T> {
  data: T;
  error?: string;
  totalCount?: number;
}

export type CatalogSort =
  | "featured"
  | "newest"
  | "name_asc"
  | "name_desc"
  | "credits_asc"
  | "credits_desc";

/**
 * Fetch public-safe product summaries for the consumer catalog.
 *
 * Uses a SECURITY DEFINER RPC that exposes only public metadata, the active
 * version number, credit cost, and public asset references. Private recipe
 * columns are never returned.
 */
export async function getPublicProducts(
  type?: "filter" | "poster",
  categorySlug?: string,
  productIds?: string[],
  search?: string,
  sort: CatalogSort = "featured",
  page = 1,
  pageSize = 24
): Promise<CatalogResult<PublicProductSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_catalog", {
    p_type: type ?? null,
    p_category_slug: categorySlug ?? null,
    p_product_ids: productIds?.length ? productIds : null,
    p_search: search?.trim() || null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) {
    console.error("[getPublicProducts] catalog RPC failed", error);
    return { data: [], error: GENERIC_ERROR };
  }

  const typedData = (data ?? []) as (PublicProductSummary & { total_count?: number })[];
  const totalCount = typedData.length > 0 ? (typedData[0].total_count ?? 0) : 0;
  const products = typedData.map(({ id, slug, name, type, short_description, long_description, category_id, category_slug, category_name, featured_rank, version_id, version_number, credit_cost, output_sizes, metadata, hero_asset_id, poster_asset_id, preview_gif_asset_id, preview_video_asset_id, public_assets }) => ({ id, slug, name, type, short_description, long_description, category_id, category_slug, category_name, featured_rank, version_id: version_id ?? null, version_number, credit_cost: Number(credit_cost), output_sizes: Array.isArray(output_sizes) ? output_sizes : [], metadata, hero_asset_id, poster_asset_id, preview_gif_asset_id, preview_video_asset_id, public_assets }));

  return { data: products as PublicProductSummary[], totalCount };
}

export async function getPublicProductBySlug(
  slug: string
): Promise<CatalogResult<PublicProductDetail | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_product_by_slug", {
    p_slug: slug,
  });

  if (error) {
    console.error("[getPublicProductBySlug] detail RPC failed", error);
    return { data: null, error: GENERIC_ERROR };
  }

  const rows = (data ?? []) as PublicProductDetail[];
  if (rows.length === 0) {
    return { data: null };
  }

  const row = rows[0];
  return {
    data: {
      ...row,
      version_id: row.version_id ?? null,
      credit_cost: Number(row.credit_cost),
      output_sizes: Array.isArray(row.output_sizes) ? row.output_sizes : [],
    } as PublicProductDetail,
  };
}

export async function getPublicAssetUrl(
  bucket: string,
  storageKey: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(storageKey);
  return data?.publicUrl ?? null;
}

/**
 * Return the product IDs favorited by the currently authenticated user.
 * Returns an empty set when anonymous or on error.
 */
export async function getActiveCategories(): Promise<
  { slug: string; name: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getActiveCategories] categories query failed", error);
    return [];
  }

  return (data ?? []) as { slug: string; name: string }[];
}

export async function getUserFavoriteProductIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("[getUserFavoriteProductIds] favorites query failed", error);
    return [];
  }

  return (data ?? []).map((row) => row.product_id);
}
