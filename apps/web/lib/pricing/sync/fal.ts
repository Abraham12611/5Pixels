import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivePricingPolicy } from "../policy";
import {
  FAL_PRICING_DEFINITIONS,
  type FalPricingDefinition,
} from "../definitions/fal";
import type { SnapshotPayload } from "../types";

/**
 * Fal pricing snapshot sync (issue #104).
 *
 * Turns authoritative Fal pricing + reviewed definitions into fresh,
 * immutable provider_pricing_snapshots so quotes never rely on data older
 * than the configured snapshot TTL. Deliberately scoped:
 *
 *   - writes snapshots ONLY for endpoints with a verified definition —
 *     coarse feed data refreshes provider_model_pricing (discovery) but can
 *     never make an endpoint quotable by itself;
 *   - every cost-bearing component carries provenance: the feed refreshes
 *     the base unit price, while tier ratios / surcharges come from a
 *     docs-verified definition with its own expiry. Stale components → the
 *     route fails closed instead of stamping a partially-stale price fresh;
 *   - snapshots are immutable rows; a new row appears only when the content
 *     hash changed or the current one is inside the renewal window;
 *   - provider_endpoint_state is never touched — a billing_overrun or
 *     manual suspension survives a successful sync.
 *
 * Fail-loud contract: a missing fal key or a run where every pricing fetch
 * fails throws PricingSyncFatal — the cron route returns 500 so Vercel and
 * alerts surface that pricing freshness is down, and a critical
 * admin_alerts row is raised for humans.
 */

const PRICING_API = "https://api.fal.ai/v1/models/pricing";
const ENDPOINTS_PER_CALL = 50;
/**
 * An unchanged snapshot is re-issued once its remaining life drops below
 * this fraction of the TTL — with sync cadence comfortably under that
 * window, a route can never lapse between runs. Hash-identical rows outside
 * the window are skipped, so an unchanging price produces ~TTL/2 churn, not
 * a row per run.
 */
const RENEWAL_FRACTION = 0.5;
const SNAPSHOT_SOURCE = "pricing-sync";
/**
 * The feed throttles hard after a couple of rapid requests — a sync that
 * fires >10 batches back-to-back otherwise starves the later ones, which
 * is exactly where the defined endpoints sorted (see the request notes
 * inside runFalPricingSync). Requests are spaced and 429s retried.
 */
const INTER_REQUEST_MS = 1_500;
const MAX_429_RETRIES = 3;
const RETRY_429_BASE_MS = 1_000;
const MAX_RETRY_DELAY_MS = 20_000;
/**
 * Discovery-refresh budget: the defined-endpoint phase above must finish
 * even when the sweep is slow or throttled, so the coarse batches stop
 * claiming wall-clock once the budget is spent. Missed rows just stay on
 * their previous last_seen until the next run.
 */
const COARSE_FETCH_BUDGET_MS = 120_000;

export class PricingSyncFatal extends Error {}

function retryDelayMs(res: Response, depth: number): number {
  const raw = res.headers?.get?.("retry-after");
  const secs = raw ? Number(raw) : NaN;
  if (Number.isFinite(secs) && secs >= 0) {
    return Math.min(secs * 1000, MAX_RETRY_DELAY_MS);
  }
  return Math.min(RETRY_429_BASE_MS * 2 ** depth, MAX_RETRY_DELAY_MS);
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One normalized record from GET /v1/models/pricing. */
export interface FalPriceRecord {
  endpointId: string;
  /** null when the feed sent an unparseable price — malformed ≠ missing. */
  unitPrice: number | null;
  unit: string | null;
  currency: string | null;
}

export interface FalPricingSyncDeps {
  fetchImpl?: typeof fetch;
  /** Clock override for tests. */
  now?: Date;
  /** fal key override for tests; defaults to FAL_KEY. */
  key?: string;
  /** Definition registry override for tests. */
  definitions?: readonly FalPricingDefinition[];
  /** Sleep override for tests — real timers otherwise. */
  sleepImpl?: (ms: number) => Promise<void>;
}

export interface FalPricingSyncReport {
  fetchedAt: string;
  feedRecords: number;
  /** Defined endpoints whose pricing batch failed — left untouched. */
  fetchFailedEndpoints: number;
  coarseRowsWritten: number;
  coarseRowsSeen: number;
  snapshotsWritten: number;
  renewed: number;
  unchanged: number;
  /**
   * Inserts that failed on rows identical to the current snapshot (renewal
   * copies). Failures where the price content CHANGED don't land here —
   * those are fatal to the run (see PricingSyncFatal).
   */
  renewalWriteFailures: string[];
  unsupported: { endpointId: string; reason: string }[];
  /** Coarse rows flipped to is_active=false after a confirmed solo 404. */
  deactivated: string[];
  /** Discovery endpoints left unfetched when the time budget ran out. */
  coarseSkipped: number;
  alertsRaised: string[];
}

/**
 * Parse the pricing feed defensively. Rows without a string endpoint_id are
 * dropped (they can't be keyed); rows with a key but unparseable numbers
 * are kept so the endpoint check can distinguish malformed from missing.
 */
export function parsePricingFeed(raw: unknown): FalPriceRecord[] {
  const prices = (raw as { prices?: unknown } | null)?.prices;
  if (!Array.isArray(prices)) return [];
  const out: FalPriceRecord[] = [];
  for (const p of prices) {
    const r = p as Record<string, unknown> | null;
    const endpointId =
      r && typeof r.endpoint_id === "string" ? r.endpoint_id : null;
    if (!endpointId) continue;
    const unitPrice = Number(r?.unit_price);
    out.push({
      endpointId,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : null,
      unit: typeof r?.unit === "string" ? r.unit : null,
      // Fal prices are USD-denominated; an absent field reads as USD, an
      // explicit other currency does not.
      currency: typeof r?.currency === "string" ? r.currency : "USD",
    });
  }
  return out;
}

/** Deterministic stringify — sorted keys at every depth. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

/**
 * Hash the economics that must match for a snapshot to be "the same":
 * endpoint, definition version/verification window, and every priced field.
 * Volatile fields (fetched_at) are excluded, and definition_version +
 * componentsVerifiedUntil are included — a review-date bump or a changed
 * interpretation produces a fresh snapshot even when the feed price is
 * identical.
 */
function snapshotContentHash(
  endpointId: string,
  def: FalPricingDefinition | null,
  payload: SnapshotPayload
): string {
  return createHash("sha256")
    .update(
      stableStringify({
        endpoint_id: endpointId,
        definition_version: def?.definitionVersion ?? null,
        components_verified_until: def?.componentsVerifiedUntil ?? null,
        pricing_type: payload.pricing_type,
        currency: payload.currency ?? null,
        unit: payload.unit ?? null,
        unit_price: payload.unit_price ?? null,
        tier_map: payload.tier_map ?? null,
        tiers: payload.tiers ?? null,
        modifiers: payload.modifiers ?? null,
        reason: payload.unsupported_reason ?? null,
      })
    )
    .digest("hex");
}

/** Round to 6dp — kills binary-float noise (0.08 × 1.5 = 0.12000000000000001). */
function usd(value: number): number {
  return Number(value.toFixed(6));
}

/** "3h 42m" for alert copy. */
function formatRemaining(ms: number): string {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Build the quotable payload for a definition + fresh feed record. Tier
 * prices are derived: absolute USD = feed base price × verified multiplier.
 * Provenance records which layer each cost component came from.
 */
function buildVerifiedPayload(
  def: FalPricingDefinition,
  record: FalPriceRecord,
  fetchedAt: string
): SnapshotPayload {
  const base = record.unitPrice!;
  const payload: SnapshotPayload = {
    pricing_type: def.pricingType,
    currency: "USD",
    unit: record.unit ?? def.feedUnit,
    unit_price: base,
  };

  const components: NonNullable<SnapshotPayload["provenance"]>["components"] = {
    unit_price: { source: "fal_pricing_api", fetched_at: fetchedAt },
  };

  if (def.pricingType === "resolution_tier") {
    const tiers: Record<string, number> = {};
    for (const [tier, mult] of Object.entries(def.tierMultipliers ?? {})) {
      tiers[tier] = usd(base * mult);
    }
    payload.tier_map = def.tierMap;
    payload.tiers = tiers;
    if (def.modifiers) payload.modifiers = def.modifiers;
    components.tiers = {
      source: "verified_definition",
      verified_until: def.componentsVerifiedUntil,
    };
    if (def.modifiers) {
      components.modifiers = {
        source: "verified_definition",
        verified_until: def.componentsVerifiedUntil,
      };
    }
  } else {
    // For flat/per_megapixel endpoints the "shape is simple" claim itself is
    // a verified component — hidden surcharges would silently underbill.
    components.shape = {
      source: "verified_definition",
      verified_until: def.componentsVerifiedUntil,
    };
  }

  payload.provenance = {
    definition_version: def.definitionVersion,
    components,
  };
  return payload;
}

function unsupportedPayload(
  reason: string,
  record: FalPriceRecord | null
): SnapshotPayload {
  return {
    pricing_type: "unsupported",
    unsupported_reason: reason,
    unit_price: record?.unitPrice ?? undefined,
    unit: record?.unit ?? undefined,
    currency: record?.currency ?? undefined,
  };
}

async function raiseAlert(
  client: SupabaseClient,
  severity: "info" | "warning" | "critical",
  rule: string,
  message: string,
  details: Record<string, unknown>,
  raised: Set<string>
): Promise<void> {
  try {
    // Per-rule+endpoint dedupe against still-open alerts — a run shouldn't
    // spam a new row every cron tick for the same unfixed route.
    const { data: open } = await client
      .from("admin_alerts")
      .select("details")
      .eq("rule", rule)
      .is("acknowledged_at", null)
      .is("resolved_at", null);
    const endpointId = (details.endpoint_id as string) ?? null;
    const alreadyOpen = (open ?? []).some(
      (a) =>
        (((a.details as Record<string, unknown>)?.endpoint_id as
          string | undefined) ?? null) === endpointId
    );
    if (alreadyOpen || raised.has(`${rule}:${endpointId}`)) return;
    raised.add(`${rule}:${endpointId}`);
    await client.from("admin_alerts").insert({
      rule,
      severity,
      message,
      details,
    });
  } catch (err) {
    console.error(
      "[pricing-sync] failed to raise admin alert",
      err instanceof Error ? err.message : String(err)
    );
  }
}

interface SnapshotRow {
  content_hash: string | null;
  expires_at: string;
}

interface CoarseRow {
  id: string;
  endpoint_id: string;
  unit_price: number | string;
  unit: string;
  currency: string;
  metadata: Record<string, unknown> | null;
}

/**
 * Refresh the coarse discovery layer. History-preserving: a changed record
 * closes the active row (effective_to) and opens a new one; an unchanged
 * one just bumps metadata.last_seen_at so operators can see the check ran.
 */
async function refreshCoarseFeed(
  client: SupabaseClient,
  records: FalPriceRecord[],
  nowIso: string,
  report: FalPricingSyncReport
): Promise<void> {
  const { data: existing } = await client
    .from("provider_model_pricing")
    .select("id, endpoint_id, unit_price, unit, currency, metadata")
    .eq("provider", "fal")
    .eq("is_active", true);
  const byEndpoint = new Map(
    ((existing ?? []) as CoarseRow[]).map((r) => [r.endpoint_id, r])
  );

  for (const rec of records) {
    const cur = byEndpoint.get(rec.endpointId);
    if (rec.unitPrice == null || rec.unit == null) continue; // malformed
    report.coarseRowsSeen++;
    if (!cur) {
      const { error } = await client.from("provider_model_pricing").insert({
        provider: "fal",
        endpoint_id: rec.endpointId,
        unit_price: rec.unitPrice,
        unit: rec.unit,
        currency: rec.currency ?? "USD",
        is_active: true,
        metadata: { source: SNAPSHOT_SOURCE, last_seen_at: nowIso },
      });
      if (!error) report.coarseRowsWritten++;
      continue;
    }
    const samePrice =
      Number(cur.unit_price) === rec.unitPrice &&
      cur.unit === rec.unit &&
      cur.currency === (rec.currency ?? "USD");
    if (samePrice) {
      await client
        .from("provider_model_pricing")
        .update({
          metadata: {
            ...(cur.metadata ?? {}),
            source: SNAPSHOT_SOURCE,
            last_seen_at: nowIso,
          },
        })
        .eq("id", cur.id);
      continue;
    }
    // Price moved — close the old row and open a new effective interval.
    const { error: closeErr } = await client
      .from("provider_model_pricing")
      .update({ is_active: false, effective_to: nowIso })
      .eq("id", cur.id);
    if (closeErr) continue;
    const { error } = await client.from("provider_model_pricing").insert({
      provider: "fal",
      endpoint_id: rec.endpointId,
      unit_price: rec.unitPrice,
      unit: rec.unit,
      currency: rec.currency ?? "USD",
      is_active: true,
      effective_from: nowIso,
      metadata: { source: SNAPSHOT_SOURCE, last_seen_at: nowIso },
    });
    if (!error) report.coarseRowsWritten++;
  }
}

export async function runFalPricingSync(
  client: SupabaseClient,
  deps: FalPricingSyncDeps = {}
): Promise<FalPricingSyncReport> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? new Date();
  const nowIso = now.toISOString();
  const definitions = deps.definitions ?? FAL_PRICING_DEFINITIONS;
  const raised = new Set<string>();
  const report: FalPricingSyncReport = {
    fetchedAt: nowIso,
    feedRecords: 0,
    fetchFailedEndpoints: 0,
    coarseRowsWritten: 0,
    coarseRowsSeen: 0,
    snapshotsWritten: 0,
    renewed: 0,
    unchanged: 0,
    renewalWriteFailures: [],
    unsupported: [],
    deactivated: [],
    coarseSkipped: 0,
    alertsRaised: [],
  };

  const key = deps.key ?? process.env.FAL_KEY?.trim();
  if (!key) {
    await raiseAlert(
      client,
      "critical",
      "fal_pricing_sync_failed",
      "Fal pricing sync cannot run: FAL_KEY is not configured",
      {},
      raised
    );
    report.alertsRaised.push("fal_pricing_sync_failed");
    throw new PricingSyncFatal("FAL_KEY is not configured");
  }

  const policy = await getActivePricingPolicy(client);
  if (!policy) {
    await raiseAlert(
      client,
      "critical",
      "fal_pricing_sync_failed",
      "Fal pricing sync cannot run: no active pricing policy",
      {},
      raised
    );
    report.alertsRaised.push("fal_pricing_sync_failed");
    throw new PricingSyncFatal("no active pricing policy");
  }
  const ttlMs = policy.snapshotTtlHours * 60 * 60 * 1000;

  // Endpoint set: verified definitions ∪ coarse discovery rows. Fetching
  // the coarse set keeps provider_model_pricing fresh for ops/review;
  // only defined endpoints ever produce quotable snapshots.
  const { data: coarseRows } = await client
    .from("provider_model_pricing")
    .select("endpoint_id, metadata")
    .eq("provider", "fal")
    .eq("is_active", true);
  const definedIds = new Set(definitions.map((d) => d.endpointId));
  const endpointSet = new Set<string>(definedIds);
  for (const r of (coarseRows ?? []) as { endpoint_id: string }[]) {
    endpointSet.add(r.endpoint_id);
  }

  const feed = new Map<string, FalPriceRecord>();
  const fetchFailed = new Set<string>();
  const sleep = deps.sleepImpl ?? defaultSleep;
  let calls = 0;

  /**
   * One pricing-feed request for `ids`, with three failure mitigations:
   *
   *  - 429: honor Retry-After / exponential backoff and retry — without
   *    this, back-to-back batches always starve the later ones;
   *  - any other failure with more than one id: split and retry — a
   *    single delisted endpoint returns 404 for the WHOLE batch request,
   *    which used to mark all 50 ids it rode with as failed;
   *  - a confirmed solo 404 deactivates the coarse row so a delisted id
   *    stops poisoning every future batch it lands in.
   */
  const request = async (ids: string[], depth: number): Promise<void> => {
    if (calls++ > 0) await sleep(INTER_REQUEST_MS);
    const url = new URL(PRICING_API);
    for (const id of ids) url.searchParams.append("endpoint_id", id);
    let res: Response | null;
    try {
      res = await fetchImpl(url.toString(), {
        headers: { Authorization: `Key ${key}` },
      });
    } catch {
      res = null;
    }

    if (res?.ok) {
      for (const rec of parsePricingFeed(await res.json())) {
        feed.set(rec.endpointId, rec);
        report.feedRecords++;
      }
      return;
    }

    // Sustained throttling: retry, then give up on the whole group —
    // bisecting a 429 would multiply requests into an already-hot limit.
    if (res?.status === 429) {
      if (depth < MAX_429_RETRIES) {
        await sleep(retryDelayMs(res, depth));
        return request(ids, depth + 1);
      }
      ids.forEach((id) => fetchFailed.add(id));
      return;
    }

    if (ids.length > 1) {
      const mid = Math.ceil(ids.length / 2);
      await request(ids.slice(0, mid), 0);
      await request(ids.slice(mid), 0);
      return;
    }

    const id = ids[0]!;
    fetchFailed.add(id);
    if (res?.status === 404 && !definedIds.has(id)) {
      const { error } = await client
        .from("provider_model_pricing")
        .update({ is_active: false })
        .eq("provider", "fal")
        .eq("endpoint_id", id)
        .eq("is_active", true);
      if (!error) report.deactivated.push(id);
    }
  };

  // Verified definitions ride their own request and go FIRST: quotable
  // snapshots must never depend on the discovery sweep's health — both
  // failure modes above used to live in the coarse batches the defined
  // endpoints sorted into. The snapshot writes below complete before the
  // coarse sweep starts, so a slow or throttled discovery run (or a
  // function timeout mid-sweep) can never starve route quotability.
  await request([...definedIds].sort(), 0);

  // Per-definition snapshot write. Every outcome is a fresh immutable row
  // (or a dedupe skip) — never an UPDATE of history.
  const changedWriteFailures: string[] = [];
  for (const def of definitions) {
    const { data: latestRow } = await client
      .from("provider_pricing_snapshots")
      .select("content_hash, expires_at")
      .eq("provider", "fal")
      .eq("endpoint_id", def.endpointId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle<SnapshotRow>();
    const latest = latestRow ?? null;

    let payload: SnapshotPayload;
    let expiresAt: number;
    let reason: string | null = null;

    const record = feed.get(def.endpointId) ?? null;
    const verifiedUntilMs = Date.parse(def.componentsVerifiedUntil);

    if (fetchFailed.has(def.endpointId)) {
      // We don't know this endpoint's price — leave the existing snapshot
      // to expire naturally, but say so immediately: an operator who sees
      // "still valid for 3h 42m" has a window to react before the route
      // starts serving pricing_unavailable.
      const remainingMs = latest
        ? Date.parse(latest.expires_at) - now.getTime()
        : 0;
      await raiseAlert(
        client,
        "warning",
        "pricing_refresh_failed",
        `Fal pricing fetch failed for ${def.endpointId}; ${
          remainingMs > 0
            ? `current snapshot remains valid for ${formatRemaining(remainingMs)}`
            : "no valid snapshot remains — route will fail closed"
        }`,
        {
          endpoint_id: def.endpointId,
          snapshot_expires_at: latest?.expires_at ?? null,
        },
        raised
      );
      report.alertsRaised.push(`${def.endpointId}:refresh_failed`);
      continue;
    } else if (!record) {
      reason = "missing_from_feed";
    } else if (
      record.unitPrice == null ||
      record.unitPrice <= 0 ||
      record.unit == null ||
      record.currency !== "USD"
    ) {
      reason = "malformed_feed_record";
    } else if (record.unit !== def.feedUnit) {
      // Fal changed the billed unit under this endpoint — the shape changed,
      // so our interpretation is unsafe until re-verified.
      reason = "feed_unit_changed";
    } else if (verifiedUntilMs <= now.getTime()) {
      // Docs-verified components (tier ratios, surcharges, flatness claims)
      // are past their review date — a fresh base price can't freshen them.
      reason = "definition_verification_expired";
    }

    if (reason) {
      payload = unsupportedPayload(reason, record);
      expiresAt = now.getTime() + ttlMs;
      report.unsupported.push({ endpointId: def.endpointId, reason });
      await raiseAlert(
        client,
        "warning",
        reason === "definition_verification_expired"
          ? "pricing_definition_stale"
          : reason === "missing_from_feed"
            ? "pricing_feed_missing"
            : reason === "feed_unit_changed"
              ? "pricing_feed_unit_changed"
              : "pricing_feed_malformed",
        `fal endpoint ${def.endpointId} cannot produce a quotable snapshot: ${reason}`,
        { endpoint_id: def.endpointId, reason, record },
        raised
      );
      report.alertsRaised.push(`${def.endpointId}:${reason}`);
    } else {
      payload = buildVerifiedPayload(def, record!, nowIso);
      // A snapshot never outlives either the snapshot TTL or the
      // verification deadline of its static components.
      expiresAt = Math.min(now.getTime() + ttlMs, verifiedUntilMs);
    }

    const hash = snapshotContentHash(def.endpointId, def, payload);
    const unchanged =
      latest?.content_hash === hash &&
      Date.parse(latest.expires_at) > now.getTime() + ttlMs * RENEWAL_FRACTION;
    if (unchanged) {
      report.unchanged++;
      continue;
    }

    const { error } = await client.from("provider_pricing_snapshots").insert({
      provider: "fal",
      endpoint_id: def.endpointId,
      fetched_at: nowIso,
      expires_at: new Date(expiresAt).toISOString(),
      payload,
      content_hash: hash,
      source: SNAPSHOT_SOURCE,
    });
    if (error) {
      // Silent persistence failure is the dangerous case: Fal may have
      // reported a NEW price while the old snapshot still reads "fresh" —
      // the route would keep quoting stale numbers with no signal. Alert
      // always; make it fatal when the lost row carried changed content.
      const contentChanged = latest?.content_hash !== hash;
      if (contentChanged) {
        changedWriteFailures.push(def.endpointId);
      } else {
        report.renewalWriteFailures.push(def.endpointId);
      }
      await raiseAlert(
        client,
        contentChanged ? "critical" : "warning",
        "pricing_snapshot_write_failed",
        contentChanged
          ? `Fal reported updated pricing for ${def.endpointId} but the new snapshot could not be persisted — the route keeps quoting the previous snapshot until it expires: ${error.message}`
          : `Failed to renew the unchanged pricing snapshot for ${def.endpointId}: ${error.message}`,
        {
          endpoint_id: def.endpointId,
          reason,
          content_changed: contentChanged,
          error: error.message,
        },
        raised
      );
      report.alertsRaised.push(`${def.endpointId}:snapshot_write_failed`);
      continue;
    }
    report.snapshotsWritten++;
    if (latest?.content_hash === hash) report.renewed++;
  }

  // Safety net: every defined endpoint should now have a quotable snapshot
  // with life left. Anything still missing is a route that will serve
  // pricing_unavailable — make it loud.
  for (const def of definitions) {
    const { data } = await client
      .from("provider_pricing_snapshots")
      .select("expires_at, payload")
      .eq("provider", "fal")
      .eq("endpoint_id", def.endpointId)
      .order("fetched_at", { ascending: false })
      .gt("expires_at", nowIso)
      .limit(1)
      .maybeSingle<{ expires_at: string; payload: SnapshotPayload }>();
    const quotable = data && data.payload?.pricing_type !== "unsupported";
    if (!quotable) {
      await raiseAlert(
        client,
        "warning",
        "pricing_route_unquotable",
        `fal endpoint ${def.endpointId} has no fresh quotable snapshot — new paid quotes will fail closed`,
        { endpoint_id: def.endpointId },
        raised
      );
      report.alertsRaised.push(`${def.endpointId}:unquotable`);
    }
  }

  // Phase 2 — coarse discovery refresh. Best-effort and time-bounded:
  // everything that affects quotability has already been persisted above.
  // Least-recently-seen first so a capped sweep rotates coverage across
  // runs instead of always starving the alphabetical tail.
  const lastSeen = new Map<string, number>();
  for (const r of (coarseRows ?? []) as {
    endpoint_id: string;
    metadata: Record<string, unknown> | null;
  }[]) {
    const seen = Date.parse(
      (r.metadata?.last_seen_at as string | undefined) ?? ""
    );
    lastSeen.set(r.endpoint_id, Number.isFinite(seen) ? seen : 0);
  }
  const coarseOnly = [...endpointSet]
    .filter((e) => !definedIds.has(e))
    .sort(
      (a, b) =>
        (lastSeen.get(a) ?? 0) - (lastSeen.get(b) ?? 0) ||
        a.localeCompare(b)
    );
  const sweepStart = Date.now();
  for (let i = 0; i < coarseOnly.length; i += ENDPOINTS_PER_CALL) {
    if (Date.now() - sweepStart > COARSE_FETCH_BUDGET_MS) {
      report.coarseSkipped = coarseOnly.length - i;
      break;
    }
    await request(coarseOnly.slice(i, i + ENDPOINTS_PER_CALL), 0);
  }

  if (feed.size === 0) {
    await raiseAlert(
      client,
      "critical",
      "fal_pricing_sync_failed",
      "Fal pricing sync fetched zero usable price records — feed is down or returned an unparseable body",
      { endpoints: endpointSet.size },
      raised
    );
    report.alertsRaised.push("fal_pricing_sync_failed");
    throw new PricingSyncFatal("fal pricing feed returned no usable records");
  }
  report.fetchFailedEndpoints = fetchFailed.size;

  await refreshCoarseFeed(client, [...feed.values()], nowIso, report);

  // A run that couldn't persist NEW pricing isn't successful — the feed
  // answered, we knew the price moved, and the stored state stayed stale.
  // Surface it as a 500 after every other endpoint got its chance to write.
  if (changedWriteFailures.length > 0) {
    throw new PricingSyncFatal(
      `failed to persist updated pricing snapshots for: ${changedWriteFailures.join(", ")}`
    );
  }

  return report;
}
