import type { SupabaseClient } from "@supabase/supabase-js";
import type { SnapshotPayload } from "./types";

export interface PricingSnapshot {
  id: string;
  provider: string;
  endpointId: string;
  fetchedAt: string;
  expiresAt: string;
  payload: SnapshotPayload;
}

interface SnapshotRow {
  id: string;
  provider: string;
  endpoint_id: string;
  fetched_at: string;
  expires_at: string;
  payload: SnapshotPayload;
}

/**
 * Latest fresh pricing snapshot for an endpoint. Fail-closed: returns null
 * when no snapshot exists or the newest one is past its TTL — the caller must
 * treat the endpoint as unavailable, never approximate.
 */
export async function getFreshSnapshot(
  service: SupabaseClient,
  provider: string,
  endpointId: string
): Promise<PricingSnapshot | null> {
  const { data, error } = await service
    .from("provider_pricing_snapshots")
    .select("id, provider, endpoint_id, fetched_at, expires_at, payload")
    .eq("provider", provider)
    .eq("endpoint_id", endpointId)
    .gt("expires_at", new Date().toISOString())
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle<SnapshotRow>();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    provider: data.provider,
    endpointId: data.endpoint_id,
    fetchedAt: data.fetched_at,
    expiresAt: data.expires_at,
    payload: data.payload,
  };
}

/**
 * Whether an endpoint is allowed to accept new paid generations: a fresh
 * snapshot exists AND the route's circuit breaker is not suspended.
 */
export async function getEndpointState(
  service: SupabaseClient,
  provider: string,
  endpointId: string
): Promise<"active" | "suspended"> {
  const { data, error } = await service
    .from("provider_endpoint_state")
    .select("status")
    .eq("provider", provider)
    .eq("endpoint_id", endpointId)
    .maybeSingle<{ status: string }>();

  // Fail closed: a breaker-state lookup error must not keep a route live.
  if (error) return "suspended";
  if (!data) return "active";
  return data.status === "suspended" ? "suspended" : "active";
}
