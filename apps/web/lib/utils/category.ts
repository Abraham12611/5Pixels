/**
 * Normalize a category_id form value so that an empty selection becomes
 * `undefined`. This lets an optional UUID field pass Zod validation.
 */
export function normalizeEmptyCategory(
  value: string | null | undefined
): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}
