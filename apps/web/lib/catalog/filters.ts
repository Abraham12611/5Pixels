import type { ProductType, CatalogFilters } from "@/types/catalog";
import type { CatalogSort } from "@/lib/db/explore";

const VALID_TYPES: ProductType[] = ["filter", "poster"];
const VALID_SORTS: CatalogSort[] = [
  "featured",
  "newest",
  "name_asc",
  "name_desc",
  "credits_asc",
  "credits_desc",
];
const SLUG_RE = /^[a-z0-9-]+$/;

export interface ParsedCatalogFilters extends CatalogFilters {
  search: string | null;
  sort: CatalogSort;
  page: number;
  pageSize: number;
  errors: string[];
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

/**
 * Parse and validate URL-driven catalog filters.
 *
 * Unknown or malformed values are collected as errors instead of being
 * silently dropped, so the UI can surface them without breaking routing.
 */
export function parseCatalogSearchParams(
  raw: Record<string, string | string[] | undefined>
): ParsedCatalogFilters {
  const errors: string[] = [];

  const rawType = firstValue(raw.type);
  let type: ProductType | null = null;
  if (rawType) {
    const normalized = rawType.trim().toLowerCase();
    if (VALID_TYPES.includes(normalized as ProductType)) {
      type = normalized as ProductType;
    } else {
      errors.push(`"${rawType}" is not a valid product type.`);
    }
  }

  const rawCategory = firstValue(raw.category);
  let category: string | null = null;
  if (rawCategory) {
    const normalized = rawCategory.trim().toLowerCase();
    if (SLUG_RE.test(normalized)) {
      category = normalized;
    } else {
      errors.push(`"${rawCategory}" is not a valid category slug.`);
    }
  }

  const rawSearch = firstValue(raw.search);
  const search = rawSearch ? rawSearch.trim() : null;

  const rawSort = firstValue(raw.sort);
  let sort: CatalogSort = "featured";
  if (rawSort) {
    const normalized = rawSort.trim().toLowerCase() as CatalogSort;
    if (VALID_SORTS.includes(normalized)) {
      sort = normalized;
    } else {
      errors.push(`"${rawSort}" is not a valid sort option.`);
    }
  }

  const rawPage = firstValue(raw.page);
  let page = 1;
  if (rawPage) {
    const parsed = Number.parseInt(rawPage, 10);
    if (Number.isSafeInteger(parsed) && parsed >= 1) {
      page = parsed;
    } else {
      errors.push(`"${rawPage}" is not a valid page number.`);
    }
  }

  const rawPageSize = firstValue(raw.page_size);
  let pageSize = 24;
  if (rawPageSize) {
    const parsed = Number.parseInt(rawPageSize, 10);
    if (Number.isSafeInteger(parsed) && [12, 24, 48].includes(parsed)) {
      pageSize = parsed;
    } else {
      errors.push(`"${rawPageSize}" is not a valid page size.`);
    }
  }

  return { type, category, search, sort, page, pageSize, errors };
}

/**
 * Build a stable catalog search string from validated filters and pagination.
 */
export function buildCatalogSearchParams(
  filters: CatalogFilters & {
    search?: string | null;
    sort?: CatalogSort;
    page?: number;
    pageSize?: number;
  }
): string {
  const params = new URLSearchParams();
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.sort && filters.sort !== "featured") {
    params.set("sort", filters.sort);
  }
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize && filters.pageSize !== 24) {
    params.set("page_size", String(filters.pageSize));
  }
  return params.toString();
}
