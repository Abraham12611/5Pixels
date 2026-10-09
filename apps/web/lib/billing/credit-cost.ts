"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getProviderEndpoint } from "@/lib/ai/provider-routing";
import type { ProviderStrategy } from "@/lib/ai/provider-routing";
import { getEndpointState, getFreshSnapshot } from "@/lib/pricing/snapshots";
import { quoteFal } from "@/lib/pricing/adapters/fal";
import { getActivePricingPolicy } from "@/lib/pricing/policy";
import { creditsForProviderCost } from "@/lib/pricing/types";
import type { OutputSizeOption } from "@/types/catalog";

export interface CostEstimateInput {
  productVersionId: string;
  outputSize: OutputSizeOption;
}

export interface CostEstimateResult {
  /** Credits the generation would reserve right now ("up to N credits"). */
  estimatedCredits: number;
  /** True when pricing exists but the route is not currently quotable. */
  unavailable: boolean;
}

async function getProviderStrategy(
  productVersionId: string
): Promise<ProviderStrategy | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("product_versions")
    .select("provider_strategy")
    .eq("id", productVersionId)
    .eq("state", "active")
    .single();

  if (error || !data) {
    console.error("[getProviderStrategy] lookup failed", error?.message);
    return null;
  }

  return data.provider_strategy as unknown as ProviderStrategy;
}

/**
 * Display estimate for the create flow. Mirrors createGenerationQuote without
 * persisting a quote row: fresh snapshot + bounded quote → reserve credits.
 * Returns unavailable=true when the endpoint can't be priced right now —
 * the UI should disable generation rather than show a guessed price.
 */
export async function estimateGenerationCost(
  input: CostEstimateInput
): Promise<CostEstimateResult> {
  const unavailable = { estimatedCredits: 0, unavailable: true };
  const supabase = await createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return unavailable;
  }

  const providerStrategy = await getProviderStrategy(input.productVersionId);
  if (!providerStrategy) {
    return unavailable;
  }

  const providerEndpoint = getProviderEndpoint(providerStrategy);
  if (!providerEndpoint) {
    return unavailable;
  }

  const policy = await getActivePricingPolicy(service);
  if (!policy) {
    return unavailable;
  }

  const [snapshot, state] = await Promise.all([
    getFreshSnapshot(service, "fal", providerEndpoint),
    getEndpointState(service, "fal", providerEndpoint),
  ]);

  if (!snapshot || state === "suspended") {
    return unavailable;
  }

  const quote = quoteFal(
    snapshot.payload,
    { width: input.outputSize.width, height: input.outputSize.height },
    { quoteMaxSlackFactor: policy.quoteMaxSlackFactor }
  );

  if (quote.kind === "unsafe") {
    return unavailable;
  }

  return {
    estimatedCredits: creditsForProviderCost(quote.maximumCostUsd),
    unavailable: false,
  };
}

/**
 * Hint for top-up/paywall copy: credits for the cheapest generation currently
 * quotable. Uses the lowest flat-rate fresh snapshot; falls back to the
 * nano-banana flat rate ($0.08 → 80 credits) when nothing is fresh.
 */
export async function getCheapestGenerationCredits(): Promise<number> {
  const service = createServiceClient();
  const { data } = await service
    .from("provider_pricing_snapshots")
    .select("payload")
    .gt("expires_at", new Date().toISOString())
    .order("fetched_at", { ascending: false })
    .limit(500);

  let min = Infinity;
  for (const row of data ?? []) {
    const payload = row.payload as { pricing_type?: string; unit_price?: number };
    if (
      payload.pricing_type === "flat_per_request" &&
      Number(payload.unit_price) > 0
    ) {
      min = Math.min(min, Number(payload.unit_price));
    }
  }

  if (!Number.isFinite(min)) return 80;
  return creditsForProviderCost(min);
}
