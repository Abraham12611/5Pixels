import type { RegisterOptions } from "react-hook-form";

/**
 * Register options for optional numeric inputs. `valueAsNumber` turns an
 * empty input into NaN, which fails optional Zod number fields and blocks
 * submission — this maps blank/invalid input to `undefined` instead, so
 * schema defaults (and true optionality) apply.
 */
export const optionalNumberInput = {
  setValueAs: (value: unknown) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  },
} satisfies Pick<RegisterOptions, "setValueAs">;

/**
 * Flatten a react-hook-form `dirtyFields` tree into leaf dot paths.
 * Leaves are `true`; nested objects and field-array indices recurse, so
 * paths come out as `fields.0.label`.
 */
export function flattenDirtyLeaves(dirty: unknown, prefix = ""): string[] {
  if (dirty === null || typeof dirty !== "object") return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(dirty)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === true) {
      out.push(path);
    } else if (value !== null && typeof value === "object") {
      out.push(...flattenDirtyLeaves(value, path));
    }
  }
  return out;
}

/** Read a nested value by dot path — `getPathValue(v, "fields.0.label")`. */
export function getPathValue(source: unknown, path: string): unknown {
  let current = source;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Structural equality for form values (JSON-shaped: primitives, arrays, plain objects). */
export function formValueEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return false;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    formValueEquals(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}
