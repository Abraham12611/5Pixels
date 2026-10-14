import { resolutionTierFor } from "../resolution-tiers";
import type {
  PricingPolicy,
  ProviderQuote,
  QuoteEnvelope,
  SnapshotPayload,
} from "../types";

/**
 * Fal pricing adapter: translates a snapshot payload + resolved request
 * envelope into a bounded USD quote. Any pricing shape it does not understand
 * returns `unsafe` — the generation must not run.
 *
 * Supported pricing types (aligned with the units Fal actually advertises):
 *   flat_per_request — $/image or $/generation; quantity is enforced = 1 at
 *                      submit time (see lib/ai/fal.ts num_images pin). Only
 *                      reaches a snapshot via a verified pricing definition —
 *                      a coarse "unit = images" feed row is NEVER proof of
 *                      flatness (tiered models like nano-banana-2 bill per
 *                      resolution tier plus param surcharges).
 *   per_megapixel    — quantity = CEIL(output px / 1e6). Fal bills image
 *                      models in DECIMAL megapixels rounded UP (their own
 *                      example: 3840×2160 = 8.29 MP → billed as 9). Only
 *                      reaches a snapshot via a verified pricing definition —
 *                      a coarse "unit = megapixels" feed row is NOT proof the
 *                      billed quantity is known before execution: upscalers
 *                      bill source×scale_factor, and klein-family edits bill
 *                      input+output MP (fal's edit pages say so explicitly).
 *   resolution_tier  — price varies by output-resolution tier plus optional
 *                      surcharged request params (e.g. web search, thinking
 *                      level). The snapshot carries a verified tier table;
 *                      unknown tiers or unpriced param values fail closed.
 *   unsupported      — everything else, including per-second billing: a time
 *                      price is only quotable once the provider job's runtime
 *                      ceiling is actually enforceable, which no current route
 *                      can guarantee.
 */
export function quoteFal(
  payload: SnapshotPayload,
  envelope: QuoteEnvelope,
  policy: Pick<PricingPolicy, "quoteMaxSlackFactor">
): ProviderQuote {
  if (payload.currency && payload.currency !== "USD") {
    return { kind: "unsafe", reason: `unsupported currency ${payload.currency}` };
  }

  const unitPrice = Number(payload.unit_price);

  switch (payload.pricing_type) {
    case "flat_per_request": {
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { kind: "unsafe", reason: "invalid unit price" };
      }
      return {
        kind: "bounded",
        expectedCostUsd: unitPrice,
        // Slack is the supplier-price shock buffer: if the provider repriced
        // between snapshot and execution, the reservation already covers it
        // instead of relying on the circuit breaker. Settlement still debits
        // only the actual cost — the customer never pays the buffer.
        maximumCostUsd: unitPrice * policy.quoteMaxSlackFactor,
        components: { unit_price: unitPrice, quantity: 1 },
      };
    }

    case "per_megapixel": {
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { kind: "unsafe", reason: "invalid unit price" };
      }
      const quantity = Math.ceil(
        (envelope.width * envelope.height) / 1_000_000
      );
      const expected = unitPrice * quantity;
      return {
        kind: "bounded",
        expectedCostUsd: expected,
        // Slack covers output dims differing from the requested envelope.
        maximumCostUsd: expected * policy.quoteMaxSlackFactor,
        components: {
          unit_price: unitPrice,
          quantity,
          unit: "megapixel",
        },
      };
    }

    case "resolution_tier": {
      const tier = resolutionTierFor(
        payload.tier_map,
        envelope.width * envelope.height
      );
      if (!tier) {
        return {
          kind: "unsafe",
          reason: `unknown tier map ${String(payload.tier_map)}`,
        };
      }
      const tierPrice = Number(payload.tiers?.[tier]);
      if (!Number.isFinite(tierPrice) || tierPrice <= 0) {
        return {
          kind: "unsafe",
          reason: `no verified price for ${tier} output`,
        };
      }

      // Surcharged request params: a table entry prices the serialized value;
      // a non-neutral value with no entry is unpriced → fail closed.
      let expected = tierPrice;
      const applied: Record<string, number> = {};
      for (const [param, table] of Object.entries(payload.modifiers ?? {})) {
        const raw = envelope.requestConfig?.[param];
        const key = raw == null || raw === false ? "default" : String(raw);
        const surcharge = table[key];
        if (surcharge !== undefined) {
          expected += surcharge;
          if (surcharge > 0) applied[param] = surcharge;
          continue;
        }
        const neutral =
          raw == null ||
          raw === false ||
          raw === 0 ||
          raw === "false" ||
          raw === "none" ||
          raw === "default" ||
          raw === "off" ||
          raw === "low";
        if (!neutral) {
          return {
            kind: "unsafe",
            reason: `unpriced request param ${param}=${key}`,
          };
        }
      }

      return {
        kind: "bounded",
        expectedCostUsd: expected,
        maximumCostUsd: expected * policy.quoteMaxSlackFactor,
        components: {
          tier,
          unit_price: tierPrice,
          quantity: 1,
          // Settled per-unit price: tier + applied surcharges. The submit
          // adapter pins `resolution` to this same tier, so the billed tier
          // is the quoted tier.
          resolved_price: expected,
          ...(Object.keys(applied).length > 0 ? { modifiers: applied } : {}),
        },
      };
    }

    default:
      return {
        kind: "unsafe",
        reason: `unsupported pricing type ${String(payload.pricing_type)}`,
      };
  }
}
