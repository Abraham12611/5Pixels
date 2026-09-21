import { describe, expect, it } from "vitest";
import {
  getFieldDefaultValue,
  getFieldOptions,
  normalizeField,
  sortFields,
} from "@/lib/catalog/fields";
import type { PublicProductField } from "@/types/catalog";

function makeField(
  overrides: Partial<PublicProductField> = {}
): PublicProductField {
  return {
    id: "field-1",
    field_key: "test_field",
    label: "Test Field",
    help_text: null,
    field_type: "short_text",
    required: false,
    sort_order: 0,
    config: {},
    validation: {},
    ...overrides,
  };
}

describe("getFieldDefaultValue", () => {
  it("returns default string for short_text", () => {
    const field = makeField({
      field_type: "short_text",
      config: { default: "hello" },
    });
    expect(getFieldDefaultValue(field)).toBe("hello");
  });

  it("returns empty string when short_text has no default", () => {
    const field = makeField({ field_type: "short_text" });
    expect(getFieldDefaultValue(field)).toBe("");
  });

  it("returns boolean default for toggle", () => {
    const field = makeField({
      field_type: "toggle",
      config: { default: true },
    });
    expect(getFieldDefaultValue(field)).toBe(true);
  });

  it("returns false toggle default when missing", () => {
    const field = makeField({ field_type: "toggle" });
    expect(getFieldDefaultValue(field)).toBe(false);
  });

  it("returns first option for select", () => {
    const field = makeField({
      field_type: "select",
      config: { options: ["a", "b"] },
    });
    expect(getFieldDefaultValue(field)).toBe("a");
  });

  it("returns color default", () => {
    const field = makeField({
      field_type: "color",
      config: { default: "#ff0000" },
    });
    expect(getFieldDefaultValue(field)).toBe("#ff0000");
  });

  it("returns midpoint for intensity", () => {
    const field = makeField({
      field_type: "intensity",
      config: { min: 10, max: 50, default: 25 },
    });
    expect(getFieldDefaultValue(field)).toBe(25);
  });

  it("clamps intensity default to max", () => {
    const field = makeField({
      field_type: "intensity",
      config: { min: 0, max: 10, default: 100 },
    });
    expect(getFieldDefaultValue(field)).toBe(10);
  });

  it("returns aspect_ratio default", () => {
    const field = makeField({
      field_type: "aspect_ratio",
      config: { default: "16:9" },
    });
    expect(getFieldDefaultValue(field)).toBe("16:9");
  });
});

describe("getFieldOptions", () => {
  it("normalizes string options", () => {
    const field = makeField({
      field_type: "select",
      config: { options: ["option-a", "option-b"] },
    });
    expect(getFieldOptions(field)).toEqual([
      { value: "option-a", label: "option-a" },
      { value: "option-b", label: "option-b" },
    ]);
  });

  it("normalizes object options", () => {
    const field = makeField({
      field_type: "radio",
      config: { options: [{ value: "a", label: "A" }] },
    });
    expect(getFieldOptions(field)).toEqual([{ value: "a", label: "A" }]);
  });

  it("returns empty array when options are missing", () => {
    const field = makeField({ field_type: "select" });
    expect(getFieldOptions(field)).toEqual([]);
  });
});

describe("normalizeField", () => {
  it("includes default value and options", () => {
    const field = makeField({
      field_type: "select",
      config: { default: "b", options: ["a", "b"] },
    });
    const normalized = normalizeField(field);
    expect(normalized.defaultValue).toBe("b");
    expect(normalized.options).toHaveLength(2);
  });

  it("includes range metadata for intensity", () => {
    const field = makeField({
      field_type: "intensity",
      config: { min: 0, max: 100, step: 5 },
    });
    const normalized = normalizeField(field);
    expect(normalized.min).toBe(0);
    expect(normalized.max).toBe(100);
    expect(normalized.step).toBe(5);
  });
});

describe("sortFields", () => {
  it("sorts by sort_order then label", () => {
    const fields = [
      makeField({ sort_order: 2, label: "B" }),
      makeField({ sort_order: 1, label: "A" }),
      makeField({ sort_order: 1, label: "Z" }),
    ];
    const sorted = sortFields(fields);
    expect(sorted[0].label).toBe("A");
    expect(sorted[1].label).toBe("Z");
    expect(sorted[2].label).toBe("B");
  });
});
