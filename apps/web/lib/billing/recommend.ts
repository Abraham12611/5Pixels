export interface FinderPlan {
  id: string;
  name: string;
  creditsGrant: number;
  priceCents: number;
  markupMultiplier: number;
}

export type ContentType = "social" | "portraits" | "covers" | "creative";
export type Priority = "volume" | "quality" | "flexibility";

export interface FinderSelections {
  contentTypes: ContentType[];
  /** Expected transformations per month. */
  perMonth: number;
  priority: Priority | null;
}

/** Presets cost roughly 1–5 credits; ~3 is a fair blended average. */
const AVG_CREDITS_PER_TRANSFORMATION = 3;

export function estimateMonthlyCredits(perMonth: number): number {
  if (!Number.isFinite(perMonth) || perMonth <= 0) return 0;
  return Math.round(perMonth * AVG_CREDITS_PER_TRANSFORMATION);
}

/**
 * Recommend the smallest monthly plan that covers estimated usage with
 * headroom. `volume` asks for extra headroom, `quality` prefers at least the
 * mid-tier (lower per-transformation credit cost), `flexibility` picks the
 * smallest plan that still fits.
 */
export function recommendPlan(
  selections: FinderSelections,
  monthlyPlans: FinderPlan[]
): FinderPlan | null {
  if (monthlyPlans.length === 0) return null;
  const sorted = [...monthlyPlans].sort(
    (a, b) => a.creditsGrant - b.creditsGrant
  );
  const needed = estimateMonthlyCredits(selections.perMonth);
  if (needed <= 0) return sorted[0];

  const headroom = selections.priority === "volume" ? 1.5 : 1.15;
  const target = needed * headroom;
  let pick = sorted.find((p) => p.creditsGrant >= target) ?? sorted.at(-1)!;

  if (selections.priority === "quality") {
    const mid = sorted[Math.min(1, sorted.length - 1)];
    if (pick.creditsGrant < mid.creditsGrant) pick = mid;
  }

  return pick;
}

export function recommendReasons(
  selections: FinderSelections,
  plan: FinderPlan
): string[] {
  const needed = estimateMonthlyCredits(selections.perMonth);
  const reasons: string[] = [];

  reasons.push(
    `~${needed.toLocaleString()} credits/month covers about ${selections.perMonth.toLocaleString()} transformations`
  );
  if (plan.creditsGrant >= needed) {
    reasons.push(
      `${plan.name} includes ${plan.creditsGrant.toLocaleString()} credits — comfortable headroom`
    );
  } else {
    reasons.push(
      `${plan.name} is the largest plan — top up anytime if you need more`
    );
  }
  if (selections.priority === "quality") {
    reasons.push("Higher tiers pay fewer credits per transformation");
  } else if (selections.priority === "volume") {
    reasons.push("Best credits-per-dollar at your volume");
  } else {
    reasons.push("Upgrade or downgrade anytime — changes apply next cycle");
  }

  return reasons.slice(0, 3);
}
