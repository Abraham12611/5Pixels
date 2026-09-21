import { describe, expect, it } from "vitest";
import { isRelativePath } from "./url";

describe("isRelativePath", () => {
  it("accepts relative paths", () => {
    expect(isRelativePath("/app")).toBe(true);
    expect(isRelativePath("/app/generations")).toBe(true);
    expect(isRelativePath("/")).toBe(true);
  });

  it("rejects absolute URLs", () => {
    expect(isRelativePath("https://evil.com")).toBe(false);
    expect(isRelativePath("http://example.com/app")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isRelativePath("//evil.com")).toBe(false);
  });

  it("rejects non-root relative values", () => {
    expect(isRelativePath("app")).toBe(false);
    expect(isRelativePath("../app")).toBe(false);
    expect(isRelativePath("javascript:alert(1)")).toBe(false);
    expect(isRelativePath(null)).toBe(false);
  });
});
