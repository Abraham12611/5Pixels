import { describe, expect, it } from "vitest";
import {
  assetLinkProblems,
  checkDraftItem,
  defaultInternalOnly,
  isVersionBoundRole,
  mediaKindForRole,
  similarSlugWarning,
  type DraftItemContext,
  type LinkedAssetShape,
} from "@/lib/preset-factory/draft-checks";
import type { PresetDraftItem } from "@/lib/preset-factory/contract";

/**
 * Issue #271 — pure draft-check coverage.
 *
 * UNEXECUTED per the owner's manual-only testing policy (#270): written for
 * review; do not run until the owner authorizes automated testing.
 */

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function presetMediaAsset(
  overrides: Partial<LinkedAssetShape> = {}
): LinkedAssetShape {
  return {
    id: uuid(1),
    bucket: "preset-media",
    media_type: "image",
    mime_type: "image/png",
    visibility: "public",
    moderation_status: "approved",
    deleted_at: null,
    ...overrides,
  };
}

function validItem(overrides: Partial<PresetDraftItem> = {}): PresetDraftItem {
  return {
    client_item_id: "item-1",
    idempotency_key: "0123456789abcdef",
    product: {
      type: "filter",
      slug: "cinematic-noir-01",
      name: "Cinematic Noir",
      category_id: uuid(10),
      visibility: "public",
      standalone_discoverable: false,
      variant_sort_order: 0,
      filter_config: { style_archetype: "noir" },
    },
    version: {
      private_instruction_template: "hidden recipe",
      provider_strategy: {
        primary_provider: "fal-ai",
        primary_model: "nano-banana/edit",
      },
      model_config: {},
      input_validation_config: {},
      input_capability: {
        input_mode: "single",
        input_min_images: 1,
        input_max_images: 1,
        input_image_roles: [],
        prompt_override_enabled: false,
        prompt_max_chars: 0,
      },
      post_process_config: {},
      safety_config: {},
      credit_cost: 0,
    },
    fields: [],
    asset_links: [],
    ...overrides,
  } as PresetDraftItem;
}

function validCtx(overrides: Partial<DraftItemContext> = {}): DraftItemContext {
  return {
    categoryExists: true,
    categoryIsActive: true,
    parent: null,
    endpoint: "fal-ai/nano-banana/edit",
    routeCapability: {
      max_input_images: 3,
      supports_prompt_edit: true,
      accepted_roles: null,
      source: "test",
    },
    modelVerified: true,
    assets: new Map(),
    existingSlugs: ["existing-preset"],
    multiInputReleased: false,
    userPromptReleased: false,
    ...overrides,
  };
}

describe("mediaKindForRole / defaults", () => {
  it("maps roles to required media kinds", () => {
    expect(mediaKindForRole("preview_video")).toBe("video");
    expect(mediaKindForRole("preview_gif")).toBe("gif");
    expect(mediaKindForRole("hero")).toBe("image");
    expect(mediaKindForRole("style_reference")).toBe("image");
    expect(mediaKindForRole("bogus")).toBeNull();
  });

  it("defaults reference roles to internal-only and version-bound", () => {
    expect(defaultInternalOnly("style_reference")).toBe(true);
    expect(defaultInternalOnly("hero")).toBe(false);
    expect(isVersionBoundRole("layout_reference")).toBe(true);
    expect(isVersionBoundRole("example_result")).toBe(false);
  });
});

describe("assetLinkProblems", () => {
  it("rejects missing, deleted, private, non-preset-media, rejected assets", () => {
    expect(assetLinkProblems(null, "hero")).toContain(
      "referenced asset does not exist"
    );
    expect(
      assetLinkProblems(presetMediaAsset({ deleted_at: "x" }), "hero")
    ).toContain("asset is deleted");
    expect(
      assetLinkProblems(presetMediaAsset({ bucket: "user-assets" }), "hero")
    ).toContain("asset is not in the preset-media bucket");
    expect(
      assetLinkProblems(presetMediaAsset({ visibility: "private" }), "hero")
    ).toContain("asset is not a public preset-media asset");
    expect(
      assetLinkProblems(
        presetMediaAsset({ moderation_status: "rejected" }),
        "hero"
      )
    ).toContain("asset was rejected by moderation");
  });

  it("enforces media kind per role", () => {
    expect(
      assetLinkProblems(presetMediaAsset({ media_type: "video" }), "hero")
    ).toContain('role "hero" requires an image asset');
    expect(assetLinkProblems(presetMediaAsset(), "preview_video")).toContain(
      'role "preview_video" requires a video asset'
    );
    expect(assetLinkProblems(presetMediaAsset(), "preview_gif")).toContain(
      'role "preview_gif" requires a GIF asset'
    );
    expect(
      assetLinkProblems(
        presetMediaAsset({ media_type: "video", mime_type: "video/mp4" }),
        "preview_video"
      )
    ).toHaveLength(0);
  });
});

describe("similarSlugWarning", () => {
  it("flags suffix-only differences", () => {
    expect(similarSlugWarning("golden-hour-2", ["golden-hour"])).toContain(
      "confusingly similar"
    );
    expect(similarSlugWarning("golden-hour-copy", ["golden-hour"])).toContain(
      "confusingly similar"
    );
    expect(similarSlugWarning("golden-hour", ["golden-hour"])).toBeNull();
    expect(similarSlugWarning("blue-noir", ["golden-hour"])).toBeNull();
  });
});

describe("checkDraftItem", () => {
  it("passes a consistent draft (warnings only for missing media)", () => {
    const { errors, warnings } = checkDraftItem(validItem(), validCtx());
    expect(errors).toHaveLength(0);
    expect(warnings.map((w) => w.field)).toContain("product.hero_asset_id");
    expect(warnings.map((w) => w.field)).toContain("product.poster_asset_id");
  });

  it("rejects an existing slug and an unverified model", () => {
    const dup = checkDraftItem(
      validItem(),
      validCtx({ existingSlugs: ["cinematic-noir-01"] })
    );
    expect(dup.errors.map((e) => e.code)).toContain("slug_conflict");

    const unverified = checkDraftItem(
      validItem(),
      validCtx({ modelVerified: false })
    );
    expect(unverified.errors.map((e) => e.code)).toContain("model_unverified");
  });

  it("rejects missing categories and invalid parents", () => {
    const noCat = checkDraftItem(
      validItem(),
      validCtx({ categoryExists: false })
    );
    expect(noCat.errors.map((e) => e.code)).toContain("category_not_found");

    const nested = checkDraftItem(
      validItem({
        product: {
          ...validItem().product,
          parent_preset_id: uuid(20),
          variant_display_name: "v",
        },
      }),
      validCtx({
        parent: {
          id: uuid(20),
          type: "filter",
          public_status: "active",
          parent_preset_id: uuid(21), // a variant — not a root
        },
      })
    );
    expect(nested.errors.map((e) => e.code)).toContain("parent_invalid");
  });

  it("rejects multi-image capability on an unverified route but only warns on unreleased flags", () => {
    const multi = validItem({
      version: {
        ...validItem().version,
        input_capability: {
          input_mode: "multi",
          input_min_images: 1,
          input_max_images: 3,
          input_image_roles: [],
          prompt_override_enabled: false,
          prompt_max_chars: 0,
        },
      },
    });
    const unverified = checkDraftItem(
      multi,
      validCtx({ routeCapability: null })
    );
    expect(unverified.errors.map((e) => e.code)).toContain(
      "capability_invalid"
    );

    const gated = checkDraftItem(multi, validCtx());
    expect(gated.errors).toHaveLength(0);
    expect(gated.warnings.some((w) => w.message.includes("gated off"))).toBe(
      true
    );
  });

  it("reports asset violations per link", () => {
    const item = validItem({
      asset_links: [
        { asset_id: uuid(30), role: "style_reference", sort_order: 0 },
      ],
    });
    const ctx = validCtx({
      assets: new Map([
        [uuid(30), presetMediaAsset({ bucket: "user-assets" })],
      ]),
    });
    const { errors } = checkDraftItem(item, ctx);
    expect(errors.map((e) => e.code)).toContain("asset_invalid");
    expect(errors[0]?.message).toContain("style_reference");
  });
});
