/** Approximate reading pace used for "N min read" labels. */
export const WORDS_PER_MINUTE = 200;

/**
 * Convert a snapshot word count (from get_public_articles) into a
 * reader-friendly minute estimate. Always at least 1 minute.
 */
export function readingMinutes(wordCount: number): number {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return 1;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
