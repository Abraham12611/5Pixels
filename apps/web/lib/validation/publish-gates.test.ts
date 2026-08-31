import { describe, expect, it } from "vitest";
import {
  MIN_OWNER_OVERRIDE_REASON_LENGTH,
  ownerOverrideReasonSchema,
  validatePublishGates,
} from "./publish-gates";

const assetId = "77bd0d44-6be1-4a65-aeaa-b50d98fa2671";

function validProduct(type: "filter" | "poster" = "filter") {
  return {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    type,
    name: "Midnight Premiere",
    slug: "midnight-premiere",
    public_status: "draft" as const,
    hero_asset_id: assetId,
    poster_asset_id: assetId,
    metadata:
      type === "filter"
        ? { filter_config: { style_archetype: "cinematic" } }
        : {
            poster_config: {
              layout_template: "portrait" as const,
              text_fields: [],
              text_layer_config: {
                position: "bottom" as const,
                size: "medium" as const,
                color: "#F7F2E8",
                alignment: "center" as const,
              },
              background_handling: "replace" as const,
            },
          },
  };
}

function validVersion() {
  return {
    id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    product_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    version_number: 1,
    state: "draft" as const,
    private_instruction_template: "Cinematic portrait.",
    provider_strategy: {
      primary_provider: "fal.ai",
      primary_model: "flux-pro",
    },
    safety_config: {
      allowed_nsfw: false,
      block_public_figures: true,
      block_minors: true,
    },
    credit_cost: 2,
  };
}

describe("validatePublishGates", () => {
  it("passes for a complete filter", () => {
    const result = validatePublishGates(
      validProduct("filter"),
      validVersion(),
      []
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.failures).toHaveLength(0);
  });

  it("passes for a complete poster", () => {
    const result = validatePublishGates(
      validProduct("poster"),
      validVersion(),
      []
    );
    expect(result.ok).toBe(true);
  });

  it("rejects missing product name", () => {
    const product = { ...validProduct(), name: "" };
    const result = validatePublishGates(product, validVersion(), []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.some((f) => f.code === "MISSING_PRODUCT_NAME")).toBe(
      true
    );
  });

  it("rejects invalid slug", () => {
    const product = { ...validProduct(), slug: "Invalid Slug" };
    const result = validatePublishGates(product, validVersion(), []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.some((f) => f.code === "INVALID_SLUG")).toBe(true);
  });

  it("rejects missing hero asset", () => {
    const product = { ...validProduct(), hero_asset_id: undefined };
    const result = validatePublishGates(product, validVersion(), []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.some((f) => f.code === "MISSING_HERO_ASSET")).toBe(
      true
    );
  });

  it("rejects missing poster asset", () => {
    const product = { ...validProduct(), poster_asset_id: undefined };
    const result = validatePublishGates(product, validVersion(), []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.some((f) => f.code === "MISSING_POSTER_ASSET")).toBe(
      true
    );
  });

  it("rejects missing primary provider", () => {
    const version = {
      ...validVersion(),
      provider_strategy: { primary_provider: "", primary_model: "flux-pro" },
    };
    const result = validatePublishGates(validProduct(), version, []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(
      result.failures.some((f) => f.code === "MISSING_PRIMARY_PROVIDER")
    ).toBe(true);
  });

  it("rejects missing primary model", () => {
    const version = {
      ...validVersion(),
      provider_strategy: { primary_provider: "fal.ai", primary_model: "" },
    };
    const result = validatePublishGates(validProduct(), version, []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(
      result.failures.some((f) => f.code === "MISSING_PRIMARY_MODEL")
    ).toBe(true);
  });

  it("rejects credit cost of zero", () => {
    const version = { ...validVersion(), credit_cost: 0 };
    const result = validatePublishGates(validProduct(), version, []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.some((f) => f.code === "INVALID_CREDIT_COST")).toBe(
      true
    );
  });

  it("rejects missing safety config booleans", () => {
    const version = {
      ...validVersion(),
      safety_config: { allowed_nsfw: "nope" },
    };
    const result = validatePublishGates(validProduct(), version, []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(
      result.failures.filter((f) => f.code === "INVALID_SAFETY_CONFIG")
    ).toHaveLength(3);
  });

  it("rejects poster without layout template", () => {
    const product = {
      ...validProduct("poster"),
      metadata: { poster_config: {} },
    };
    const result = validatePublishGates(product, validVersion(), []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(
      result.failures.some((f) => f.code === "INVALID_POSTER_LAYOUT")
    ).toBe(true);
  });

  it("rejects filter without style archetype", () => {
    const product = {
      ...validProduct("filter"),
      metadata: { filter_config: {} },
    };
    const result = validatePublishGates(product, validVersion(), []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(
      result.failures.some((f) => f.code === "MISSING_FILTER_CONFIG")
    ).toBe(true);
  });

  it("rejects invalid product type", () => {
    const product = { ...validProduct(), type: "invalid" as const };
    const result = validatePublishGates(product, validVersion(), []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.some((f) => f.code === "INVALID_PRODUCT_TYPE")).toBe(
      true
    );
  });

  it("allows empty fields array", () => {
    const result = validatePublishGates(validProduct(), validVersion(), []);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid field schema", () => {
    const result = validatePublishGates(validProduct(), validVersion(), [
      {
        field_key: "Bad Key",
        label: "Bad Key",
        field_type: "short_text",
        required: false,
        sort_order: 0,
        config: {},
        validation: {},
        active: true,
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.some((f) => f.code === "INVALID_FIELD_SCHEMA")).toBe(
      true
    );
  });

  it("returns multiple failures at once", () => {
    const product = {
      ...validProduct(),
      name: "",
      slug: "Bad Slug",
      hero_asset_id: undefined,
      poster_asset_id: undefined,
    };
    const version = {
      ...validVersion(),
      provider_strategy: { primary_provider: "", primary_model: "" },
      credit_cost: 0,
    };
    const result = validatePublishGates(product, version, []);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failures");
    expect(result.failures.length).toBeGreaterThanOrEqual(6);
  });
});

describe("ownerOverrideReasonSchema", () => {
  it("accepts a meaningful reason", () => {
    const reason = "Override required for launch.";
    const result = ownerOverrideReasonSchema.safeParse(reason);
    expect(result.success).toBe(true);
  });

  it("rejects a short reason", () => {
    const result = ownerOverrideReasonSchema.safeParse("ok");
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only reason", () => {
    const result = ownerOverrideReasonSchema.safeParse("   ");
    expect(result.success).toBe(false);
  });

  it("trims the reason", () => {
    const result = ownerOverrideReasonSchema.safeParse(
      `  ${"a".repeat(MIN_OWNER_OVERRIDE_REASON_LENGTH)}  `
    );
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toHaveLength(MIN_OWNER_OVERRIDE_REASON_LENGTH);
  });
});
