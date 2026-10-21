import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapCatalogRow } from "@/lib/catalog/catalog-rows";
import {
  reconcilePrimaryCatalogMedia,
  type PublicPrimaryMediaRow,
} from "@/lib/catalog/media";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  FavoriteProduct,
  PresetFamilyMember,
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
// React `cache` dedupes identical calls within a request — layouts and pages
// often fetch the same catalog slices (categories, featured) in one render.
export const getPublicProducts = cache(async function getPublicProducts(
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

  const typedData = (data ?? []) as (PublicProductSummary & {
    total_count?: number;
  })[];
  const totalCount = typedData.length > 0 ? (typedData[0].total_count ?? 0) : 0;
  const products = typedData.map(mapCatalogRow);

  return { data: products, totalCount };
});

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

  // The public detail RPC can include an inherited hero link from
  // product_assets after a variant's independent hero/poster changed.
  // Resolve only current product pointers, restricted to public preset-media
  // objects, and replace stale primary-role links. This keeps the detail
  // hero, OG image and variant rail consistent without touching DB records.
  const ids = [row.poster_asset_id, row.hero_asset_id].filter(
    (id): id is string => Boolean(id)
  );
  let currentMedia: PublicPrimaryMediaRow[] = [];
  if (ids.length > 0) {
    try {
      const { data: assets, error: mediaError } = await createServiceClient()
        .from("assets")
        .select("id, bucket, storage_key, mime_type, width, height")
        .in("id", [...new Set(ids)])
        .eq("bucket", "preset-media")
        .eq("visibility", "public")
        .is("deleted_at", null);
      if (mediaError) throw mediaError;
      currentMedia = (assets ?? []) as PublicPrimaryMediaRow[];
    } catch {
      // Keep the page available without showing an incorrect inherited hero.
      console.error("[getPublicProductBySlug] primary media unavailable");
    }
  }
  return {
    data: {
      ...row,
      public_assets: reconcilePrimaryCatalogMedia(
        row.public_assets ?? [],
        {
          hero_asset_id: row.hero_asset_id,
          poster_asset_id: row.poster_asset_id,
        },
        currentMedia
      ),
      version_id: row.version_id ?? null,
      credit_cost: Number(row.credit_cost),
      output_sizes: Array.isArray(row.output_sizes) ? row.output_sizes : [],
      parent_preset_id: row.parent_preset_id ?? null,
      standalone_discoverable: row.standalone_discoverable ?? false,
      variant_count: Number(row.variant_count ?? 0),
      variant_display_name: row.variant_display_name ?? null,
      family_id: row.family_id ?? row.id,
      input_capability: row.input_capability ?? null,
      parent_slug: row.parent_slug ?? null,
      parent_name: row.parent_name ?? null,
      parent_is_public: row.parent_is_public ?? null,
    } as PublicProductDetail,
  };
}

/**
 * Ordered family members for a preset — the contract surface the variation
 * rail (#180) consumes. Accepts a parent or any variant id; returns []
 * when the product has no published family or is itself unavailable.
 */
export async function getPresetFamily(
  productId: string
): Promise<CatalogResult<PresetFamilyMember[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_preset_family", {
    p_product_id: productId,
  });

  if (error) {
    console.error("[getPresetFamily] family RPC failed", error);
    return { data: [], error: GENERIC_ERROR };
  }

  return { data: (data ?? []) as PresetFamilyMember[] };
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
 * Category slugs the user picked during onboarding (08 §2B) — wired live:
 * the default Explore view surfaces these categories first.
 */
export async function getUserInterestSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_answers")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[getUserInterestSlugs] profile query failed", error.message);
    return [];
  }
  const interests = (data?.onboarding_answers as Record<string, unknown> | null)
    ?.interests;
  return Array.isArray(interests)
    ? interests.filter((i): i is string => typeof i === "string")
    : [];
}

/**
 * Stable partition: products in picked categories first, canonical order
 * preserved within both halves. Pure so it's directly testable.
 */
export function applyInterestBoost<T extends { category_slug: string | null }>(
  products: T[],
  interests: string[]
): T[] {
  if (interests.length === 0) return products;
  const wanted = new Set(interests);
  const hits: T[] = [];
  const rest: T[] = [];
  for (const p of products) {
    (p.category_slug && wanted.has(p.category_slug) ? hits : rest).push(p);
  }
  return [...hits, ...rest];
}

/**
 * Return the product IDs favorited by the currently authenticated user.
 * Returns an empty set when anonymous or on error.
 */
export const getActiveCategories = cache(async function getActiveCategories(): Promise<
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
});

/**
 * Favorited products for the signed-in user, including presets that have
 * since been retired or hidden. Rows arrive sorted by most recently saved.
 */
export async function getUserFavoriteProducts(): Promise<
  CatalogResult<FavoriteProduct[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_favorite_products");

  if (error) {
    console.error("[getUserFavoriteProducts] RPC failed", error);
    return { data: [], error: GENERIC_ERROR };
  }

  const rows = (data ?? []) as (PublicProductSummary & {
    is_available?: boolean;
    favorited_at?: string;
  })[];

  return {
    data: rows.map(
      ({ is_available, favorited_at, credit_cost, output_sizes, ...rest }) => ({
        product: {
          ...rest,
          credit_cost: Number(credit_cost),
          output_sizes: Array.isArray(output_sizes) ? output_sizes : [],
          created_at: rest.created_at ?? null,
          likeness_level: rest.likeness_level ?? null,
        } as PublicProductSummary,
        isAvailable: is_available === true,
        favoritedAt: favorited_at ?? "",
      })
    ),
  };
}

/**
 * Median credit cost across the active catalogue — used for "enough for N
 * more transformations" and cost-per-image copy on billing/pricing surfaces.
 * Falls back to 5 when the catalogue is empty.
 */
export const getMedianPresetCost = cache(async function getMedianPresetCost() {
  const { data } = await getPublicProducts(
    undefined,
    undefined,
    undefined,
    undefined,
    "featured",
    1,
    50
  );
  const costs = (data ?? [])
    .map((p) => p.credit_cost)
    .filter((c): c is number => typeof c === "number" && c > 0)
    .sort((a, b) => a - b);
  if (costs.length === 0) return 5;
  const mid = Math.floor(costs.length / 2);
  return costs.length % 2 === 0
    ? Math.round((costs[mid - 1]! + costs[mid]!) / 2)
    : costs[mid]!;
});

export interface CatalogCostProfile {
  /** Median credit cost of a Filter transformation across the catalogue. */
  filterCost: number;
  /** Median credit cost of a Poster generation (image + layout render). */
  posterCost: number;
}

const FALLBACK_FILTER_COST = 6;
const FALLBACK_POSTER_COST = 12;

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/**
 * Median credit cost per product kind — powers the plan-finder's
 * "≈ N credits each" labels and monthly estimate. Falls back to fixed
 * defaults when the catalogue is empty.
 */
export const getCatalogCostProfile = cache(async function getCatalogCostProfile(): Promise<CatalogCostProfile> {
  const { data } = await getPublicProducts(
    undefined,
    undefined,
    undefined,
    undefined,
    "featured",
    1,
    200
  );
  const priced = (data ?? []).filter(
    (p) => typeof p.credit_cost === "number" && p.credit_cost > 0
  );
  const filters = priced
    .filter((p) => p.type === "filter")
    .map((p) => p.credit_cost);
  const posters = priced
    .filter((p) => p.type === "poster")
    .map((p) => p.credit_cost);
  return {
    filterCost: medianOf(filters) ?? FALLBACK_FILTER_COST,
    posterCost: medianOf(posters) ?? FALLBACK_POSTER_COST,
  };
});

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
