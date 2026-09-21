/**
 * P50 — credit-cost confirmation policy. The confirmation is deliberately
 * sparse: it appears for a user's first paid generation or an unusually
 * costly transformation, and never when the user opted out.
 */

/** Costs at or above this count as "unusually costly" and always re-ask. */
export const HIGH_COST_THRESHOLD = 10;

export const SKIP_COST_CONFIRM_KEY = "5px:skip-cost-confirm";

export function shouldConfirmCost({
  cost,
  hasPriorGenerations,
  skipPreference,
}: {
  cost: number;
  hasPriorGenerations: boolean;
  skipPreference: boolean;
}): boolean {
  if (skipPreference) return false;
  if (cost <= 0) return false;
  if (!hasPriorGenerations) return true;
  return cost >= HIGH_COST_THRESHOLD;
}
