import { describe, expect, it } from "vitest";
import { validateGenerationOptions } from "../validation";
import type { PublicProductField } from "@/types/catalog";

const baseFields: PublicProductField[] = [
  {
    id: "f1",
    field_key: "style",
    label: "Style",
    help_text: null,
    field_type: "select",
    required: true,
    sort_order: 0,
    config: {
      options: [
        { value: "cinematic", label: "Cinematic" },
        { value: "vintage", label: "Vintage" },
      ],
    },
    validation: {},
  },
  {
    id: "f2",
    field_key: "intensity",
    label: "Intensity",
    help_text: null,
    field_type: "intensity",
    required: false,
    sort_order: 1,
    config: { min: 0, max: 100 },
    validation: {},
  },
  {
    id: "f3",
    field_key: "color",
    label: "Color",
    help_text: null,
    field_type: "color",
    required: false,
    sort_order: 2,
    config: {},
    validation: {},
  },
];

describe("validateGenerationOptions", () => {
  it("passes valid options", () => {
    expect(
      validateGenerationOptions(baseFields, {
        style: "cinematic",
        intensity: 50,
        color: "#FFFFFF",
      })
    ).toBeNull();
  });

  it("rejects missing required fields", () => {
    const result = validateGenerationOptions(baseFields, {});
    expect(result).not.toBeNull();
    expect(result?.field).toBe("style");
  });

  it("rejects unknown fields", () => {
    const result = validateGenerationOptions(baseFields, {
      style: "cinematic",
      extra: "value",
    });
    expect(result?.field).toBe("extra");
  });

  it("rejects out-of-range numeric values", () => {
    const result = validateGenerationOptions(baseFields, {
      style: "cinematic",
      intensity: 101,
    });
    expect(result?.field).toBe("intensity");
  });

  it("rejects invalid color format", () => {
    const result = validateGenerationOptions(baseFields, {
      style: "cinematic",
      color: "red",
    });
    expect(result?.field).toBe("color");
  });

  it("rejects invalid select value", () => {
    const result = validateGenerationOptions(baseFields, {
      style: "fantasy",
    });
    expect(result?.field).toBe("style");
  });
});
