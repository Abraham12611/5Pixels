import { describe, expect, it } from "vitest";
import { isValidLabEndpoint, isValidLabOutputSize } from "./validate";

describe("isValidLabEndpoint", () => {
  it("accepts fal.ai-style endpoint ids", () => {
    expect(isValidLabEndpoint("fal-ai/flux/dev/image-to-image")).toBe(true);
    expect(isValidLabEndpoint("fal-ai/ideogram/v3")).toBe(true);
    expect(isValidLabEndpoint("fal-ai/nano-banana/edit")).toBe(true);
  });

  it("rejects empty, non-string, and unsafe values", () => {
    expect(isValidLabEndpoint("")).toBe(false);
    expect(isValidLabEndpoint(null)).toBe(false);
    expect(isValidLabEndpoint(undefined)).toBe(false);
    expect(isValidLabEndpoint(42)).toBe(false);
    expect(isValidLabEndpoint("bad endpoint")).toBe(false);
    expect(isValidLabEndpoint("-leading-dash")).toBe(false);
    expect(isValidLabEndpoint("with?query=1")).toBe(false);
  });
});

describe("isValidLabOutputSize", () => {
  it("accepts ordinary sizes", () => {
    expect(isValidLabOutputSize({ width: 1024, height: 1024 })).toBe(true);
    expect(isValidLabOutputSize({ width: 1920, height: 1080 })).toBe(true);
  });

  it("rejects sizes over the pixel cap", () => {
    expect(isValidLabOutputSize({ width: 4096, height: 4096 })).toBe(false);
    expect(isValidLabOutputSize({ width: 3000, height: 3000 })).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isValidLabOutputSize(null)).toBe(false);
    expect(isValidLabOutputSize(undefined)).toBe(false);
    expect(isValidLabOutputSize("1024x1024")).toBe(false);
    expect(isValidLabOutputSize({ width: 0, height: 1024 })).toBe(false);
    expect(isValidLabOutputSize({ width: -5, height: 1024 })).toBe(false);
    expect(isValidLabOutputSize({ width: "1024", height: 1024 })).toBe(false);
  });
});
