import { describe, expect, it } from "vitest";
import { normalizeEmptyCategory } from "./category";

describe("normalizeEmptyCategory", () => {
  it("returns undefined for empty string", () => {
    expect(normalizeEmptyCategory("")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(normalizeEmptyCategory(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(normalizeEmptyCategory(undefined)).toBeUndefined();
  });

  it("returns a valid UUID unchanged", () => {
    const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    expect(normalizeEmptyCategory(uuid)).toBe(uuid);
  });

  it("does not trim whitespace-only values", () => {
    expect(normalizeEmptyCategory("   ")).toBe("   ");
  });
});
