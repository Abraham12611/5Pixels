/**
 * Maps a thrown admin save/update failure to a safe, user-facing string.
 *
 * Server-action errors crossing the RSC boundary are replaced by minified
 * React digests in production, so expected rejections are converted to a
 * structured `{ error }` result by callers and rendered through this map.
 * The raw PostgREST/Postgres detail never reaches the client.
 */
export function describeAdminSaveError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "";

  if (/requires an active version before it can be activated/i.test(message)) {
    return (
      "This preset has no published recipe version, so Save Changes cannot " +
      "activate its catalog listing. Set Status to Draft in the main editor " +
      "before saving, then use Publish version after the draft is saved. " +
      "Your edits are preserved."
    );
  }
  if (/no editable source version/i.test(message)) {
    return (
      "This preset has no saved version — it can't be saved until the " +
      "underlying record is repaired or the preset is replaced. Your " +
      "edits are preserved below."
    );
  }
  if (/source version not found/i.test(message)) {
    return (
      "The version this save was based on no longer exists. Reload the " +
      "editor and try again — your current edits are preserved."
    );
  }
  if (/product not found/i.test(message)) {
    return "This preset no longer exists — it may have been deleted.";
  }
  if (/forbidden|unauthorized|admin or owner required/i.test(message)) {
    return "You don't have permission to save this preset.";
  }
  return "Unable to save this preset. Please try again — your edits are preserved.";
}
