import { describe, expect, it } from "vitest";
import {
  estimateMonthlyCredits,
  recommendPlan,
  recommendReasons,
  type FinderPlan,
} from "../recommend";

const PLANS: FinderPlan[] = [
  { id: "c", name: "Creator", creditsGrant: 6000, priceCents: 2000 },
  { id: "p", name: "Pro", creditsGrant: 12000, priceCents: 3000 },
  { id: "s", name: "Studio", creditsGrant: 30000, priceCents: 5000 },
  { id: "a", name: "Agency", creditsGrant: 60000, priceCents: 10000 },
];

describe("estimateMonthlyCredits", () => {
  it("estimates ~60 credits per transformation", () => {
    expect(estimateMonthlyCredits(50)).toBe(3000);
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
    expect(plan?.name).toBe("Creator"); // 3000 × 1.15 = 3450 < 6000
  });

  it("scales up with usage", () => {
    const plan = recommendPlan(
      { contentTypes: ["social"], perMonth: 200, priority: null },
      PLANS
    );
    expect(plan?.name).toBe("Studio"); // 12000 × 1.15 = 13800 > Pro's 12000
  });

  it("adds headroom for volume priority", () => {
    const plan = recommendPlan(
      { contentTypes: ["social"], perMonth: 120, priority: "volume" },
      PLANS
    );
    expect(plan?.name).toBe("Pro"); // 7200 × 1.5 = 10800 → Pro
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
