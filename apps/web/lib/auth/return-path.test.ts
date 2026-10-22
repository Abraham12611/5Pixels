import { describe, expect, it } from "vitest";
import { buildAuthHref } from "./return-path";

describe("buildAuthHref", () => {
  it("carries the current path as next", () => {
    expect(buildAuthHref("/login", "/presets/neon-noir")).toBe(
      "/login?next=%2Fpresets%2Fneon-noir"
    );
    expect(buildAuthHref("/signup", "/presets/neon-noir")).toBe(
      "/signup?next=%2Fpresets%2Fneon-noir"
    );
  });

  it("preserves query strings in next", () => {
    expect(buildAuthHref("/login", "/explore?type=filter")).toBe(
      "/login?next=%2Fexplore%3Ftype%3Dfilter"
    );
    expect(
      buildAuthHref("/signup", "/explore?category=illustration&sort=newest")
    ).toBe("/signup?next=%2Fexplore%3Fcategory%3Dillustration%26sort%3Dnewest");
  });

  it("returns the bare href on the landing page", () => {
    expect(buildAuthHref("/login", "/")).toBe("/login");
    expect(buildAuthHref("/signup", "/")).toBe("/signup");
  });

  it("never points next back at an auth surface", () => {
    expect(buildAuthHref("/login", "/login")).toBe("/login");
    expect(buildAuthHref("/signup", "/login?next=%2Fpresets%2Fx")).toBe(
      "/signup"
    );
    expect(buildAuthHref("/login", "/signup")).toBe("/login");
    expect(buildAuthHref("/login", "/verify-email")).toBe("/login");
    expect(buildAuthHref("/signup", "/onboarding")).toBe("/signup");
    expect(buildAuthHref("/login", "/forgot-password")).toBe("/login");
    expect(buildAuthHref("/login", "/auth/callback?code=abc")).toBe("/login");
  });

  it("does not match auth routes as bare prefixes", () => {
    // /loginish must not be swallowed by the /login guard
    expect(buildAuthHref("/login", "/loginish")).toBe(
      "/login?next=%2Floginish"
    );
  });

  it("falls back to the bare href for missing or unsafe paths", () => {
    expect(buildAuthHref("/login", null)).toBe("/login");
    expect(buildAuthHref("/login", undefined)).toBe("/login");
    expect(buildAuthHref("/login", "")).toBe("/login");
    expect(buildAuthHref("/login", "https://evil.com")).toBe("/login");
    expect(buildAuthHref("/login", "//evil.com")).toBe("/login");
  });
});
