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
  | "resolution_tier"
  | "unsupported";

export interface SnapshotPayload {
  pricing_type: PricingType;
  /** Required for flat_per_request / per_megapixel. */
  unit_price?: number;
  unit?: string;
  currency?: string;
  /**
   * resolution_tier: which named pixel→tier map resolves the output tier
   * (see resolution-tiers.ts). Required — an unknown map is unquotable.
   */
  tier_map?: string;
  /** resolution_tier: USD price per output tier key ("1K", "2K", "4K"…). */
  tiers?: Record<string, number>;
  /**
   * resolution_tier: surcharged request params — provider param name →
   * serialized value → USD surcharge (e.g. {"enable_web_search":{"true":0.015}}).
   * A request value missing from its table fails closed unless it is a
   * recognized neutral/default.
   */
  modifiers?: Record<string, Record<string, number>>;
}

/**
 * Server-resolved request envelope — never client-supplied pricing input.
 * `requestConfig` is the effective provider model_config the submit path
 * will send, so parameter-priced surcharges are quoted on the real request.
 */
export interface QuoteEnvelope {
  width: number;
  height: number;
  requestConfig?: Record<string, unknown>;
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
