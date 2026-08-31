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
        private_instruction_template:
          "Cinematic portrait with dramatic lighting.",
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

  it("accepts all product asset foreign keys", () => {
    const assetId = "77bd0d44-6be1-4a65-aeaa-b50d98fa2671";
    const result = productCreateSchema.safeParse({
      type: "filter",
      name: "Media Filter",
      slug: "media-filter",
      hero_asset_id: assetId,
      poster_asset_id: assetId,
      preview_video_asset_id: assetId,
      preview_gif_asset_id: assetId,
      version: {
        version_number: 1,
        state: "draft",
        private_instruction_template: "Apply a media filter.",
        provider_strategy: {
          primary_provider: "provider",
          primary_model: "model",
        },
        credit_cost: 1,
      },
      fields: [],
      filter_config: { style_archetype: "media" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hero_asset_id).toBe(assetId);
      expect(result.data.poster_asset_id).toBe(assetId);
      expect(result.data.preview_video_asset_id).toBe(assetId);
      expect(result.data.preview_gif_asset_id).toBe(assetId);
    }
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
