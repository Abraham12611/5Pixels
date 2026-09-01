import type { ProductType, CatalogFilters } from "@/types/catalog";

const VALID_TYPES: ProductType[] = ["filter", "poster"];
const SLUG_RE = /^[a-z0-9-]+$/;

export interface ParsedCatalogFilters extends CatalogFilters {
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

  return { type, category, errors };
}

/**
 * Build a stable catalog search string from validated filters.
 */
export function buildCatalogSearchParams(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  return params.toString();
}
