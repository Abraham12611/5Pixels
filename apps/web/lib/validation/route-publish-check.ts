/**
 * Publish-time route verification for the admin publish gate (#177).
 *
 * Read-only mirror of `createGenerationQuote`'s eligibility logic: a version
 * may only publish when its pinned primary route has a fresh pricing
 * snapshot, an unsuspended endpoint, and a bounded adapter quote at the
 * version's worst-case output envelope — and any declared fallback must
 * independently quote *inside* the primary's maximum cost envelope (the
 * same rule the quote path applies at runtime). No quote rows are created.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivePricingPolicy } from "@/lib/pricing/policy";
import { getEndpointState, getFreshSnapshot } from "@/lib/pricing/snapshots";
import { quoteFal } from "@/lib/pricing/adapters/fal";
import {
  getFallbackEndpoint,
  getProviderEndpoint,
} from "@/lib/ai/provider-routing";
import type { ProviderStrategy } from "@/lib/ai/provider-routing";

export interface PublishableVersionShape {
  provider_strategy: ProviderStrategy;
  model_config?: Record<string, unknown> | null;
  output_sizes?: Array<{ width: number; height: number }> | null;
}

/**
 * Throw an actionable error when the version's routes cannot produce a
 * bounded quote. Runs the same primitives as `createGenerationQuote` —
 * never a parallel implementation of quote math.
 */
export async function assertVersionQuotable(
  service: SupabaseClient,
  version: PublishableVersionShape
): Promise<void> {
  const strategy = version.provider_strategy;
  const endpoint = getProviderEndpoint(strategy);
  if (!endpoint) {
    throw new Error(
      "Cannot publish: the primary provider/model does not resolve to a supported endpoint."
    );
  }

  const policy = await getActivePricingPolicy(service);
  if (!policy) {
    throw new Error(
      "Cannot publish: no active pricing policy — the route cannot be verified as quotable."
    );
  }

  // Worst-case envelope: the largest declared output size bounds the quote.
  const sizes = version.output_sizes ?? [];
  const envelope = sizes.reduce(
    (acc, s) =>
      s.width * s.height > acc.width * acc.height ? { width: s.width, height: s.height } : acc,
    { width: 1024, height: 1024 }
  );

  const [primarySnapshot, primaryState] = await Promise.all([
    getFreshSnapshot(service, "fal", endpoint),
    getEndpointState(service, "fal", endpoint),
  ]);
  if (primaryState === "suspended") {
    throw new Error(
      `Cannot publish: route "${endpoint}" is suspended by the billing circuit breaker.`
    );
  }
  if (!primarySnapshot) {
    throw new Error(
      `Cannot publish: route "${endpoint}" has no fresh pricing snapshot — it cannot be quoted. Run pricing sync or repoint the preset.`
    );
  }

  const primaryQuote = quoteFal(
    primarySnapshot.payload,
    { ...envelope, requestConfig: version.model_config ?? {} },
    { quoteMaxSlackFactor: policy.quoteMaxSlackFactor }
  );
  if (primaryQuote.kind === "unsafe") {
    throw new Error(
      `Cannot publish: route "${endpoint}" is not quotable (${primaryQuote.reason}).`
    );
  }

  const fallbackEndpoint = getFallbackEndpoint(strategy);
  if (!fallbackEndpoint) return;

  // A declared fallback is part of the recipe: it must be independently
  // quotable AND fit inside the primary's bounded maximum, exactly as the
  // quote path requires at runtime. An unreachable fallback is dead config —
  // reject instead of shipping misleading resilience.
  const [fallbackSnapshot, fallbackState] = await Promise.all([
    getFreshSnapshot(service, "fal", fallbackEndpoint),
    getEndpointState(service, "fal", fallbackEndpoint),
  ]);
  if (!fallbackSnapshot || fallbackState !== "active") {
    throw new Error(
      `Cannot publish: fallback route "${fallbackEndpoint}" is unreachable (${fallbackState === "suspended" ? "suspended" : "no fresh snapshot"}) — remove it or repoint to a quotable route.`
    );
  }
  const fallbackQuote = quoteFal(
    fallbackSnapshot.payload,
    { ...envelope, requestConfig: version.model_config ?? {} },
    { quoteMaxSlackFactor: policy.quoteMaxSlackFactor }
  );
  if (fallbackQuote.kind === "unsafe") {
    throw new Error(
      `Cannot publish: fallback route "${fallbackEndpoint}" is not quotable (${fallbackQuote.reason}).`
    );
  }
  if (fallbackQuote.maximumCostUsd > primaryQuote.maximumCostUsd) {
    throw new Error(
      `Cannot publish: fallback route "${fallbackEndpoint}" can exceed the primary quote's price envelope ($${fallbackQuote.maximumCostUsd.toFixed(4)} > $${primaryQuote.maximumCostUsd.toFixed(4)}) — remove it or repoint to a cheaper route.`
    );
  }
}
