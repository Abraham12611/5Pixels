import { createClient } from "@/lib/supabase/server";
import type {
  PublicProductSummary,
  PublicProductDetail,
} from "@/types/catalog";

const GENERIC_ERROR = "Unable to load the catalog. Please try again.";

export interface CatalogResult<T> {
  data: T;
  error?: string;
}

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
  productIds?: string[]
): Promise<CatalogResult<PublicProductSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_catalog", {
    p_type: type ?? null,
    p_category_slug: categorySlug ?? null,
    p_product_ids: productIds?.length ? productIds : null,
  });

  if (error) {
    console.error("[getPublicProducts] catalog RPC failed", error);
    return { data: [], error: GENERIC_ERROR };
  }

  return { data: (data ?? []) as PublicProductSummary[] };
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

  return { data: rows[0] };
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
