"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getProviderEndpoint } from "@/lib/ai/provider-routing";
import type { ProviderStrategy } from "@/lib/ai/provider-routing";
import type { OutputSizeOption } from "@/types/catalog";

export interface CostEstimateInput {
  productVersionId: string;
  outputSize: OutputSizeOption;
}

export interface CostEstimateResult {
  estimatedCredits: number;
  providerEndpoint: string | null;
  fallbackEndpoint: string | null;
}

function calculateCreditCost(
  unitPrice: number,
  quantity: number,
  markup: number
): number {
  const rawCost = unitPrice * quantity;
  const credits = (rawCost * 1.10 * markup) / 0.01;
  return Math.ceil(credits * 100) / 100;
}

function getQuantity(unit: string, width: number, height: number): number {
  switch (unit) {
    case "images":
    case "generations":
      return 1;
    case "megapixel":
      return (width * height) / 1_000_000;
    case "compute seconds":
    case "seconds":
      return 15; // worst-case cap used for estimates
    default:
      return 1;
  }
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

export async function estimateGenerationCost(
  input: CostEstimateInput
): Promise<CostEstimateResult> {
  const supabase = await createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { estimatedCredits: 0, providerEndpoint: null, fallbackEndpoint: null };
  }

  const providerStrategy = await getProviderStrategy(input.productVersionId);
  if (!providerStrategy) {
    return { estimatedCredits: 0, providerEndpoint: null, fallbackEndpoint: null };
  }

  const providerEndpoint = getProviderEndpoint(providerStrategy);
  if (!providerEndpoint) {
    return { estimatedCredits: 0, providerEndpoint: null, fallbackEndpoint: null };
  }

  const { data: markupData, error: markupError } = await supabase.rpc(
    "get_user_markup_multiplier",
    { p_user_id: user.id }
  );
  if (markupError || markupData === null) {
    console.error("[estimateGenerationCost] markup lookup failed", markupError?.message);
    return { estimatedCredits: 0, providerEndpoint, fallbackEndpoint: null };
  }

  const { data: pricing, error: pricingError } = await service
    .from("provider_model_pricing")
    .select("unit_price, unit")
    .eq("provider", "fal")
    .eq("endpoint_id", providerEndpoint)
    .eq("is_active", true)
    .lte("effective_from", new Date().toISOString())
    .order("effective_from", { ascending: false })
    .limit(1)
    .single();

  if (pricingError || !pricing) {
    console.error("[estimateGenerationCost] pricing lookup failed", pricingError?.message);
    return { estimatedCredits: 0, providerEndpoint, fallbackEndpoint: null };
  }

  const quantity = getQuantity(
    pricing.unit,
    input.outputSize.width,
    input.outputSize.height
  );
  const estimatedCredits = calculateCreditCost(
    Number(pricing.unit_price),
    quantity,
    Number(markupData)
  );

  return {
    estimatedCredits,
    providerEndpoint,
    fallbackEndpoint: null,
  };
}
