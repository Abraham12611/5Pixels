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
 *                      submit time (see lib/ai/fal.ts num_images pin).
 *   per_megapixel    — quantity = output px / 1e6; exact for fixed sizes.
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
  const unitPrice = Number(payload.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { kind: "unsafe", reason: "invalid unit price" };
  }
  if (payload.currency && payload.currency !== "USD") {
    return { kind: "unsafe", reason: `unsupported currency ${payload.currency}` };
  }

  switch (payload.pricing_type) {
    case "flat_per_request": {
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
      const quantity = (envelope.width * envelope.height) / 1_000_000;
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

    default:
      return {
        kind: "unsafe",
        reason: `unsupported pricing type ${String(payload.pricing_type)}`,
      };
  }
}
