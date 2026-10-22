import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingPolicy } from "./types";

let cached: { policy: PricingPolicy; at: number } | null = null;
const CACHE_MS = 60_000;

interface PolicyRow {
  id: string;
  version: number;
  is_active: boolean;
  credit_capacity_usd: number;
  top_up_budget_ratio: number;
  quote_max_slack_factor: number;
  quote_ttl_seconds: number;
  snapshot_ttl_hours: number;
}

/**
 * Active financial policy. Fails closed: if no active policy row exists the
 * caller must not create quotes.
 */
export async function getActivePricingPolicy(
  service: SupabaseClient
): Promise<PricingPolicy | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.policy;
  }

  const { data, error } = await service
    .from("pricing_policies")
    .select(
      "id, version, credit_capacity_usd, top_up_budget_ratio, quote_max_slack_factor, quote_ttl_seconds, snapshot_ttl_hours"
    )
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<PolicyRow>();

  if (error || !data) {
    console.error("[pricing] no active pricing policy", error?.message);
    return null;
  }

  const policy: PricingPolicy = {
    id: data.id,
    version: data.version,
    creditCapacityUsd: Number(data.credit_capacity_usd),
    topUpBudgetRatio: Number(data.top_up_budget_ratio),
    quoteMaxSlackFactor: Number(data.quote_max_slack_factor),
    quoteTtlSeconds: Number(data.quote_ttl_seconds),
    snapshotTtlHours: Number(data.snapshot_ttl_hours),
  };
  cached = { policy, at: Date.now() };
  return policy;
}

/** Test hook — clears the per-process policy cache. */
export function resetPricingPolicyCache(): void {
  cached = null;
}
