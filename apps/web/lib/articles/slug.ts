/**
 * Article slug helpers — the client-side mirror of
 * public.article_slugify() / the articles.slug CHECK constraint in
 * supabase/migrations/20261018000001_articles_foundation.sql.
 * Keep the two implementations in sync.
 */

export const ARTICLE_SLUG_MAX_LENGTH = 120;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Lowercase kebab-case normalisation; returns "" when nothing usable remains. */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, ARTICLE_SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= ARTICLE_SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}
