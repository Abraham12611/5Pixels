"use client";

import { createClient } from "@/lib/supabase/client";
import { mapCatalogRow } from "@/lib/catalog/catalog-rows";
import type { CatalogSort } from "@/lib/db/explore";
import type { ProductType, PublicProductSummary } from "@/types/catalog";

export interface CatalogPageQuery {
  type?: ProductType | null;
  category?: string | null;
  search?: string | null;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}

export interface CatalogPage {
  products: PublicProductSummary[];
  totalCount: number;
}

/**
 * Browser-side catalog fetch over the same public `get_public_catalog` RPC the
 * server uses — anon-executable by design. Powers progressive "Load more" on
 * mobile and the live counts inside the filter modal.
 */
export async function fetchCatalogPage(
  query: CatalogPageQuery
): Promise<CatalogPage> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_catalog", {
    p_type: query.type ?? null,
    p_category_slug: query.category ?? null,
    p_product_ids: null,
    p_search: query.search?.trim() || null,
    p_sort: query.sort ?? "featured",
    p_page: query.page ?? 1,
    p_page_size: query.pageSize ?? 24,
  });

  if (error) {
    console.error("[fetchCatalogPage] catalog RPC failed", error);
    return { products: [], totalCount: 0 };
  }

  const rows = (data ?? []) as (PublicProductSummary & {
    total_count?: number;
  })[];
  return {
    products: rows.map(mapCatalogRow),
    totalCount: rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0,
  };
}

export interface CategoryCountResult {
  /** Looks-per-category under the given type+search, keyed by category slug. */
  counts: Record<string, number>;
  /** Total looks matching type+search across all categories. */
  total: number;
}

/**
 * Per-category look counts for the filter modal tiles. While the catalogue is
 * small this is a single broad page fetch grouped client-side — cheaper than
 * one RPC per category (25_MOBILE_WEB_POLISH/20 Q5, option b).
 */
export async function fetchCategoryCounts(
  type: ProductType | null,
  search: string | null
): Promise<CategoryCountResult> {
  const { products, totalCount } = await fetchCatalogPage({
    type,
    search,
    page: 1,
    pageSize: 500,
  });

  const counts: Record<string, number> = {};
  for (const product of products) {
    if (product.category_slug) {
      counts[product.category_slug] =
        (counts[product.category_slug] ?? 0) + 1;
    }
  }
  return { counts, total: totalCount };
}
