import type { PublicProductField } from "@/types/catalog";
import { getFieldOptions, getFieldRange } from "@/lib/catalog/fields";

export interface ValidationError {
  field?: string;
  message: string;
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
