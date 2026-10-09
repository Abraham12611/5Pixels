/**
 * Fixed-value credit pricing (issue #89).
 *
 * 1 credit = $0.001 of provider-cost capacity, forever. Margin is decided at
 * credit issuance (plan grant sizes + top-up budget ratio); consumption only
 * ever converts a bounded USD quote into credits at that rate.
 */

export const CREDIT_CAPACITY_USD = 0.001;

export interface PricingPolicy {
  id: string;
  version: number;
  creditCapacityUsd: number;
  /** Fraction of a top-up's price that becomes provider-cost budget. */
  topUpBudgetRatio: number;
  /** expected → maximum headroom adapters apply when quoting. */
  quoteMaxSlackFactor: number;
  quoteTtlSeconds: number;
  snapshotTtlHours: number;
}

/** Normalized pricing payload stored on provider_pricing_snapshots. */
export type PricingType =
  | "flat_per_request"
  | "per_megapixel"
  | "unsupported";

export interface SnapshotPayload {
  pricing_type: PricingType;
  unit_price: number;
  unit?: string;
  currency?: string;
}

/** Server-resolved request envelope — never client-supplied pricing input. */
export interface QuoteEnvelope {
  width: number;
  height: number;
}

export type ProviderQuote =
  | {
      kind: "exact" | "bounded";
      expectedCostUsd: number;
      maximumCostUsd: number;
      components: Record<string, unknown>;
    }
  | { kind: "unsafe"; reason: string };

export function creditsForProviderCost(costUsd: number): number {
  return Math.ceil(costUsd / CREDIT_CAPACITY_USD);
}

/** Credits a top-up grants: cash → provider budget → fixed credits. */
export function topUpCreditsForCents(
  priceCents: number,
  policy: Pick<PricingPolicy, "topUpBudgetRatio">
): number {
  const budgetUsd = (priceCents / 100) * policy.topUpBudgetRatio;
  // Epsilon absorbs binary float error (20 × 0.606 → 12.1199…, not 12.12).
  return Math.floor(budgetUsd / CREDIT_CAPACITY_USD + 1e-6);
}
