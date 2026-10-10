import { createServiceClient } from "@/lib/supabase/service";

/**
 * Fal Billing Events reconciliation (epic #89 tranche 2).
 *
 * Tranche 1 settled generations from pinned quote components — our own math.
 * This job closes the loop against fal's authoritative per-request billing:
 * fetch cost_total for each provider_request_id, record the event, and when
 * the billed amount exceeds the quoted maximum, the RPC absorbs the delta
 * (customers are never debited above reserve) and suspends the endpoint.
 *
 * API: GET https://api.fal.ai/v1/models/billing-events?request_id=a,b,c
 * Requires a fal key with billing:usage:read (BILLING or FULL preset) —
 * set FAL_BILLING_KEY; falls back to FAL_KEY if it carries the scope.
 */

const FAL_BILLING_URL = "https://api.fal.ai/v1/models/billing-events";
/** request_id filter is CSV — keep URLs comfortably short. */
const REQUESTS_PER_CALL = 50;
const SCAN_LIMIT = 200;
/** Billing events post with a lag — don't churn on fresh completions. */
const MIN_EVENT_AGE_MS = 30 * 60 * 1000;
/** Don't chase events for generations older than this (90d API cap + slack). */
const SCAN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export interface FalBillingEvent {
  request_id: string;
  endpoint_id: string | null;
  timestamp: string | null;
  output_units: number | null;
  unit: string | null;
  unit_price: number | null;
  percent_discount: number | null;
  cost_subtotal: number | null;
  cost_discount: number | null;
  cost_total: number;
}

export interface ReconcileSummary {
  scanned: number;
  eventsFetched: number;
  settled: number;
  settledUnquoted: number;
  overrunsAbsorbed: number;
  unmatched: number;
  duplicates: number;
  pendingBilling: number;
  errors: number;
}

type ServiceClient = ReturnType<typeof createServiceClient>;

function billingKey(): string | null {
  return (
    process.env.FAL_BILLING_KEY?.trim() ||
    process.env.FAL_KEY?.trim() ||
    null
  );
}

export function buildBillingEventsUrl(
  requestIds: string[],
  startIso: string
): string {
  const params = new URLSearchParams({
    request_id: requestIds.join(","),
    start: startIso,
    limit: String(REQUESTS_PER_CALL),
  });
  return `${FAL_BILLING_URL}?${params.toString()}`;
}

/** Defensive parse: a malformed event is dropped, not trusted. */
export function parseBillingEvents(raw: unknown): FalBillingEvent[] {
  const list =
    raw && typeof raw === "object"
      ? (raw as { billing_events?: unknown }).billing_events
      : null;
  if (!Array.isArray(list)) return [];

  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const out: FalBillingEvent[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (typeof e.request_id !== "string" || e.request_id.length === 0) continue;
    const costTotal = num(e.cost_total);
    if (costTotal == null || costTotal < 0) continue;
    out.push({
      request_id: e.request_id,
      endpoint_id: typeof e.endpoint_id === "string" ? e.endpoint_id : null,
      timestamp: typeof e.timestamp === "string" ? e.timestamp : null,
      output_units: num(e.output_units),
      unit: typeof e.unit === "string" ? e.unit : null,
      unit_price: num(e.unit_price),
      percent_discount: num(e.percent_discount),
      cost_subtotal: num(e.cost_subtotal),
      cost_discount: num(e.cost_discount),
      cost_total: costTotal,
    });
  }
  return out;
}

async function fetchBillingEvents(
  requestIds: string[],
  startIso: string,
  fetchImpl: typeof fetch
): Promise<FalBillingEvent[]> {
  const key = billingKey();
  if (!key) {
    throw new Error("FAL_BILLING_KEY/FAL_KEY is not configured");
  }
  const res = await fetchImpl(buildBillingEventsUrl(requestIds, startIso), {
    headers: { Authorization: `Key ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fal billing-events ${res.status}: ${text.slice(0, 200)}`);
  }
  return parseBillingEvents(await res.json());
}

export async function runBillingReconciliation(
  service?: ServiceClient,
  fetchImpl: typeof fetch = fetch
): Promise<ReconcileSummary> {
  const client = service ?? createServiceClient();
  const summary: ReconcileSummary = {
    scanned: 0,
    eventsFetched: 0,
    settled: 0,
    settledUnquoted: 0,
    overrunsAbsorbed: 0,
    unmatched: 0,
    duplicates: 0,
    pendingBilling: 0,
    errors: 0,
  };

  const now = Date.now();
  const cutoff = new Date(now - MIN_EVENT_AGE_MS).toISOString();
  const windowStart = new Date(now - SCAN_WINDOW_MS).toISOString();

  const { data: candidates, error } = await client
    .from("generations")
    .select("id, provider_request_id, provider_endpoint, completed_at")
    .eq("status", "completed")
    .not("provider_request_id", "is", null)
    .is("billing_reconciled_at", null)
    .lt("completed_at", cutoff)
    .gt("completed_at", windowStart)
    .order("completed_at", { ascending: true })
    .limit(SCAN_LIMIT);

  if (error) {
    console.error("[billing-reconcile] candidate scan failed", error.message);
    throw new Error("Candidate scan failed");
  }

  const rows = (candidates ?? []).filter(
    (r) => typeof r.provider_request_id === "string" && r.provider_request_id
  );
  summary.scanned = rows.length;
  if (rows.length === 0) return summary;

  // Fetch events in request_id batches; fal may not have billed some yet —
  // those stay unreconciled and are retried on the next run.
  const eventsByRequest = new Map<string, FalBillingEvent>();
  for (let i = 0; i < rows.length; i += REQUESTS_PER_CALL) {
    const chunk = rows.slice(i, i + REQUESTS_PER_CALL);
    const oldest = chunk
      .map((r) => String(r.completed_at))
      .sort()[0]!;
    try {
      const events = await fetchBillingEvents(
        chunk.map((r) => r.provider_request_id as string),
        oldest,
        fetchImpl
      );
      for (const e of events) eventsByRequest.set(e.request_id, e);
    } catch (err) {
      console.error(
        "[billing-reconcile] event fetch failed",
        err instanceof Error ? err.message : String(err)
      );
      summary.errors += chunk.length;
    }
  }
  summary.eventsFetched = eventsByRequest.size;

  for (const row of rows) {
    const requestId = row.provider_request_id as string;
    const event = eventsByRequest.get(requestId);
    if (!event) {
      summary.pendingBilling += 1;
      continue;
    }

    const { data: result, error: rpcError } = await client.rpc(
      "reconcile_billing_event",
      {
        p_provider: "fal",
        p_request_id: event.request_id,
        p_endpoint_id: event.endpoint_id,
        p_event_timestamp: event.timestamp,
        p_output_units: event.output_units,
        p_unit: event.unit,
        p_unit_price: event.unit_price,
        p_percent_discount: event.percent_discount,
        p_cost_subtotal: event.cost_subtotal,
        p_cost_discount: event.cost_discount,
        p_cost_total: event.cost_total,
        p_raw: event,
      }
    );

    if (rpcError) {
      console.error(
        `[billing-reconcile] reconcile failed for ${requestId}`,
        rpcError.message
      );
      summary.errors += 1;
      continue;
    }

    switch (result) {
      case "settled":
        summary.settled += 1;
        break;
      case "settled_unquoted":
        summary.settledUnquoted += 1;
        break;
      case "overrun_absorbed":
        summary.overrunsAbsorbed += 1;
        console.error(
          `[billing-reconcile] OVERRUN on ${event.endpoint_id} ` +
            `(request ${requestId}): billed $${event.cost_total} — route suspended`
        );
        break;
      case "unmatched":
        summary.unmatched += 1;
        break;
      case "duplicate":
        summary.duplicates += 1;
        break;
      default:
        summary.errors += 1;
    }
  }

  return summary;
}
