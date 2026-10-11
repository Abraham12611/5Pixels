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
 * Only quoted (#93+) generations get ledger adjustments — pre-#93 rows use
 * the old credit denomination and are recorded for analytics only.
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
 * Generations holding a reserve past this age with no billing event get a
 * warning alert — the bill is probably coming but it's worth a look.
 */
const ALERT_AGE_MS = 48 * 60 * 60 * 1000;
/**
 * Reconciliation deadline: past this, a still-unbilled generation settles
 * at the provisional quote-math charge ('fallback_timeout'). The reserve
 * can't be held hostage forever; a late event still self-corrects via the
 * adjustment path.
 */
const SETTLE_SLA_MS = 72 * 60 * 60 * 1000;
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
/** Late sweep (fallback_timeout rows) is bounded and lower priority. */
const LATE_SCAN_LIMIT = 100;
// TODO(pre-launch): permanently-missing events can starve the late sweep —
// the same oldest 100 rows recheck daily. Add a billing_late_checked_at
// retry timestamp and rotate fairly once event lag is observed in prod.

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
  fallbackSettled: number;
  agedPending: number;
  lateScanned: number;
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

function filterRows(candidates: unknown): CandidateRow[] {
  return ((candidates ?? []) as CandidateRow[]).filter(
    (r) => typeof r.provider_request_id === "string" && r.provider_request_id
  );
}

/**
 * Fetch billing events for a batch of request_ids and reconcile each one.
 * Returns the number of rows that reached a terminal RPC outcome (drives
 * the drain loop's progress check). Throws BillingReconcileFatal on auth
 * failure or total fetch failure.
 */
async function fetchAndReconcile(
  client: ServiceClient,
  key: string,
  fetchImpl: typeof fetch,
  rows: CandidateRow[],
  summary: ReconcileSummary
): Promise<number> {
  // `start` is derived from the oldest generation's created_at minus a
  // buffer — guaranteed to precede provider execution, unlike completed_at
  // which lands AFTER fal already billed.
  const eventsByRequest = new Map<string, FalBillingEvent>();
  const failures: { status: number | null; message: string; rows: number }[] =
    [];

  for (let i = 0; i < rows.length; i += REQUESTS_PER_CALL) {
    const chunk = rows.slice(i, i + REQUESTS_PER_CALL);
    const oldestCreated = chunk.map((r) => String(r.created_at)).sort()[0]!;
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
      const status = err instanceof FalBillingFetchError ? err.status : null;
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

  // Every fetch failed → this sweep reconciled nothing; that's an outage,
  // not a quiet success. Alert + throw so the cron reports 500.
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

  let progress = 0;
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
        progress += 1;
        break;
      case "settled_unquoted":
        summary.settledUnquoted += 1;
        progress += 1;
        break;
      case "overrun_absorbed":
        summary.overrunsAbsorbed += 1;
        progress += 1;
        console.error(
          `[billing-reconcile] OVERRUN on ${event.endpoint_id} ` +
            `(request ${requestId}): billed $${event.cost_total} — route suspended`
        );
        break;
      case "unmatched":
        summary.unmatched += 1;
        progress += 1;
        break;
      case "duplicate":
        summary.duplicates += 1;
        progress += 1;
        break;
      default:
        summary.errors += 1;
    }
  }

  return progress;
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
    fallbackSettled: 0,
    agedPending: 0,
    lateScanned: 0,
    errors: 0,
    rounds: 0,
  };

  const now = Date.now();
  const cutoff = new Date(now - MIN_EVENT_AGE_MS).toISOString();
  const windowStart = new Date(now - SCAN_WINDOW_MS).toISOString();

  // ------------------------------------------------------------------
  // Provider reconciliation (depends on fal being reachable). ANY fatal
  // here is captured, not thrown yet — the local fallback settle below
  // must still release >SLA holds even during a fal billing outage.
  // ------------------------------------------------------------------
  let fatal: BillingReconcileFatal | null = null;
  try {
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

    // HOT SWEEP: generations awaiting their first settlement.
    // fallback_timeout rows are excluded — they're already customer-settled
    // and belong to the late sweep below.
    for (let round = 0; round < MAX_ROUNDS; round++) {
      summary.rounds += 1;

      const { data: candidates, error } = await client
        .from("generations")
        .select("id, provider_request_id, provider_endpoint, created_at, completed_at")
        .eq("status", "completed")
        .not("provider_request_id", "is", null)
        .is("billing_reconciled_at", null)
        .is("billing_reconcile_state", null)
        .lt("completed_at", cutoff)
        .gt("created_at", windowStart)
        .order("created_at", { ascending: true })
        .limit(SCAN_LIMIT);

      if (error) {
        console.error(
          "[billing-reconcile] candidate scan failed",
          error.message
        );
        throw new BillingReconcileFatal("Candidate scan failed");
      }

      const rows = filterRows(candidates);
      summary.scanned += rows.length;
      if (rows.length === 0) break;

      const progress = await fetchAndReconcile(client, key, fetchImpl, rows, summary);

      // Stop when the backlog is smaller than a page or the round
      // reconciled nothing (still pending provider billing).
      if (rows.length < SCAN_LIMIT || progress === 0) break;
    }

    // LATE SWEEP: fallback_timeout rows still get their request_id checked
    // — a late fal event self-corrects the provisional settle and flips the
    // row to 'provider_late'. Bounded and lower priority.
    const { data: lateCandidates, error: lateError } = await client
      .from("generations")
      .select("id, provider_request_id, provider_endpoint, created_at, completed_at")
      .eq("status", "completed")
      .not("provider_request_id", "is", null)
      .is("billing_reconciled_at", null)
      .eq("billing_reconcile_state", "fallback_timeout")
      .gt("created_at", windowStart)
      .order("created_at", { ascending: true })
      .limit(LATE_SCAN_LIMIT);

    if (lateError) {
      console.error(
        "[billing-reconcile] late sweep failed",
        lateError.message
      );
      summary.errors += 1;
    } else {
      const lateRows = filterRows(lateCandidates);
      summary.lateScanned = lateRows.length;
      if (lateRows.length > 0) {
        await fetchAndReconcile(client, key, fetchImpl, lateRows, summary);
      }
    }
  } catch (err) {
    if (err instanceof BillingReconcileFatal) {
      fatal = err;
    } else {
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Local policy passes — always run, even when fal reconciliation is
  // broken. The SLA fallback is a database-local decision; a fal billing
  // outage must not hold customer reserves hostage indefinitely.
  // ------------------------------------------------------------------

  // SLA fallback: generations past the reconciliation deadline with no
  // billing event settle at the provisional quote-math charge and move to
  // the late sweep — a permanently missing event can't clog the queue.
  const { data: settled, error: settleError } = await client.rpc(
    "settle_unbilled_generations",
    {
      p_completed_before: new Date(now - SETTLE_SLA_MS).toISOString(),
      p_limit: SCAN_LIMIT,
    }
  );
  if (settleError) {
    console.error(
      "[billing-reconcile] fallback settle failed",
      settleError.message
    );
    summary.errors += 1;
  } else {
    summary.fallbackSettled = typeof settled === "number" ? settled : 0;
    if (summary.fallbackSettled > 0) {
      await raiseAlert(
        client,
        "warning",
        "billing_reconcile_missing_events",
        `${summary.fallbackSettled} generation(s) settled at provisional quote math — no fal billing event within ${SETTLE_SLA_MS / 3600000}h`,
        { fallbackSettled: summary.fallbackSettled }
      );
    }
  }

  // Aged pending: holds still open past the alert threshold but under the
  // settlement deadline — fal's event is late; surface it before fallback.
  const { count: aged, error: agedError } = await client
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .not("provider_request_id", "is", null)
    .is("billing_reconciled_at", null)
    .is("billing_reconcile_state", null)
    .lt("completed_at", new Date(now - ALERT_AGE_MS).toISOString());
  if (agedError) {
    console.error("[billing-reconcile] aged scan failed", agedError.message);
  } else {
    summary.agedPending = aged ?? 0;
    if (summary.agedPending > 0) {
      await raiseAlert(
        client,
        "warning",
        "billing_reconcile_aged_pending",
        `${summary.agedPending} generation(s) still awaiting a fal billing event after ${ALERT_AGE_MS / 3600000}h`,
        { agedPending: summary.agedPending }
      );
    }
  }

  if (fatal) throw fatal;
  return summary;
}
