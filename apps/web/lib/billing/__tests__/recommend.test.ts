import { describe, expect, it } from "vitest";
import {
  estimateMonthlyCredits,
  recommendPlan,
  recommendReasons,
  type FinderPlan,
} from "../recommend";

const PLANS: FinderPlan[] = [
  { id: "c", name: "Creator", creditsGrant: 2000, priceCents: 2000, markupMultiplier: 3 },
  { id: "p", name: "Pro", creditsGrant: 3000, priceCents: 3000, markupMultiplier: 2.5 },
  { id: "s", name: "Studio", creditsGrant: 5500, priceCents: 5000, markupMultiplier: 2 },
  { id: "a", name: "Agency", creditsGrant: 12000, priceCents: 10000, markupMultiplier: 1.7 },
];

describe("estimateMonthlyCredits", () => {
  it("estimates ~3 credits per transformation", () => {
    expect(estimateMonthlyCredits(50)).toBe(150);
    expect(estimateMonthlyCredits(0)).toBe(0);
    expect(estimateMonthlyCredits(-10)).toBe(0);
  });
});

describe("recommendPlan", () => {
  it("returns null with no plans", () => {
    expect(
      recommendPlan({ contentTypes: [], perMonth: 50, priority: null }, [])
    ).toBeNull();
  });

  it("picks the smallest covering plan", () => {
    const plan = recommendPlan(
      { contentTypes: ["social"], perMonth: 500, priority: null },
      PLANS
    );
    expect(plan?.name).toBe("Creator"); // 1500 × 1.15 = 1725 < 2000
  });

  it("scales up with usage", () => {
    const plan = recommendPlan(
      { contentTypes: ["social"], perMonth: 900, priority: null },
      PLANS
    );
    expect(plan?.name).toBe("Studio"); // 2700 × 1.15 = 3105 > Pro's 3000
  });

  it("adds headroom for volume priority", () => {
    const plan = recommendPlan(
      { contentTypes: ["social"], perMonth: 600, priority: "volume" },
      PLANS
    );
    expect(plan?.name).toBe("Pro"); // 1800 × 1.5 = 2700 → Pro
  });

  it("caps at the largest plan", () => {
    const plan = recommendPlan(
      { contentTypes: [], perMonth: 10000, priority: null },
      PLANS
    );
    expect(plan?.name).toBe("Agency");
  });

  it("returns the smallest plan for zero usage", () => {
    const plan = recommendPlan(
      { contentTypes: [], perMonth: 0, priority: null },
      PLANS
    );
    expect(plan?.name).toBe("Creator");
  });
});

describe("recommendReasons", () => {
  it("always produces at most 3 reasons", () => {
    const reasons = recommendReasons(
      { contentTypes: ["social"], perMonth: 100, priority: "quality" },
      PLANS[1]
    );
    expect(reasons.length).toBeLessThanOrEqual(3);
    expect(reasons.length).toBeGreaterThan(0);
  });
});
