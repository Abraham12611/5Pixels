/**
 * Postgres NUMERIC columns deserialize as strings (e.g. "1.0000"). Admin edit
 * pages must coerce them once before the value reaches zod's z.number() or
 * the publish-gate checks — a TypeScript `as number` cast does NOT convert
 * the runtime value.
 *
 * Returns a finite number, or null when the input is absent/unparseable so
 * callers can apply their own fallback.
 */
export function coerceCreditCost(value: unknown): number | null {
  if (value == null) return null;
  // Number("") is 0 — an empty string is absent data, not a zero cost.
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
