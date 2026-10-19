/**
 * Detects "the schema this feature needs is not deployed" errors from
 * PostgREST/Postgres. Loaders may degrade on these — the feature simply
 * doesn't exist yet on that database — while every other failure
 * (permissions, timeouts, connectivity) must still throw so real outages
 * are never silently swallowed.
 */
const SCHEMA_UNAVAILABLE_CODES = new Set([
  "42703", // undefined_column
  "42P01", // undefined_table
  "42P02", // undefined_parameter
  "PGRST200", // function not found in schema cache
  "PGRST204", // column not found in schema cache
  "PGRST205", // table not found in schema cache
]);

export function isSchemaUnavailableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const code = (error as { code: unknown }).code;
  return typeof code === "string" && SCHEMA_UNAVAILABLE_CODES.has(code);
}
