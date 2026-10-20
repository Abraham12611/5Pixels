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

const isPlainObjectOrArray = (value: unknown): value is object =>
  value !== null &&
  typeof value === "object" &&
  (Array.isArray(value) ||
    Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

/**
 * Flatten a form value tree into leaf dot paths → values. Plain objects and
 * arrays recurse — array indices become path segments, so removal and
 * reordering surface as diffs. `undefined` leaves are skipped so "absent"
 * and "explicitly undefined" compare equal: the zod resolver output can
 * differ structurally from the raw form values on optional branches.
 * Non-plain objects (File, Date, …) are treated as leaves.
 */
export function flattenValueLeaves(
  source: unknown,
  prefix = "",
  out = new Map<string, unknown>()
): Map<string, unknown> {
  if (source === undefined) return out;
  if (!isPlainObjectOrArray(source)) {
    out.set(prefix, source);
    return out;
  }
  for (const [key, value] of Object.entries(source)) {
    flattenValueLeaves(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
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

/**
 * Structural equality between two complete form snapshots — e.g. the values
 * submitted to the server and the live values when it resolves. Compares
 * leaf-by-leaf over the union of flattened paths, so edits that
 * `dirtyFields` misses (reverting a field to its prior-baseline value,
 * removing or reordering array items while a save is in flight) still
 * register as differences.
 */
export function formSnapshotsEqual(a: unknown, b: unknown): boolean {
  const aLeaves = flattenValueLeaves(a);
  const bLeaves = flattenValueLeaves(b);
  for (const path of new Set([...aLeaves.keys(), ...bLeaves.keys()])) {
    if (!formValueEquals(aLeaves.get(path), bLeaves.get(path))) return false;
  }
  return true;
}
