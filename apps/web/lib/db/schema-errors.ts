/**
 * Detects "the preset-family contract is not deployed on this database"
 * — and only that. Loaders may degrade on these errors because the
 * family feature genuinely does not exist on an un-migrated database.
 * Every other failure (permissions, timeouts, connectivity, unrelated
 * schema problems) must still throw so real outages are never silently
 * swallowed.
 *
 * Both conditions are required:
 *  1. a schema-absent error code, AND
 *  2. an error message that names an object owned by the preset-family
 *     contract migration — so a missing column elsewhere cannot masquerade
 *     as this case.
 */
const FAMILY_SCHEMA_ABSENT_CODES = new Set([
  "42703", // undefined_column
  "42P01", // undefined_table
  "PGRST204", // column not found in schema cache
  "PGRST205", // table not found in schema cache
]);

const FAMILY_SCHEMA_OBJECT =
  /parent_preset_id|standalone_discoverable|variant_display_name|variant_sort_order|input_mode|input_min_images|input_max_images|input_image_roles|prompt_override_enabled|prompt_max_chars|get_preset_family/i;

export function isFamilySchemaUnavailableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    typeof code === "string" &&
    FAMILY_SCHEMA_ABSENT_CODES.has(code) &&
    typeof message === "string" &&
    FAMILY_SCHEMA_OBJECT.test(message)
  );
}
