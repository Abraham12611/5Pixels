import { describe, expect, it } from "vitest";
import { pickVariant } from "./engine";

const fixed = (v: number) => () => v;

describe("pickVariant", () => {
  it("returns the only variant at 100%", () => {
    expect(pickVariant({ A_default: 100 }, Math.random)).toBe("A_default");
  });

  it("splits traffic by weight", () => {
    const weights = { A: 50, B: 50 };
    expect(pickVariant(weights, fixed(0.25))).toBe("A");
    expect(pickVariant(weights, fixed(0.75))).toBe("B");
    expect(pickVariant(weights, fixed(0.999))).toBe("B");
    expect(pickVariant(weights, fixed(0))).toBe("A");
  });

  it("ignores zero-weight variants", () => {
    const weights = { A: 0, B: 100 };
    expect(pickVariant(weights, fixed(0))).toBe("B");
  });

  it("falls back when weights are empty", () => {
    expect(pickVariant({}, Math.random)).toBe("A_default");
    expect(pickVariant({ A: 0, B: 0 }, Math.random)).toBe("A_default");
  });

  it("handles non-100 totals proportionally", () => {
    const weights = { A: 1, B: 3 };
    expect(pickVariant(weights, fixed(0.2))).toBe("A");
    expect(pickVariant(weights, fixed(0.5))).toBe("B");
  });
});
