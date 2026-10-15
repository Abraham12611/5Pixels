import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { FAL_PRICING_DEFINITIONS } from "@/lib/pricing/definitions/fal";
import type { SnapshotPayload } from "@/lib/pricing/types";

/**
 * Read-only pricing-freshness status for the admin surface (#104). Merges
 * three layers per endpoint: the coarse feed row (provider_model_pricing),
 * the newest immutable snapshot (provider_pricing_snapshots), and the
 * circuit-breaker state (provider_endpoint_state). Never writes — pricing
 * values shown here are provider data, not editable knobs.
 */

export interface PricingRouteStatus {
  endpointId: string;
  /** Present when the endpoint has a verified definition in code. */
  defined: boolean;
  pricingType: string | null;
  snapshotSource: string | null;
  fetchedAt: string | null;
  expiresAt: string | null;
  /** True when the newest snapshot is past its expiry (route unquotable). */
  stale: boolean;
  /** True when the newest fresh snapshot is quotable. */
  quotable: boolean;
  endpointState: string;
  suspendReason: string | null;
  coarseUnitPrice: number | null;
  coarseUnit: string | null;
  coarseLastSeen: string | null;
}

interface SnapshotRow {
  endpoint_id: string;
  fetched_at: string;
  expires_at: string;
  payload: SnapshotPayload;
  source: string;
}

interface EndpointStateRow {
  endpoint_id: string;
  status: string;
  suspend_reason: string | null;
}

interface CoarseRow {
  endpoint_id: string;
  unit_price: number;
  unit: string;
  metadata: Record<string, unknown> | null;
}

export async function getPricingRouteStatus(
  client?: SupabaseClient
): Promise<PricingRouteStatus[]> {
  const service = client ?? createServiceClient();

  const [snapshotsRes, statesRes, coarseRes] = await Promise.all([
    service
      .from("provider_pricing_snapshots")
      .select("endpoint_id, fetched_at, expires_at, payload, source")
      .eq("provider", "fal")
      .order("fetched_at", { ascending: false })
      .limit(2000),
    service
      .from("provider_endpoint_state")
      .select("endpoint_id, status, suspend_reason")
      .eq("provider", "fal"),
    service
      .from("provider_model_pricing")
      .select("endpoint_id, unit_price, unit, metadata")
      .eq("provider", "fal")
      .eq("is_active", true),
  ]);

  // Newest snapshot per endpoint (rows arrive fetched_at DESC).
  const latestSnapshot = new Map<string, SnapshotRow>();
  for (const row of (snapshotsRes.data ?? []) as SnapshotRow[]) {
    if (!latestSnapshot.has(row.endpoint_id)) {
      latestSnapshot.set(row.endpoint_id, row);
    }
  }
  const states = new Map(
    ((statesRes.data ?? []) as EndpointStateRow[]).map((r) => [
      r.endpoint_id,
      r,
    ])
  );
  const coarse = new Map(
    ((coarseRes.data ?? []) as CoarseRow[]).map((r) => [r.endpoint_id, r])
  );

  const endpointIds = new Set<string>([
    ...latestSnapshot.keys(),
    ...states.keys(),
    ...coarse.keys(),
    ...FAL_PRICING_DEFINITIONS.map((d) => d.endpointId),
  ]);

  const now = Date.now();
  const rows: PricingRouteStatus[] = [];
  for (const endpointId of endpointIds) {
    const snap = latestSnapshot.get(endpointId);
    const state = states.get(endpointId);
    const feed = coarse.get(endpointId);
    const expiresAt = snap?.expires_at ?? null;
    const fresh = expiresAt !== null && Date.parse(expiresAt) > now;
    const pricingType = snap?.payload?.pricing_type ?? null;
    rows.push({
      endpointId,
      defined: FAL_PRICING_DEFINITIONS.some((d) => d.endpointId === endpointId),
      pricingType,
      snapshotSource: snap?.source ?? null,
      fetchedAt: snap?.fetched_at ?? null,
      expiresAt,
      stale: !fresh,
      quotable: fresh && pricingType !== "unsupported",
      endpointState: state?.status ?? "active",
      suspendReason: state?.suspend_reason ?? null,
      coarseUnitPrice: feed ? Number(feed.unit_price) : null,
      coarseUnit: feed?.unit ?? null,
      coarseLastSeen:
        (feed?.metadata?.last_seen_at as string | undefined) ?? null,
    });
  }

  // Defined-but-broken first, then defined, then discovery-only.
  return rows.sort((a, b) => {
    if (a.defined !== b.defined) return a.defined ? -1 : 1;
    if (a.quotable !== b.quotable) return a.quotable ? 1 : -1;
    return a.endpointId.localeCompare(b.endpointId);
  });
}
