import { describe, expect, it } from "vitest";
import { productCreateSchema } from "@5pixels/shared";

describe("productCreateSchema", () => {
  it("accepts a valid filter", () => {
    const result = productCreateSchema.safeParse({
      type: "filter",
      name: "Midnight Premiere",
      slug: "midnight-premiere",
      public_status: "draft",
      visibility: "public",
      credit_cost: 2,
      version: {
        version_number: 1,
        state: "draft",
        private_instruction_template: "Cinematic portrait with dramatic lighting.",
        provider_strategy: {
          primary_provider: "fal.ai",
          primary_model: "flux-pro",
        },
        credit_cost: 2,
      },
      fields: [],
      filter_config: {
        style_archetype: "cinematic",
        identity_preservation: "high",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a poster without a layout", () => {
    const result = productCreateSchema.safeParse({
      type: "poster",
      name: "Event Flyer",
      slug: "event-flyer",
      public_status: "draft",
      visibility: "public",
      credit_cost: 3,
      version: {
        version_number: 1,
        state: "draft",
        private_instruction_template: "Bold graphic poster.",
        provider_strategy: {
          primary_provider: "fal.ai",
          primary_model: "flux-pro",
        },
        credit_cost: 3,
      },
      fields: [],
    });

    expect(result.success).toBe(false);
  });
});
