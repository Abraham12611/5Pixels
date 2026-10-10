import { createServiceClient } from "@/lib/supabase/service";

/**
 * Fal Billing Events reconciliation (epic #89 tranche 2).
 *
 * Tranche 1 settled generations from pinned quote components — our own math.
 * This job closes the loop against fal's authoritative per-request billing:
 * fetch cost_total for each provider_request_id, record the event, reconcile
 * the customer's ledger to min(ceil(cost_total/$0.001), reserved) via an
 * auditable adjustment, and when the billed amount exceeds the quoted
 * maximum the RPC absorbs the delta above reserve and suspends the endpoint.
 *
 * API: GET https://api.fal.ai/v1/models/billing-events?request_id=a,b,c
 * Requires a fal key with billing:usage:read (BILLING or FULL preset) —
 * set FAL_BILLING_KEY; falls back to FAL_KEY if it carries the scope.
 *
 * Fail-loud contract: a missing billing key, an auth rejection (401/403),
 * or a run where every fetch batch fails throws — the cron route returns
 * 500 so Vercel/alerts surface that financial reconciliation is down,
 * and a critical admin_alerts row is raised for humans.
 */

const FAL_BILLING_URL = "https://api.fal.ai/v1/models/billing-events";
/** request_id filter is CSV — keep URLs comfortably short. */
const REQUESTS_PER_CALL = 50;
const SCAN_LIMIT = 200;
/** Billing events post with a lag — don't churn on fresh completions. */
const MIN_EVENT_AGE_MS = 30 * 60 * 1000;
/**
 * fal retains billing events for a 90-day date range; sweep generations up
 * to 85 days old so a multi-week outage/backlog can still self-heal.
 */
const SCAN_WINDOW_MS = 85 * 24 * 60 * 60 * 1000;
/**
 * The `start` lower bound must precede PROVIDER execution, not our own
 * completed_at (we mark completed only after download/upload/asset work).
 * Anchored to generation.created_at minus a safety buffer.
 */
const START_SAFETY_MS = 60 * 60 * 1000;
/** Drain loop: up to this many scan rounds per run (SCAN_LIMIT each). */
const MAX_ROUNDS = 5;

export class BillingReconcileFatal extends Error {}

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
  /** The complete raw event JSON — preserved verbatim for audit. */
  raw: Record<string, unknown>;
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
  rounds: number;
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
      raw: e,
    });
  }
  return out;
}

class FalBillingFetchError extends Error {
  constructor(
    message: string,
    readonly status: number | null
  ) {
    super(message);
  }
}

async function fetchBillingEvents(
  requestIds: string[],
  startIso: string,
  fetchImpl: typeof fetch,
  key: string
): Promise<FalBillingEvent[]> {
  const res = await fetchImpl(buildBillingEventsUrl(requestIds, startIso), {
    headers: { Authorization: `Key ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new FalBillingFetchError(
      `fal billing-events ${res.status}: ${text.slice(0, 200)}`,
      res.status
    );
  }
  return parseBillingEvents(await res.json());
}

/** Best-effort ops alert — never lets an alert failure crash the run. */
async function raiseAlert(
  client: ServiceClient,
  severity: "warning" | "critical",
  rule: string,
  message: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await client.from("admin_alerts").insert({
      rule,
      severity,
      message,
      details,
    });
  } catch (err) {
    console.error(
      "[billing-reconcile] failed to raise admin alert",
      err instanceof Error ? err.message : String(err)
    );
  }
}

interface CandidateRow {
  id: string;
  provider_request_id: string | null;
  provider_endpoint: string | null;
  created_at: string;
  completed_at: string | null;
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
    rounds: 0,
  };

  const key = billingKey();
  if (!key) {
    await raiseAlert(
      client,
      "critical",
      "billing_reconcile_broken",
      "Billing reconciliation cannot run: no fal key with billing:usage:read is configured (FAL_BILLING_KEY/FAL_KEY)",
      {}
    );
    throw new BillingReconcileFatal(
      "FAL_BILLING_KEY/FAL_KEY is not configured"
    );
  }

  const now = Date.now();
  const cutoff = new Date(now - MIN_EVENT_AGE_MS).toISOString();
  const windowStart = new Date(now - SCAN_WINDOW_MS).toISOString();

  // Drain loop: repeat scan→fetch→reconcile until the backlog is cleared,
  // the round made no progress (everything still pending provider billing),
  // or MAX_ROUNDS is hit — the next scheduled run continues from there.
  for (let round = 0; round < MAX_ROUNDS; round++) {
    summary.rounds += 1;

    const { data: candidates, error } = await client
      .from("generations")
      .select("id, provider_request_id, provider_endpoint, created_at, completed_at")
      .eq("status", "completed")
      .not("provider_request_id", "is", null)
      .is("billing_reconciled_at", null)
      .lt("completed_at", cutoff)
      .gt("created_at", windowStart)
      .order("created_at", { ascending: true })
      .limit(SCAN_LIMIT);

    if (error) {
      console.error("[billing-reconcile] candidate scan failed", error.message);
      throw new BillingReconcileFatal("Candidate scan failed");
    }

    const rows = ((candidates ?? []) as CandidateRow[]).filter(
      (r) => typeof r.provider_request_id === "string" && r.provider_request_id
    );
    summary.scanned += rows.length;
    if (rows.length === 0) break;

    // Fetch events in request_id batches. `start` is derived from the oldest
    // generation's created_at minus a buffer — guaranteed to precede provider
    // execution, unlike completed_at which lands AFTER fal already billed.
    const eventsByRequest = new Map<string, FalBillingEvent>();
    let roundProgress = 0;
    const failures: { status: number | null; message: string; rows: number }[] =
      [];

    for (let i = 0; i < rows.length; i += REQUESTS_PER_CALL) {
      const chunk = rows.slice(i, i + REQUESTS_PER_CALL);
      const oldestCreated = chunk
        .map((r) => String(r.created_at))
        .sort()[0]!;
      const startIso = new Date(
        new Date(oldestCreated).getTime() - START_SAFETY_MS
      ).toISOString();
      try {
        const events = await fetchBillingEvents(
          chunk.map((r) => r.provider_request_id as string),
          startIso,
          fetchImpl,
          key
        );
        for (const e of events) eventsByRequest.set(e.request_id, e);
      } catch (err) {
        const status =
          err instanceof FalBillingFetchError ? err.status : null;
        const message = err instanceof Error ? err.message : String(err);
        console.error("[billing-reconcile] event fetch failed", message);

        if (status === 401 || status === 403) {
          await raiseAlert(
            client,
            "critical",
            "billing_reconcile_broken",
            `fal billing-events rejected the configured key (${status}) — reconciliation is down until a key with billing:usage:read is set`,
            { status, message }
          );
          throw new BillingReconcileFatal(
            `fal billing-events auth failure (${status})`
          );
        }
        failures.push({ status, message, rows: chunk.length });
        summary.errors += chunk.length;
      }
    }
    summary.eventsFetched += eventsByRequest.size;

    // Every fetch failed → the run reconciled nothing; that's an outage, not
    // a quiet success. Alert + throw so the cron reports 500.
    const batchCount = Math.ceil(rows.length / REQUESTS_PER_CALL);
    if (failures.length === batchCount) {
      await raiseAlert(
        client,
        "critical",
        "billing_reconcile_broken",
        `All ${batchCount} fal billing-events fetches failed — reconciliation produced no data this run`,
        { failures }
      );
      throw new BillingReconcileFatal(
        `All ${batchCount} billing-events fetches failed`
      );
    }
    if (failures.length > 0) {
      await raiseAlert(
        client,
        "warning",
        "billing_reconcile_partial",
        `${failures.length}/${batchCount} fal billing-events fetches failed — affected generations retry next run`,
        { failures }
      );
    }

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
          p_raw: event.raw,
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
          roundProgress += 1;
          break;
        case "settled_unquoted":
          summary.settledUnquoted += 1;
          roundProgress += 1;
          break;
        case "overrun_absorbed":
          summary.overrunsAbsorbed += 1;
          roundProgress += 1;
          console.error(
            `[billing-reconcile] OVERRUN on ${event.endpoint_id} ` +
              `(request ${requestId}): billed $${event.cost_total} — route suspended`
          );
          break;
        case "unmatched":
          summary.unmatched += 1;
          roundProgress += 1;
          break;
        case "duplicate":
          summary.duplicates += 1;
          roundProgress += 1;
          break;
        default:
          summary.errors += 1;
      }
    }

    // Stop when the backlog is smaller than a page or the round reconciled
    // nothing (remaining rows are all still pending provider billing).
    if (rows.length < SCAN_LIMIT || roundProgress === 0) break;
  }

  return summary;
}
