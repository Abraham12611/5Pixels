import type { PublicProductField } from "@/types/catalog";

export type FieldType =
  | "short_text"
  | "select"
  | "radio"
  | "toggle"
  | "color"
  | "aspect_ratio"
  | "intensity"
  | "layout"
  | "background"
  | "wardrobe"
  | "era"
  | "mood";

const CHOICE_TYPES: FieldType[] = [
  "select",
  "radio",
  "layout",
  "background",
  "wardrobe",
  "era",
  "mood",
];

export interface NormalizedField extends PublicProductField {
  /** A safe initial/default value for a non-generation preview. */
  defaultValue: unknown;
  /** Human-readable options when the field renders as a choice control. */
  options: { value: string; label: string }[];
  /** Range bounds for numeric-style controls such as intensity. */
  min: number;
  max: number;
  step: number;
}

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

function getConfigValue<T>(
  config: Record<string, unknown> | null | undefined,
  key: string,
  fallback: T
): T {
  if (!config || typeof config !== "object") return fallback;
  const value = config[key];
  return value === undefined ? fallback : (value as T);
}

/**
 * Derive a preview-safe default value from a field schema.
 *
 * The value is never submitted to a generation pipeline; it only populates
 * disabled preview controls so users can see what options a preset exposes.
 */
export function getFieldDefaultValue(field: PublicProductField): unknown {
  const config = field.config ?? {};

  if (field.field_type === "toggle") {
    return Boolean(getConfigValue(config, "default", false));
  }

  if (field.field_type === "color") {
    const value = getConfigValue(config, "default", "#82ea3a");
    return typeof value === "string" ? value : "#82ea3a";
  }

  if (field.field_type === "aspect_ratio") {
    const value = getConfigValue(config, "default", "1:1");
    return typeof value === "string" ? value : "1:1";
  }

  if (field.field_type === "intensity") {
    const min = getConfigValue<number>(config, "min", 0);
    const max = getConfigValue<number>(config, "max", 100);
    const def = getConfigValue<number>(
      config,
      "default",
      Math.round((min + max) / 2)
    );
    return Math.min(max, Math.max(min, def));
  }

  if (
    field.field_type === "select" ||
    field.field_type === "radio" ||
    field.field_type === "layout" ||
    field.field_type === "background" ||
    field.field_type === "wardrobe" ||
    field.field_type === "era" ||
    field.field_type === "mood"
  ) {
    const options = coerceArray(config.options);
    const configuredDefault = config.default;
    if (
      configuredDefault !== undefined &&
      (typeof configuredDefault === "string" ||
        typeof configuredDefault === "number")
    ) {
      const value = String(configuredDefault);
      if (
        options.length === 0 ||
        options.some((opt) =>
          typeof opt === "string"
            ? opt === value
            : String((opt as Record<string, unknown>)?.value) === value
        )
      ) {
        return value;
      }
    }
    if (options.length > 0) {
      return String(options[0]);
    }
    return "";
  }

  // short_text and any future text-like types
  const value = getConfigValue(config, "default", "");
  return typeof value === "string" ? value : "";
}

export function getFieldOptions(
  field: PublicProductField
): { value: string; label: string }[] {
  const config = field.config ?? {};
  const raw = coerceArray(config.options);
  return raw.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    if (opt && typeof opt === "object") {
      const obj = opt as Record<string, unknown>;
      const value =
        typeof obj.value === "string" ? obj.value : String(obj.label ?? "");
      const label =
        typeof obj.label === "string" ? obj.label : String(obj.value ?? value);
      return { value, label };
    }
    return { value: String(opt), label: String(opt) };
  });
}

export function getFieldRange(field: PublicProductField): {
  min: number;
  max: number;
  step: number;
} {
  const config = field.config ?? {};
  if (field.field_type === "intensity") {
    return {
      min: getConfigValue<number>(config, "min", 0),
      max: getConfigValue<number>(config, "max", 100),
      step: getConfigValue<number>(config, "step", 1),
    };
  }
  return { min: 0, max: 100, step: 1 };
}

/**
 * Normalize a raw product field for consumer rendering.
 */
export function normalizeField(field: PublicProductField): NormalizedField {
  const options = CHOICE_TYPES.includes(field.field_type as FieldType)
    ? getFieldOptions(field)
    : [];

  return {
    ...field,
    defaultValue: getFieldDefaultValue(field),
    options,
    ...getFieldRange(field),
  };
}

export function sortFields(fields: PublicProductField[]): PublicProductField[] {
  return [...fields].sort((a, b) => {
    const orderA = a.sort_order ?? 0;
    const orderB = b.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.label ?? "").localeCompare(b.label ?? "");
  });
}
