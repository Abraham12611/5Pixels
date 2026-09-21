import { describe, expect, it } from "vitest";
import { buildControlFingerprint, compilePrompt } from "../prompt";

describe("compilePrompt", () => {
  it("replaces placeholders with control values", () => {
    const template = "A {{style}} portrait with {{color}} background.";
    const controls = { style: "cinematic", color: "#F7F2E8" };
    expect(compilePrompt(template, controls)).toBe(
      "A cinematic portrait with #F7F2E8 background."
    );
  });

  it("sorts keys deterministically", () => {
    const template = "{{a}} {{b}} {{c}}";
    expect(compilePrompt(template, { c: 3, a: 1, b: 2 })).toBe("1 2 3");
  });

  it("leaves unknown placeholders intact", () => {
    const template = "{{known}} {{unknown}}";
    expect(compilePrompt(template, { known: "yes" })).toBe("yes {{unknown}}");
  });

  it("coerces non-string values to strings", () => {
    const template = "Intensity {{intensity}}";
    expect(compilePrompt(template, { intensity: 75 })).toBe("Intensity 75");
  });
});

describe("buildControlFingerprint", () => {
  it("produces the same string regardless of key order", () => {
    const a = buildControlFingerprint({ b: 2, a: 1 });
    const b = buildControlFingerprint({ a: 1, b: 2 });
    expect(a).toBe(b);
  });
});
