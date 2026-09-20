/**
 * Compile a private prompt template deterministically from user controls.
 *
 * Templates use {{field_key}} placeholders. The compiled prompt and a stable
 * JSON representation of controls are never logged or returned to clients.
 */
export function compilePrompt(
  template: string,
  controls: Record<string, unknown>
): string {
  const sortedKeys = Object.keys(controls).sort();
  let compiled = template;

  for (const key of sortedKeys) {
    const value = controls[key];
    const replacement =
      value === null || value === undefined ? "" : String(value);
    compiled = compiled.replaceAll(`{{${key}}}`, replacement);
  }

  return compiled.trim();
}

const REFERENCE_ROLE_GUIDANCE: Record<string, string> = {
  style_reference: "visual style, color grade, and mood",
  composition_reference: "composition, pose, and framing",
  layout_reference: "layout and graphic arrangement",
};

/**
 * Appended to the compiled prompt when a preset ships reference images.
 * References guide the look; the first (source) image's subject keeps their
 * identity — the reference subject is never copied one-to-one.
 */
export function referencePromptClause(roles: string[]): string {
  const guides = [...new Set(roles)]
    .map((role) => REFERENCE_ROLE_GUIDANCE[role])
    .filter((g): g is string => Boolean(g));
  if (guides.length === 0) return "";
  const list =
    guides.length === 1
      ? guides[0]
      : `${guides.slice(0, -1).join(", ")}, and ${guides[guides.length - 1]}`;
  return (
    ` Additional reference image${roles.length > 1 ? "s are" : " is"} provided` +
    ` only as a guide for ${list}. Apply that to the person in the first image` +
    ` while preserving their identity, facial features, and likeness — do not` +
    ` copy the reference subject's face or identity.`
  );
}

export function buildControlFingerprint(
  controls: Record<string, unknown>
): string {
  const sorted = Object.keys(controls)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = controls[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
}
