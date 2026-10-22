/**
 * Standalone-variant discovery policy (#181).
 *
 * The catalog RPC already hides family children unless
 * `standalone_discoverable = true`; these helpers decide what a dependent
 * child's *direct* URL advertises to crawlers and how owner surfaces
 * (favorites/library) attribute it to its parent. Kept pure so page metadata,
 * cards, and tests share one rule.
 */

export interface FamilyDiscoverable {
  slug: string;
  parent_preset_id?: string | null;
  standalone_discoverable?: boolean;
  parent_slug?: string | null;
  parent_name?: string | null;
  parent_is_public?: boolean | null;
}

/** True when the product is a family child that has NOT opted into
 *  independent discovery — hidden from catalog/search/sitemap but still
 *  reachable through its direct URL and the parent-family picker. */
export function isDependentVariant(product: {
  parent_preset_id?: string | null;
  standalone_discoverable?: boolean;
}): boolean {
  return Boolean(
    product.parent_preset_id && product.standalone_discoverable !== true
  );
}

export interface PresetIndexPolicy {
  /** Absolute path for <link rel="canonical"> — null emits no tag. */
  canonical: string | null;
  /** Emit robots noindex for this page. */
  noindex: boolean;
}

/**
 * Indexing policy for /presets/[slug]:
 * - Roots and standalone variants self-canonical — they are independently
 *   listed, so each needs its own indexable URL.
 * - Dependent variants canonical to their parent's page when the parent is
 *   publicly reachable — the child page still works for users, but link
 *   equity and indexing consolidate at the family root.
 * - Dependent variants whose parent is no longer reachable (retired/paused/
 *   hidden) get noindex — canonicalising to a dead URL would be worse.
 */
export function presetIndexPolicy(
  product: FamilyDiscoverable
): PresetIndexPolicy {
  if (!isDependentVariant(product)) {
    return { canonical: `/presets/${product.slug}`, noindex: false };
  }
  if (product.parent_is_public === true && product.parent_slug) {
    return { canonical: `/presets/${product.parent_slug}`, noindex: false };
  }
  return { canonical: null, noindex: true };
}

/** "Part of {parent}" attribution for owner surfaces — present only for
 *  dependent variants whose parent identity resolved. */
export function familyAttribution(product: FamilyDiscoverable): {
  slug: string;
  name: string;
} | null {
  if (!isDependentVariant(product) || !product.parent_slug) return null;
  return {
    slug: product.parent_slug,
    name: product.parent_name ?? product.parent_slug,
  };
}
