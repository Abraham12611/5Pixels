import { describe, expect, it } from "vitest";
import {
  productFieldSchema,
  productFieldConfigSchema,
  providerStrategySchema,
  productCreateSchema,
} from "@5pixels/shared";

describe("productFieldConfigSchema", () => {
  it("accepts a default string value", () => {
    const result = productFieldConfigSchema.safeParse({
      default: "office",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default).toBe("office");
    }
  });

  it("accepts a default numeric value", () => {
    const result = productFieldConfigSchema.safeParse({
      default: 50,
      min: 0,
      max: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default).toBe(50);
    }
  });

  it("accepts a default boolean value", () => {
    const result = productFieldConfigSchema.safeParse({
      default: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.default).toBe(true);
    }
  });

  it("accepts options array with value/label pairs", () => {
    const result = productFieldConfigSchema.safeParse({
      options: [
        { value: "gray", label: "Gray" },
        { value: "office", label: "Office" },
      ],
      default: "gray",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object", () => {
    const result = productFieldConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("productFieldSchema with config.default", () => {
  it("validates a select field with options and default", () => {
    const result = productFieldSchema.safeParse({
      field_key: "background",
      label: "Background",
      field_type: "select",
      required: true,
      sort_order: 0,
      config: {
        options: [
          { value: "gray", label: "Gray" },
          { value: "office", label: "Office" },
        ],
        default: "gray",
      },
      validation: {},
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates an intensity field with min/max/step/default", () => {
    const result = productFieldSchema.safeParse({
      field_key: "intensity",
      label: "Intensity",
      field_type: "intensity",
      required: false,
      sort_order: 1,
      config: {
        min: 0,
        max: 100,
        step: 5,
        default: 50,
      },
      validation: {},
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates a short_text field with validation rules", () => {
    const result = productFieldSchema.safeParse({
      field_key: "title",
      label: "Title",
      field_type: "short_text",
      required: true,
      sort_order: 0,
      config: { default: "" },
      validation: {
        minLength: 1,
        maxLength: 50,
        pattern: "^[a-zA-Z0-9 ]+$",
      },
      active: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("providerStrategySchema with fallback", () => {
  it("accepts a strategy with fallback provider and model", () => {
    const result = providerStrategySchema.safeParse({
      primary_provider: "fal.ai",
      primary_model: "flux/dev/image-to-image",
      fallback_provider: "fal.ai",
      fallback_model: "flux-pro",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fallback_provider).toBe("fal.ai");
      expect(result.data.fallback_model).toBe("flux-pro");
    }
  });

  it("accepts a strategy without fallback", () => {
    const result = providerStrategySchema.safeParse({
      primary_provider: "fal.ai",
      primary_model: "flux/dev/image-to-image",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fallback_provider).toBeUndefined();
      expect(result.data.fallback_model).toBeUndefined();
    }
  });
});

describe("productCreateSchema with fallback and fields", () => {
  it("accepts a filter with fallback provider and configured fields", () => {
    const result = productCreateSchema.safeParse({
      type: "filter",
      name: "Cyber Punk",
      slug: "cyber-punk",
      public_status: "draft",
      visibility: "public",
      credit_cost: 2,
      version: {
        version_number: 1,
        state: "draft",
        private_instruction_template: "Cyberpunk style portrait.",
        provider_strategy: {
          primary_provider: "fal.ai",
          primary_model: "flux/dev/image-to-image",
          fallback_provider: "fal.ai",
          fallback_model: "flux-pro",
        },
        credit_cost: 2,
      },
      fields: [
        {
          field_key: "background",
          label: "Background",
          field_type: "select",
          required: false,
          sort_order: 0,
          config: {
            options: [
              { value: "neon", label: "Neon City" },
              { value: "dark", label: "Dark Alley" },
            ],
            default: "neon",
          },
          validation: {},
          active: true,
        },
      ],
      filter_config: {
        style_archetype: "cyberpunk",
        identity_preservation: "high",
      },
    });
    expect(result.success).toBe(true);
  });
});
