import { describe, expect, it } from "vitest";
import { isValidSlug, normalizeSlug } from "../slug";

describe("article slug helpers", () => {
  it("normalises to lowercase kebab-case", () => {
    expect(normalizeSlug("How We Made This Look")).toBe("how-we-made-this-look");
    expect(normalizeSlug("  Studio  Portraits!! ")).toBe("studio-portraits");
    expect(normalizeSlug("café — neon")).toBe("caf-neon");
  });

  it("collapses repeated separators and strips edge dashes", () => {
    expect(normalizeSlug("--hello___world--")).toBe("hello-world");
  });

  it("returns empty for unusable input", () => {
    expect(normalizeSlug("!!!")).toBe("");
    expect(normalizeSlug("   ")).toBe("");
  });

  it("truncates at the slug bound without leaving a trailing dash", () => {
    const long = normalizeSlug("a".repeat(200));
    expect(long.length).toBeLessThanOrEqual(120);
    expect(long.endsWith("-")).toBe(false);
    expect(isValidSlug(long)).toBe(true);
  });

  it("validates the DB slug pattern", () => {
    expect(isValidSlug("how-it-was-made")).toBe(true);
    expect(isValidSlug("x")).toBe(true);
    expect(isValidSlug("-lead")).toBe(false);
    expect(isValidSlug("trail-")).toBe(false);
    expect(isValidSlug("UPPER")).toBe(false);
    expect(isValidSlug("two--dash")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});
