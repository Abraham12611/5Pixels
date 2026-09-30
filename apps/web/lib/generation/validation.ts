import type { PublicProductField } from "@/types/catalog";
import { getFieldOptions, getFieldRange } from "@/lib/catalog/fields";

export interface ValidationError {
  field?: string;
  message: string;
}

export const SOURCE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SOURCE_MAX_BYTES = 20 * 1024 * 1024;
/** Shortest side below this is likely to produce a soft result at output sizes. */
export const SOURCE_MIN_DIMENSION = 512;
/** Aspect ratios beyond this can't fill standard output shapes. */
export const SOURCE_MAX_ASPECT = 3;

export type SourceImageClass = "rejected" | "warning" | "accepted";

export interface SourceImageVerdict {
  class: SourceImageClass;
  message?: string;
}

/** Hard rules known before decode: type and size. Rejects block generation. */
export function classifySourceFile(file: {
  type: string;
  size: number;
}): SourceImageVerdict {
  if (!SOURCE_ALLOWED_TYPES.includes(file.type)) {
    return {
      class: "rejected",
      message: "Please select a JPEG, PNG, or WebP image.",
    };
  }
  if (file.size > SOURCE_MAX_BYTES) {
    return {
      class: "rejected",
      message: "Image must be 20 MB or smaller.",
    };
  }
  return { class: "accepted" };
}

/**
 * Soft rules known after decode: resolution and shape. Warnings are shown
 * inline but never block generation — the preview stays the confirmation.
 */
export function classifySourceDimensions(dims: {
  width: number;
  height: number;
}): SourceImageVerdict {
  const { width, height } = dims;
  if (!(width > 0) || !(height > 0)) return { class: "accepted" };
  const shortest = Math.min(width, height);
  if (shortest < SOURCE_MIN_DIMENSION) {
    return {
      class: "warning",
      message:
        "This photo is quite small — the result may look softer than usual.",
    };
  }
  if (Math.max(width, height) / shortest > SOURCE_MAX_ASPECT) {
    return {
      class: "warning",
      message: "This photo is an extreme shape — the result may be cropped.",
    };
  }
  return { class: "accepted" };
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

export function validateGenerationOptions(
  fields: PublicProductField[],
  options: Record<string, unknown>
): ValidationError | null {
  const allowedKeys = new Set(fields.map((f) => f.field_key));
  for (const key of Object.keys(options)) {
    if (!allowedKeys.has(key)) {
      return { field: key, message: `Unexpected option: ${key}` };
    }
  }

  for (const field of fields) {
    const value = options[field.field_key];

    if (field.required && isEmpty(value)) {
      return { field: field.field_key, message: `${field.label} is required` };
    }

    if (isEmpty(value)) continue;

    const stringValue = String(value);

    switch (field.field_type) {
      case "select":
      case "radio":
      case "layout":
      case "background":
      case "wardrobe":
      case "era":
      case "mood": {
        const allowed = getFieldOptions(field).map((o) => o.value);
        if (allowed.length > 0 && !allowed.includes(stringValue)) {
          return {
            field: field.field_key,
            message: `${field.label} has an invalid value`,
          };
        }
        break;
      }
      case "intensity": {
        const num = Number(stringValue);
        if (!Number.isFinite(num)) {
          return {
            field: field.field_key,
            message: `${field.label} must be a number`,
          };
        }
        const { min, max } = getFieldRange(field);
        if (num < min || num > max) {
          return {
            field: field.field_key,
            message: `${field.label} must be between ${min} and ${max}`,
          };
        }
        break;
      }
      case "color": {
        if (!/^#[0-9a-fA-F]{6}$/.test(stringValue)) {
          return {
            field: field.field_key,
            message: `${field.label} must be a hex color`,
          };
        }
        break;
      }
      case "toggle": {
        if (!["true", "false", "1", "0", "on", "off"].includes(stringValue)) {
          return {
            field: field.field_key,
            message: `${field.label} must be a boolean`,
          };
        }
        break;
      }
      case "short_text": {
        const maxLength =
          (field.validation?.maxLength as number | undefined) ?? Infinity;
        if (stringValue.length > maxLength) {
          return {
            field: field.field_key,
            message: `${field.label} is too long`,
          };
        }
        break;
      }
      default:
        break;
    }
  }

  return null;
}
