import { describe, expect, it } from "vitest";
import {
  validateCapabilityForRoute,
  validateFamilyAssignment,
  type ParentCandidate,
} from "./preset-family";
import type { RouteCapability } from "@/lib/ai/route-capabilities";
import type { VersionInputCapability } from "@5pixels/shared";

const ROOT_PARENT: ParentCandidate = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "filter",
  public_status: "published",
  parent_preset_id: null,
};

function capability(
  overrides: Partial<VersionInputCapability> = {}
): VersionInputCapability {
  return {
    input_mode: "single",
    input_min_images: 1,
    input_max_images: 1,
    input_image_roles: [],
    prompt_override_enabled: false,
    prompt_max_chars: 0,
    ...overrides,
  };
}

const VERIFIED_ROUTE: RouteCapability = {
  max_input_images: 14,
  supports_prompt_edit: true,
  accepted_roles: null,
  source: "test",
};

describe("validateFamilyAssignment", () => {
  it("accepts a standalone preset with no parent", () => {
    expect(
      validateFamilyAssignment({ type: "filter", hasChildren: false })
    ).toEqual([]);
  });

  it("accepts a variant of a published root parent of the same type", () => {
    expect(
      validateFamilyAssignment({
        productId: "22222222-2222-4222-8222-222222222222",
        type: "filter",
        parentPresetId: ROOT_PARENT.id,
        hasChildren: false,
        parent: ROOT_PARENT,
      })
    ).toEqual([]);
  });

  it("rejects self-parenting", () => {
    const self = "22222222-2222-4222-8222-222222222222";
    const errors = validateFamilyAssignment({
      productId: self,
      type: "filter",
      parentPresetId: self,
      hasChildren: false,
      parent: { ...ROOT_PARENT, id: self },
    });
    expect(errors.join()).toMatch(/own parent/i);
  });

  it("rejects a nested parent (another variant)", () => {
    const errors = validateFamilyAssignment({
      type: "filter",
      parentPresetId: ROOT_PARENT.id,
      hasChildren: false,
      parent: { ...ROOT_PARENT, parent_preset_id: "x" },
    });
    expect(errors.join()).toMatch(/single-level|root preset/i);
  });

  it("rejects a retired parent", () => {
    const errors = validateFamilyAssignment({
      type: "filter",
      parentPresetId: ROOT_PARENT.id,
      hasChildren: false,
      parent: { ...ROOT_PARENT, public_status: "retired" },
    });
    expect(errors.join()).toMatch(/retired/i);
  });

  it("rejects a missing parent", () => {
    const errors = validateFamilyAssignment({
      type: "filter",
      parentPresetId: ROOT_PARENT.id,
      hasChildren: false,
      parent: null,
    });
    expect(errors.join()).toMatch(/does not exist/i);
  });

  it("rejects a type mismatch between variant and parent", () => {
    const errors = validateFamilyAssignment({
      type: "poster",
      parentPresetId: ROOT_PARENT.id,
      hasChildren: false,
      parent: ROOT_PARENT,
    });
    expect(errors.join()).toMatch(/type must match/i);
  });

  it("rejects a preset with children becoming a variant", () => {
    const errors = validateFamilyAssignment({
      type: "filter",
      parentPresetId: ROOT_PARENT.id,
      hasChildren: true,
      parent: ROOT_PARENT,
    });
    expect(errors.join()).toMatch(/already has variants/i);
  });
});

describe("validateCapabilityForRoute", () => {
  it("accepts the single-image no-prompt default on any route", () => {
    expect(
      validateCapabilityForRoute({
        capability: capability(),
        routeCapability: null,
        endpoint: null,
        adminReferenceCount: 0,
      })
    ).toEqual([]);
  });

  it("fails closed on unverified routes for multi-image", () => {
    const errors = validateCapabilityForRoute({
      capability: capability({ input_mode: "multi", input_max_images: 2 }),
      routeCapability: null,
      endpoint: "fal-ai/unknown-model",
      adminReferenceCount: 0,
    });
    expect(errors.join()).toMatch(/no verified input capability/i);
  });

  it("fails closed on unverified routes for prompt overrides", () => {
    const errors = validateCapabilityForRoute({
      capability: capability({
        prompt_override_enabled: true,
        prompt_max_chars: 200,
      }),
      routeCapability: null,
      endpoint: "fal-ai/unknown-model",
      adminReferenceCount: 0,
    });
    expect(errors.join()).toMatch(/no verified input capability/i);
  });

  it("rejects a declared max above the route's remaining headroom", () => {
    const errors = validateCapabilityForRoute({
      capability: capability({
        input_mode: "multi",
        input_max_images: 13,
        input_min_images: 2,
      }),
      routeCapability: VERIFIED_ROUTE, // 14 total
      endpoint: "fal-ai/nano-banana-2/edit",
      adminReferenceCount: 2,
    });
    expect(errors.join()).toMatch(/does not fit/i);
  });

  it("accepts a max that fits alongside admin reference assets", () => {
    expect(
      validateCapabilityForRoute({
        capability: capability({
          input_mode: "multi",
          input_min_images: 1,
          input_max_images: 12,
        }),
        routeCapability: VERIFIED_ROUTE, // 14 total − 2 refs = 12
        endpoint: "fal-ai/nano-banana-2/edit",
        adminReferenceCount: 2,
      })
    ).toEqual([]);
  });

  it("rejects declared roles the route does not support", () => {
    const errors = validateCapabilityForRoute({
      capability: capability({
        input_mode: "multi",
        input_min_images: 2,
        input_max_images: 2,
        input_image_roles: [
          { name: "subject", optional: false },
          { name: "key_light", optional: true },
        ],
      }),
      routeCapability: { ...VERIFIED_ROUTE, accepted_roles: ["subject"] },
      endpoint: "fal-ai/role-route",
      adminReferenceCount: 0,
    });
    expect(errors.join()).toMatch(/key_light/);
  });

  it("accepts order-based roles on routes that take an ordered image list", () => {
    expect(
      validateCapabilityForRoute({
        capability: capability({
          input_mode: "multi",
          input_min_images: 2,
          input_max_images: 2,
          input_image_roles: [
            { name: "subject", optional: false },
            { name: "style_reference", optional: true },
          ],
        }),
        routeCapability: VERIFIED_ROUTE, // accepted_roles: null
        endpoint: "fal-ai/nano-banana-2/edit",
        adminReferenceCount: 0,
      })
    ).toEqual([]);
  });

  it("rejects prompt overrides on routes without prompt support", () => {
    const errors = validateCapabilityForRoute({
      capability: capability({
        prompt_override_enabled: true,
        prompt_max_chars: 200,
      }),
      routeCapability: { ...VERIFIED_ROUTE, supports_prompt_edit: false },
      endpoint: "fal-ai/no-prompt",
      adminReferenceCount: 0,
    });
    expect(errors.join()).toMatch(/prompt/i);
  });
});
