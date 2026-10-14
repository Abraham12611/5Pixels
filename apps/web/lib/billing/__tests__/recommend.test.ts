import { describe, expect, it } from "vitest";
import {
  estimateMonthlyCredits,
  recommendPlan,
  recommendReasons,
  type FinderPlan,
} from "../recommend";

const PLANS: FinderPlan[] = [
  { id: "c", name: "Creator", creditsGrant: 600, priceCents: 2000 },
  { id: "p", name: "Pro", creditsGrant: 1200, priceCents: 3000 },
  { id: "s", name: "Studio", creditsGrant: 3000, priceCents: 5000 },
  { id: "a", name: "Agency", creditsGrant: 6000, priceCents: 10000 },
];

describe("estimateMonthlyCredits", () => {
  it("estimates ~6 credits per transformation", () => {
    expect(estimateMonthlyCredits(50)).toBe(300);
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
      { contentTypes: ["social"], perMonth: 50, priority: null },
      PLANS
    );
    expect(plan?.name).toBe("Creator"); // 300 × 1.15 = 345 < 600
  });

  it("scales up with usage", () => {
    const plan = recommendPlan(
      { contentTypes: ["social"], perMonth: 200, priority: null },
      PLANS
    );
    expect(plan?.name).toBe("Studio"); // 1200 × 1.15 = 1380 > Pro's 1200
  });

  it("adds headroom for volume priority", () => {
    const plan = recommendPlan(
      { contentTypes: ["social"], perMonth: 120, priority: "volume" },
      PLANS
    );
    expect(plan?.name).toBe("Pro"); // 720 × 1.5 = 1080 → Pro
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
