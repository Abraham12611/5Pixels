import { describe, expect, it } from "vitest";
import {
  familyAttribution,
  isDependentVariant,
  presetIndexPolicy,
} from "../discovery";

describe("isDependentVariant (#181)", () => {
  it("is false for roots and standalone presets", () => {
    expect(isDependentVariant({})).toBe(false);
    expect(isDependentVariant({ parent_preset_id: null })).toBe(false);
    expect(
      isDependentVariant({
        parent_preset_id: "p1",
        standalone_discoverable: true,
      })
    ).toBe(false);
  });

  it("is true for family children without the standalone opt-in", () => {
    expect(isDependentVariant({ parent_preset_id: "p1" })).toBe(true);
    expect(
      isDependentVariant({
        parent_preset_id: "p1",
        standalone_discoverable: false,
      })
    ).toBe(true);
  });
});

describe("presetIndexPolicy (#181)", () => {
  it("self-canonicals roots and standalone variants", () => {
    expect(presetIndexPolicy({ slug: "root-look" })).toEqual({
      canonical: "/presets/root-look",
      noindex: false,
    });
    expect(
      presetIndexPolicy({
        slug: "warm-look",
        parent_preset_id: "p1",
        standalone_discoverable: true,
        parent_slug: "root-look",
        parent_is_public: true,
      })
    ).toEqual({ canonical: "/presets/warm-look", noindex: false });
  });

  it("canonicals a dependent variant to its reachable parent", () => {
    expect(
      presetIndexPolicy({
        slug: "warm-look",
        parent_preset_id: "p1",
        standalone_discoverable: false,
        parent_slug: "root-look",
        parent_is_public: true,
      })
    ).toEqual({ canonical: "/presets/root-look", noindex: false });
  });

  it("noindexes a dependent variant whose parent is unreachable", () => {
    for (const parentIsPublic of [false, null, undefined]) {
      expect(
        presetIndexPolicy({
          slug: "warm-look",
          parent_preset_id: "p1",
          parent_slug: "root-look",
          parent_is_public: parentIsPublic,
        })
      ).toEqual({ canonical: null, noindex: true });
    }
  });
});

describe("familyAttribution (#181)", () => {
  it("attributes dependent variants to their parent", () => {
    expect(
      familyAttribution({
        slug: "warm-look",
        parent_preset_id: "p1",
        parent_slug: "root-look",
        parent_name: "Root Look",
      })
    ).toEqual({ slug: "root-look", name: "Root Look" });
  });

  it("falls back to the parent slug when the name is missing", () => {
    expect(
      familyAttribution({
        slug: "warm-look",
        parent_preset_id: "p1",
        parent_slug: "root-look",
      })
    ).toEqual({ slug: "root-look", name: "root-look" });
  });

  it("returns null for roots, standalone variants, and unresolved parents", () => {
    expect(familyAttribution({ slug: "root-look" })).toBeNull();
    expect(
      familyAttribution({
        slug: "warm-look",
        parent_preset_id: "p1",
        standalone_discoverable: true,
        parent_slug: "root-look",
      })
    ).toBeNull();
    expect(
      familyAttribution({ slug: "warm-look", parent_preset_id: "p1" })
    ).toBeNull();
  });
});
