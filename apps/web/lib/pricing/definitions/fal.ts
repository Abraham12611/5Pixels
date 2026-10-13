/**
 * Verified Fal pricing definitions (issue #104).
 *
 * Three layers stay deliberately separate:
 *
 *   provider_model_pricing   — coarse Fal discovery feed. The sync job keeps
 *                              it fresh, but a row here is NEVER quotable by
 *                              itself: "unit = images" is not proof of flat
 *                              per-image billing (tiered models bill per
 *                              resolution + param surcharges).
 *   this module              — the reviewed interpretation of how each
 *                              endpoint actually bills. Shape data lives in
 *                              code so every change goes through review.
 *   provider_pricing_snapshots — immutable quotable snapshots produced by
 *                              combining a fresh feed price with a verified
 *                              definition. Quote creation reads ONLY these.
 *
 * Component provenance: the Fal pricing feed refreshes only the base unit
 * price. Everything else — tier ratios, modifier surcharges, and for flat
 * endpoints the very claim that billing is flat — is docs-verified data with
 * its own expiry (`componentsVerifiedUntil`). A snapshot therefore never
 * outlives either the feed price or the verification of its other billable
 * components: if a component can't be freshly verified the route fails
 * closed rather than stamping stale numbers "fresh".
 */

export type VerifiedPricingType =
  "flat_per_request" | "per_megapixel" | "resolution_tier";

export interface FalPricingDefinition {
  endpointId: string;
  /**
   * Bumped whenever the interpretation of how this endpoint bills changes.
   * Part of the snapshot content hash — a definition edit produces a new
   * snapshot even when the feed's base price is unchanged.
   */
  definitionVersion: number;
  pricingType: VerifiedPricingType;
  /**
   * The unit string the Fal pricing feed reports for this endpoint
   * (e.g. "images"). A feed record reporting a different unit means the
   * pricing shape changed under us — fail closed, don't reinterpret.
   */
  feedUnit: string;
  /**
   * resolution_tier only: which tier key the feed's unit_price describes.
   * Fal advertises a headline $/image that applies to one output tier; the
   * others scale by tierMultipliers.
   */
  baseTier?: string;
  /** resolution_tier only: named pixel→tier map (see resolution-tiers.ts). */
  tierMap?: string;
  /**
   * resolution_tier only: each tier's price as a multiple of the feed's
   * base-tier unit price. Docs-verified — NOT feed-refreshable.
   */
  tierMultipliers?: Record<string, number>;
  /**
   * Surcharged request params — provider param name → serialized value →
   * absolute USD surcharge. Docs-verified — NOT feed-refreshable.
   */
  modifiers?: Record<string, Record<string, number>>;
  /**
   * Instant after which the docs-verified components (tierMultipliers,
   * modifiers, and for flat endpoints the flat-billing claim itself) are
   * considered stale. Past this, sync writes an `unsupported` snapshot and
   * alerts rather than a quotable one carrying stale component data.
   */
  componentsVerifiedUntil: string;
}

/**
 * All six definitions were verified against fal.ai model docs on
 * 2026-10-09/10 (see the fixed_credit_pricing migration comments). Static
 * components are trusted for ~90 days — pricing interpretations rot quietly,
 * so they expire and demand a human re-check instead of silently renewing.
 */
const VERIFIED_UNTIL_2026_10 = "2027-01-09T00:00:00Z";

export const FAL_PRICING_DEFINITIONS: readonly FalPricingDefinition[] = [
  {
    // fal-ai/nano-banana-2/edit — the advertised "$0.08/image" applies to 1K
    // output only: 0.5K = 0.75×, 2K = 1.5×, 4K = 2× — plus +$0.015 with
    // web/google search and +$0.002 for high thinking level.
    endpointId: "fal-ai/nano-banana-2/edit",
    definitionVersion: 1,
    pricingType: "resolution_tier",
    feedUnit: "images",
    baseTier: "1K",
    tierMap: "fal_resolution",
    tierMultipliers: { "0.5K": 0.75, "1K": 1, "2K": 1.5, "4K": 2 },
    modifiers: {
      enable_web_search: { true: 0.015 },
      enable_google_search: { true: 0.015 },
      thinking_level: { high: 0.002 },
    },
    componentsVerifiedUntil: VERIFIED_UNTIL_2026_10,
  },
  {
    // fal-ai/nano-banana-pro/edit — $0.15/image flat at 1K and 2K, 2× at 4K;
    // +$0.015 web/google search. No documented thinking surcharge.
    endpointId: "fal-ai/nano-banana-pro/edit",
    definitionVersion: 1,
    pricingType: "resolution_tier",
    feedUnit: "images",
    baseTier: "1K",
    tierMap: "fal_resolution",
    tierMultipliers: { "1K": 1, "2K": 1, "4K": 2 },
    modifiers: {
      enable_web_search: { true: 0.015 },
      enable_google_search: { true: 0.015 },
    },
    componentsVerifiedUntil: VERIFIED_UNTIL_2026_10,
  },
  {
    // fal-ai/gemini-3-pro-image-preview/edit — same underlying model as
    // nano-banana-pro/edit; identical pricing shape.
    endpointId: "fal-ai/gemini-3-pro-image-preview/edit",
    definitionVersion: 1,
    pricingType: "resolution_tier",
    feedUnit: "images",
    baseTier: "1K",
    tierMap: "fal_resolution",
    tierMultipliers: { "1K": 1, "2K": 1, "4K": 2 },
    modifiers: {
      enable_web_search: { true: 0.015 },
      enable_google_search: { true: 0.015 },
    },
    componentsVerifiedUntil: VERIFIED_UNTIL_2026_10,
  },
  {
    // fal-ai/gemini-3.1-flash-image-preview/edit — the Gemini 3.1 Flash image
    // model nano-banana-2 wraps; identical pricing shape.
    endpointId: "fal-ai/gemini-3.1-flash-image-preview/edit",
    definitionVersion: 1,
    pricingType: "resolution_tier",
    feedUnit: "images",
    baseTier: "1K",
    tierMap: "fal_resolution",
    tierMultipliers: { "0.5K": 0.75, "1K": 1, "2K": 1.5, "4K": 2 },
    modifiers: {
      enable_web_search: { true: 0.015 },
      enable_google_search: { true: 0.015 },
      thinking_level: { high: 0.002 },
    },
    componentsVerifiedUntil: VERIFIED_UNTIL_2026_10,
  },
  {
    // fal-ai/nano-banana/edit — flat per-image, no tiers or surcharged
    // params. The model page advertises $0.039 but also claims "25 runs per
    // $1.00" ($0.04 effective); the feed recorded $0.0398, which we keep
    // pinned until Billing Events settlement confirms the true amount.
    endpointId: "fal-ai/nano-banana/edit",
    definitionVersion: 1,
    pricingType: "flat_per_request",
    feedUnit: "images",
    componentsVerifiedUntil: VERIFIED_UNTIL_2026_10,
  },
  {
    // fal-ai/gemini-25-flash-image/edit — same model as nano-banana/edit;
    // identical flat pricing.
    endpointId: "fal-ai/gemini-25-flash-image/edit",
    definitionVersion: 1,
    pricingType: "flat_per_request",
    feedUnit: "images",
    componentsVerifiedUntil: VERIFIED_UNTIL_2026_10,
  },
];

export function falPricingDefinition(
  endpointId: string
): FalPricingDefinition | undefined {
  return FAL_PRICING_DEFINITIONS.find((d) => d.endpointId === endpointId);
}
