import { describe, expect, it } from "vitest";
import { assessVariantSwitch } from "@/lib/catalog/variant-switch";
import type { PublicInputCapability } from "@/types/catalog";

const SINGLE: PublicInputCapability = {
  mode: "single",
  min_images: 1,
  max_images: 1,
  roles: [],
  prompt: { enabled: false, max_chars: 0 },
};

const TWO_ROLE: PublicInputCapability = {
  mode: "multi",
  min_images: 2,
  max_images: 2,
  roles: [
    { name: "subject" },
    { name: "reference", optional: true },
  ],
  prompt: { enabled: false, max_chars: 0 },
};

const PROMPTABLE: PublicInputCapability = {
  mode: "single",
  min_images: 1,
  max_images: 1,
  roles: [],
  prompt: { enabled: true, max_chars: 200 },
};

const img = (assetId: string, role: string | null = null) => ({
  assetId,
  role,
});

describe("assessVariantSwitch (#180)", () => {
  it("carries a single unassigned image onto a single-image variation", () => {
    const result = assessVariantSwitch(SINGLE, {
      images: [img("a")],
      prompt: null,
    });
    expect(result.images).toEqual([img("a")]);
    expect(result.dropped).toEqual([]);
    expect(result.missingRequiredRoles).toEqual([]);
    expect(result.notices).toEqual([]);
  });

  it("fails closed when the target capability is unknown", () => {
    const result = assessVariantSwitch(null, {
      images: [img("a", "subject")],
      prompt: "warmer",
    });
    // Unknown contract = strictest default: no named slots, no prompt.
    expect(result.dropped).toHaveLength(1);
    expect(result.prompt.applied).toBe(false);
    expect(result.prompt.preserved).toBe(true);
    expect(result.notices.length).toBeGreaterThan(0);
  });

  it("carries role-matched images and drops undeclared roles with a reason", () => {
    const result = assessVariantSwitch(TWO_ROLE, {
      images: [img("s", "subject"), img("r", "reference"), img("x", "outfit")],
      prompt: null,
    });
    expect(result.images.map((i) => i.assetId)).toEqual(["s", "r"]);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0].reason).toMatch(/outfit/);
    expect(result.notices.some((n) => n.includes("outfit"))).toBe(true);
  });

  it("suggests unassigned images into unfilled named slots without hiding it", () => {
    const result = assessVariantSwitch(TWO_ROLE, {
      images: [img("a")],
      prompt: null,
    });
    expect(result.images[0].role).toBe("subject");
    expect(result.images[0].assignedRole).toBe("subject");
    expect(result.notices.some((n) => n.includes("subject"))).toBe(true);
  });

  it("reports required slots the draft cannot fill", () => {
    const result = assessVariantSwitch(TWO_ROLE, {
      images: [img("a", "reference")],
      prompt: null,
    });
    expect(result.missingRequiredRoles).toEqual(["subject"]);
    expect(result.notices.some((n) => n.includes("needs a"))).toBe(true);
  });

  it("drops images beyond the target's max with a reason", () => {
    const result = assessVariantSwitch(SINGLE, {
      images: [img("a"), img("b")],
      prompt: null,
    });
    expect(result.images).toHaveLength(1);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0].reason).toMatch(/at most 1 image/);
  });

  it("preserves but does not apply a prompt when the target forbids it", () => {
    const result = assessVariantSwitch(SINGLE, {
      images: [img("a")],
      prompt: "softer light",
    });
    expect(result.prompt.applied).toBe(false);
    expect(result.prompt.preserved).toBe(true);
    expect(result.prompt.reason).toMatch(/not.*applied|stays saved/i);
  });

  it("applies a prompt when the target allows it", () => {
    const result = assessVariantSwitch(PROMPTABLE, {
      images: [img("a")],
      prompt: "softer light",
    });
    expect(result.prompt.applied).toBe(true);
    expect(result.notices).toEqual([]);
  });

  it("treats a blank prompt as absent", () => {
    const result = assessVariantSwitch(SINGLE, {
      images: [img("a")],
      prompt: "   ",
    });
    expect(result.prompt.applied).toBe(false);
    expect(result.prompt.reason).toBeNull();
  });
});
