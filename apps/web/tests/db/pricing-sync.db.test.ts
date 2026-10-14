import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";
import { quoteFal } from "../../lib/pricing/adapters/fal";
import { resetPricingPolicyCache } from "../../lib/pricing/policy";
import { runFalPricingSync } from "../../lib/pricing/sync/fal";
import { getPricingRouteStatus } from "../../lib/db/pricing-status";
import { withDb } from "./helpers/db";
import type { FalPricingDefinition } from "../../lib/pricing/definitions/fal";

/**
 * Real-schema coverage for pricing sync (#104): the unit suite proves the
 * logic; this file proves the supabase-js queries are valid against the
 * migrated schema — column names, payload shape, and RLS-under-service-role
 * behavior that an in-memory fake client can't catch.
 *
 * Requires the FULL local stack (`supabase start`, not just `db start`) —
 * the service talks to PostgREST at the API URL while assertions read rows
 * directly through pg.
 */

// The Supabase local stack signs this demo service_role JWT with the fixed
// local secret — identical on every install; CI exports it explicitly via
// `supabase status -o env`.
const TEST_API_URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const TEST_SERVICE_KEY =
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const FAR_FUTURE = "2027-06-01T00:00:00Z";

// Test-only endpoints, unique per run: snapshot history is immutable, so a
// warm local DB keeps rows from earlier runs and dedupe would (correctly)
// skip re-writing them — unique ids keep every run's assertions exact.
const RUN = Math.random().toString(36).slice(2, 8);
const DB_FLAT: FalPricingDefinition = {
  endpointId: `fal-ai/db-test-flat-${RUN}/edit`,
  definitionVersion: 1,
  pricingType: "flat_per_request",
  feedUnit: "images",
  componentsVerifiedUntil: FAR_FUTURE,
};
const DB_TIERED: FalPricingDefinition = {
  endpointId: `fal-ai/db-test-tiered-${RUN}/edit`,
  definitionVersion: 1,
  pricingType: "resolution_tier",
  feedUnit: "images",
  baseTier: "1K",
  tierMap: "fal_resolution",
  tierMultipliers: { "1K": 1, "2K": 1.5, "4K": 2 },
  modifiers: { enable_web_search: { true: 0.015 } },
  componentsVerifiedUntil: FAR_FUTURE,
};

function serviceClient(): SupabaseClient {
  return createClient(TEST_API_URL, TEST_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function stubFetch(priceByEndpoint: Record<string, number>) {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const wanted = new Set(url.searchParams.getAll("endpoint_id"));
    const prices = [...wanted]
      .filter((id) => priceByEndpoint[id] !== undefined)
      .map((id) => ({
        endpoint_id: id,
        unit_price: priceByEndpoint[id],
        unit: "images",
      }));
    return { ok: true, json: async () => ({ prices }) } as Response;
  }) as typeof fetch;
}

const FEED = stubFetch({
  [DB_FLAT.endpointId]: 0.0398,
  [DB_TIERED.endpointId]: 0.08,
});

// Sync at real-now: getPricingRouteStatus compares expires_at against
// Date.now(), so a fixed past timestamp would read as stale.
function sync(client: SupabaseClient, extra: Record<string, unknown> = {}) {
  return runFalPricingSync(client, {
    fetchImpl: FEED,
    now: new Date(),
    key: "test-key",
    definitions: [DB_FLAT, DB_TIERED],
    ...extra,
  });
}

describe("pricing sync against real schema", () => {
  beforeEach(() => {
    resetPricingPolicyCache();
  });

  it("writes snapshots PostgREST can read back — and they quote", async () => {
    const client = serviceClient();
    const report = await sync(client);
    expect(report.snapshotsWritten).toBe(2);

    const { data, error } = await client
      .from("provider_pricing_snapshots")
      .select("endpoint_id, expires_at, payload, content_hash, source")
      .in("endpoint_id", [DB_FLAT.endpointId, DB_TIERED.endpointId])
      .order("fetched_at", { ascending: false });
    expect(error).toBeNull();
    // Rows are immutable history — a warm local DB may hold expired rows
    // from earlier runs. Assert against the newest row per endpoint.
    const latest = new Map(data!.map((r) => [r.endpoint_id, r]));
    expect([...latest.keys()].sort()).toEqual(
      [DB_FLAT.endpointId, DB_TIERED.endpointId].sort()
    );

    const tiered = latest.get(DB_TIERED.endpointId)!;
    expect(tiered.content_hash).toBeTruthy();
    expect(tiered.source).toBe("pricing-sync");
    expect(tiered.payload.pricing_type).toBe("resolution_tier");
    expect(tiered.payload.tiers).toEqual({
      "1K": 0.08,
      "2K": 0.12,
      "4K": 0.16,
    });
    // The written payload must actually quote through the production adapter.
    const quote = quoteFal(
      tiered.payload,
      { width: 1024, height: 1024 },
      { quoteMaxSlackFactor: 1.5 }
    );
    expect(quote.kind).toBe("bounded");
  });

  it("dedupes an identical second run against real rows", async () => {
    const client = serviceClient();
    await sync(client);
    const later = new Date(Date.now() + 60 * 60 * 1000);
    const second = await sync(client, { now: later });
    expect(second.snapshotsWritten).toBe(0);
    expect(second.unchanged).toBe(2);
  });

  it("expired component verification → unsupported snapshot + real alert row", async () => {
    const client = serviceClient();
    const staleDef: FalPricingDefinition = {
      ...DB_TIERED,
      endpointId: `fal-ai/db-test-stale-${RUN}/edit`,
      componentsVerifiedUntil: "2026-10-01T00:00:00Z",
    };
    await runFalPricingSync(client, {
      fetchImpl: stubFetch({ [staleDef.endpointId]: 0.08 }),
      now: new Date(),
      key: "test-key",
      definitions: [staleDef],
    });
    const { data: snaps } = await client
      .from("provider_pricing_snapshots")
      .select("payload")
      .eq("endpoint_id", staleDef.endpointId)
      .order("fetched_at", { ascending: false })
      .limit(1);
    expect(snaps![0]!.payload.pricing_type).toBe("unsupported");
    const { data: alerts } = await client
      .from("admin_alerts")
      .select("rule, severity, details")
      .eq("rule", "pricing_definition_stale");
    expect(
      (alerts ?? []).some((a) => a.details?.endpoint_id === staleDef.endpointId)
    ).toBe(true);
  });

  it("never unsuspends a route — endpoint_state untouched by sync", async () => {
    const client = serviceClient();
    const suspended: FalPricingDefinition = {
      ...DB_FLAT,
      endpointId: `fal-ai/db-test-suspended-${RUN}/edit`,
    };
    await withDb(async (pg) => {
      await pg.query(
        `INSERT INTO public.provider_endpoint_state
           (provider, endpoint_id, status, suspend_reason, suspended_at)
         VALUES ('fal', $1, 'suspended', 'billing_overrun', NOW())
         ON CONFLICT (provider, endpoint_id) DO UPDATE
           SET status = 'suspended', suspend_reason = 'billing_overrun'`,
        [suspended.endpointId]
      );
    });
    await runFalPricingSync(client, {
      fetchImpl: stubFetch({ [suspended.endpointId]: 0.05 }),
      now: new Date(),
      key: "test-key",
      definitions: [suspended],
    });
    await withDb(async (pg) => {
      const { rows } = await pg.query(
        `SELECT status, suspend_reason FROM public.provider_endpoint_state
         WHERE provider = 'fal' AND endpoint_id = $1`,
        [suspended.endpointId]
      );
      expect(rows[0]).toMatchObject({
        status: "suspended",
        suspend_reason: "billing_overrun",
      });
    });
  });

  it("admin status view returns real merged state", async () => {
    const client = serviceClient();
    await sync(client);
    const rows = await getPricingRouteStatus(client);
    // Warm DBs carry earlier runs' rows too — scope to this run's ids.
    const ours = rows.filter((r) => r.endpointId.endsWith(`-${RUN}/edit`));
    expect(ours.length).toBeGreaterThanOrEqual(2);
    const tiered = ours.find((r) => r.endpointId === DB_TIERED.endpointId)!;
    expect(tiered.quotable).toBe(true);
    expect(tiered.stale).toBe(false);
    expect(tiered.snapshotSource).toBe("pricing-sync");
    const suspended = ours.find(
      (r) => r.endpointId === `fal-ai/db-test-suspended-${RUN}/edit`
    );
    expect(suspended?.endpointState).toBe("suspended");
  });
});
