/**
 * Fixed-value credit pricing (issue #89).
 *
 * 1 credit = $0.01 of provider-cost capacity — a PERMANENT invariant.
 * Plan economics change by issuing more/fewer credits, never by changing
 * what a credit means; a second denomination change after launch would be
 * a breaking migration, not a tunable. Margin is decided at issuance
 * (grant sizes + top-up budget ratio); consumption only ever converts a
 * bounded USD quote into credits at this rate.
 */

export const CREDIT_CAPACITY_USD = 0.01;

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
  "flat_per_request" | "per_megapixel" | "resolution_tier" | "unsupported";

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
  /**
   * unsupported only: why the endpoint can't be quoted (missing feed
   * record, malformed price, verification expired, …). Display/debug only —
   * the adapter treats every unsupported payload as unsafe regardless.
   */
  unsupported_reason?: string;
  /**
   * Where each cost-bearing component came from — written by pricing sync
   * (#104) so a snapshot's freshness is auditable per component rather than
   * per row. Adapters ignore it entirely.
   */
  provenance?: {
    definition_version: number;
    components: Record<
      string,
      { source: "fal_pricing_api" | "verified_definition" } & Record<
        string,
        unknown
      >
    >;
  };
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
