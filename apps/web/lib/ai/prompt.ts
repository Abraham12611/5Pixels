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
