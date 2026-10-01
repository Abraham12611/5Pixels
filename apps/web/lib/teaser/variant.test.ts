import { describe, expect, it } from "vitest";
import { deriveTeaserVariant } from "./variant";

describe("deriveTeaserVariant", () => {
  it("is deterministic for the same seed", () => {
    const a = deriveTeaserVariant("anon-1:pv-1:pending-1");
    const b = deriveTeaserVariant("anon-1:pv-1:pending-1");
    expect(a).toEqual(b);
  });

  it("varies across seeds", () => {
    const seeds = Array.from({ length: 12 }, (_, i) => `seed-${i}`);
    const variants = seeds.map(deriveTeaserVariant);
    const unique = new Set(variants.map((v) => JSON.stringify(v)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it("stays within the intended ranges", () => {
    for (let i = 0; i < 200; i++) {
      const v = deriveTeaserVariant(`s:${i}:${i * 7919}`);
      expect(v.blurPx).toBeGreaterThanOrEqual(24);
      expect(v.blurPx).toBeLessThan(36);
      expect(v.cropX).toBeGreaterThanOrEqual(0);
      expect(v.cropX).toBeLessThan(15);
      expect(v.cropY).toBeGreaterThanOrEqual(0);
      expect(v.cropY).toBeLessThan(15);
      expect(v.zoom).toBeGreaterThanOrEqual(1.05);
      expect(v.zoom).toBeLessThan(1.35);
    }
  });
});
