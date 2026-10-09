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
 *   flat_per_request — $/image or $/generation; exact.
 *   per_megapixel    — quantity = output px / 1e6; exact for fixed sizes.
 *   per_second       — bounded by the snapshot's max_seconds runtime cap.
 *   unsupported      — units/credits/tokenized tiers until their adapters
 *                      land (e.g. GPT Image token pricing).
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
        kind: "exact",
        expectedCostUsd: unitPrice,
        maximumCostUsd: unitPrice,
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

    case "per_second": {
      const maxSeconds = Number(payload.max_seconds);
      if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) {
        // Unbounded runtime = unbounded cost; never quote.
        return { kind: "unsafe", reason: "time-billed endpoint has no runtime cap" };
      }
      // Expected sits at the runtime cap (we don't know the real runtime at
      // quote time); slack covers billing above the cap.
      const expected = unitPrice * maxSeconds;
      return {
        kind: "bounded",
        expectedCostUsd: expected,
        maximumCostUsd: expected * policy.quoteMaxSlackFactor,
        components: {
          unit_price: unitPrice,
          quantity: maxSeconds,
          unit: "seconds",
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
