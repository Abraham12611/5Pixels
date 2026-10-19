import { describe, expect, it } from "vitest";
import {
  buildSiblingHandoffs,
  planVariantRestore,
} from "@/lib/generation/variant-handoff";
import type { FamilyRailMember } from "@/lib/catalog/family";
import type {
  PublicInputCapability,
  PublicProductField,
} from "@/types/catalog";

const SINGLE_NO_PROMPT: PublicInputCapability = {
  mode: "single",
  min_images: 1,
  max_images: 1,
  roles: [],
  prompt: { enabled: false, max_chars: 0 },
};

const PROMPTABLE: PublicInputCapability = {
  mode: "single",
  min_images: 1,
  max_images: 1,
  roles: [],
  prompt: { enabled: true, max_chars: 200 },
};

/** Two-slot multi target where BOTH roles are required — order chosen to
 *  differ from the source ordering in tests below. */
const ROLE_TARGET: PublicInputCapability = {
  mode: "multi",
  min_images: 2,
  max_images: 2,
  roles: [
    { name: "background", optional: false },
    { name: "subject", optional: false },
  ],
  prompt: { enabled: false, max_chars: 0 },
};

function member(overrides: Partial<FamilyRailMember>): FamilyRailMember {
  return {
    productId: "p",
    slug: "preset",
    name: "Preset",
    label: "Preset",
    isParent: false,
    isCurrent: false,
    available: true,
    creditCost: 4,
    previewUrl: null,
    inputCapability: SINGLE_NO_PROMPT,
    ...overrides,
  };
}

const NO_FIELDS: PublicProductField[] = [];
const GRAIN_FIELD: PublicProductField[] = [
  {
    id: "f1",
    field_key: "grain",
    label: "Grain",
    help_text: null,
    field_type: "slider",
    required: false,
    sort_order: 1,
    config: {},
    validation: {},
  },
];

describe("buildSiblingHandoffs (#184)", () => {
  it("builds a create link per member with the generation id", () => {
    const handoffs = buildSiblingHandoffs({
      members: [
        member({ productId: "root", slug: "root" }),
        member({ productId: "v1", slug: "warm" }),
      ],
      generationId: "gen-1",
      images: [{ assetId: "a1", role: null }],
      prompt: null,
    });
    expect(handoffs[1].hrefFor("original")).toBe(
      "/app/create/warm?variant_from=gen-1"
    );
    expect(handoffs[1].hrefFor("output")).toBe(
      "/app/create/warm?variant_from=gen-1&variant_source=output"
    );
    expect(handoffs[1].carriedCount).toBe(1);
  });

  it("assesses prompt carry per sibling without exposing the text", () => {
    const handoffs = buildSiblingHandoffs({
      members: [
        member({ productId: "no", slug: "no" }),
        member({
          productId: "yes",
          slug: "yes",
          inputCapability: PROMPTABLE,
        }),
      ],
      generationId: "gen-1",
      images: [{ assetId: "a1", role: null }],
      prompt: "softer light",
    });
    expect(handoffs[0].notices[0]).toMatch(/prompt/i);
    expect(handoffs[1].notices).toEqual([]);
  });
});

describe("planVariantRestore (#184)", () => {
  it("orders carried images: first is the source, rest are extras", () => {
    const plan = planVariantRestore({
      capability: {
        ...SINGLE_NO_PROMPT,
        mode: "multi",
        min_images: 1,
        max_images: 3,
      },
      images: [
        { assetId: "a", role: null },
        { assetId: "b", role: null },
      ],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: null,
    });
    expect(plan.sourceInput).toEqual({ assetId: "a", role: null });
    expect(plan.extraInputs).toEqual([{ assetId: "b", role: null }]);
  });

  it("drops images beyond the single-image target with an explanation", () => {
    const plan = planVariantRestore({
      capability: SINGLE_NO_PROMPT,
      images: [
        { assetId: "a", role: null },
        { assetId: "b", role: null },
      ],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: null,
    });
    expect(plan.sourceInput).toEqual({ assetId: "a", role: null });
    expect(plan.extraInputs).toEqual([]);
    expect(plan.notices.some((n) => /at most 1 image/i.test(n))).toBe(true);
  });

  it("keeps each image's destination role even when siblings order slots differently", () => {
    // Source run declared [subject, background]; the sibling declares the
    // SAME roles in the opposite slot order. The carried roles must stay
    // bound to the images — positional restore would swap them silently.
    const plan = planVariantRestore({
      capability: ROLE_TARGET,
      images: [
        { assetId: "subj", role: "subject" },
        { assetId: "bg", role: "background" },
      ],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: null,
    });
    expect(plan.sourceInput).toEqual({ assetId: "subj", role: "subject" });
    expect(plan.extraInputs).toEqual([{ assetId: "bg", role: "background" }]);
    expect(plan.notices).toEqual([]);
  });

  it("reports missing required roles after carrying", () => {
    const plan = planVariantRestore({
      capability: ROLE_TARGET, // needs background + subject
      images: [{ assetId: "subj", role: "subject" }],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: null,
    });
    expect(plan.sourceInput).toEqual({ assetId: "subj", role: "subject" });
    expect(plan.extraInputs).toEqual([]);
    expect(
      plan.notices.some((n) => /needs a “background” image/.test(n))
    ).toBe(true);
  });

  it("drops an image whose role the target never declares", () => {
    const plan = planVariantRestore({
      capability: ROLE_TARGET,
      images: [
        { assetId: "subj", role: "subject" },
        { assetId: "bg", role: "background" },
        { assetId: "outfit", role: "outfit" },
      ],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: null,
    });
    expect(plan.extraInputs.map((i) => i.assetId)).toEqual(["bg"]);
    expect(
      plan.notices.some((n) => /no “outfit” image slot/.test(n))
    ).toBe(true);
  });

  it("surfaces a suggested slot instead of silently reassigning it", () => {
    // An unassigned source image can fill the target's named slots — the
    // plan passes the resolved role through (so the form places it there)
    // AND emits the notice announcing that placement.
    const plan = planVariantRestore({
      capability: ROLE_TARGET,
      images: [
        { assetId: "subj", role: "subject" },
        { assetId: "extra", role: null },
      ],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: null,
    });
    expect(plan.extraInputs).toEqual([{ assetId: "extra", role: "background" }]);
    expect(
      plan.notices.some((n) => /used as “background”/.test(n))
    ).toBe(true);
  });

  it("carries only fields the target declares and counts the rest", () => {
    const plan = planVariantRestore({
      capability: SINGLE_NO_PROMPT,
      images: [{ assetId: "a", role: null }],
      requestedOptions: { grain: 40, border: true, missing: "x" },
      activeFields: GRAIN_FIELD,
      prompt: null,
    });
    expect(plan.options).toEqual({ grain: 40 });
    expect(plan.notices.some((n) => /2 settings/i.test(n))).toBe(true);
  });

  it("passes the prompt through untouched — the form applies the gate", () => {
    const plan = planVariantRestore({
      capability: SINGLE_NO_PROMPT,
      images: [{ assetId: "a", role: null }],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: " softer light ",
    });
    expect(plan.prompt).toBe(" softer light ");
  });

  it("uses the output asset as source when the derivative mode is chosen", () => {
    const plan = planVariantRestore({
      capability: SINGLE_NO_PROMPT,
      images: [{ assetId: "a", role: null }],
      requestedOptions: null,
      activeFields: NO_FIELDS,
      prompt: null,
      outputAssetId: "out-1",
    });
    // The finished result has no declared role — positional fill.
    expect(plan.sourceInput).toEqual({ assetId: "out-1", role: null });
    expect(plan.extraInputs).toEqual([]);
    expect(plan.notices.some((n) => /finished result/i.test(n))).toBe(true);
  });
});
