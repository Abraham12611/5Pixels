import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "../../billing/__tests__/helpers/fake-service-client";
import { resetPricingPolicyCache } from "../policy";
import {
  parsePricingFeed,
  PricingSyncFatal,
  runFalPricingSync,
} from "../sync/fal";
import type { FalPricingDefinition } from "../definitions/fal";

const NOW = new Date("2026-10-12T12:00:00Z");
const FAR_FUTURE = "2027-06-01T00:00:00Z";
const PAST = "2026-10-01T00:00:00Z";

const FLAT: FalPricingDefinition = {
  endpointId: "fal-ai/nano-banana/edit",
  definitionVersion: 1,
  pricingType: "flat_per_request",
  feedUnit: "images",
  componentsVerifiedUntil: FAR_FUTURE,
};

const TIERED: FalPricingDefinition = {
  endpointId: "fal-ai/nano-banana-2/edit",
  definitionVersion: 1,
  pricingType: "resolution_tier",
  feedUnit: "images",
  baseTier: "1K",
  tierMap: "fal_resolution",
  tierMultipliers: { "1K": 1, "2K": 1.5, "4K": 2 },
  modifiers: { enable_web_search: { true: 0.015 } },
  componentsVerifiedUntil: FAR_FUTURE,
};

function priceRow(endpointId: string, unitPrice: unknown, unit = "images") {
  return { endpoint_id: endpointId, unit_price: unitPrice, unit };
}

/** Pricing feed that answers each batch URL by its endpoint_id params. */
function feedFetch(records: Record<string, unknown>[]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const wanted = new Set(url.searchParams.getAll("endpoint_id"));
    return {
      ok: true,
      json: async () => ({
        prices: records.filter((r) =>
          wanted.has((r as { endpoint_id: string }).endpoint_id)
        ),
      }),
    } as Response;
  }) as unknown as typeof fetch;
}

function makeClient() {
  const client = new FakeServiceClient();
  client.seed("pricing_policies", [
    {
      id: "pol-2",
      version: 2,
      is_active: true,
      credit_capacity_usd: 0.01,
      top_up_budget_ratio: 0.5,
      quote_max_slack_factor: 1.5,
      quote_ttl_seconds: 600,
      snapshot_ttl_hours: 6,
    },
  ]);
  client.seed("provider_pricing_snapshots", []);
  client.seed("provider_model_pricing", []);
  client.seed("admin_alerts", []);
  client.seed("provider_endpoint_state", []);
  return client;
}

/**
 * Makes provider_pricing_snapshots inserts fail for rows matching
 * `failFor` — wraps the FakeQuery's `insert` so it resolves with a
 * supabase-js-style `{ error }` instead of writing.
 */
function failSnapshotInserts(
  client: FakeServiceClient,
  failFor: (row: Record<string, unknown>) => boolean
) {
  const origFrom = client.from.bind(client);
  client.from = ((table: string) => {
    const q = origFrom(table) as {
      insert: (rows: unknown) => unknown;
      [k: string]: unknown;
    };
    if (table !== "provider_pricing_snapshots") return q;
    const origInsert = q.insert.bind(q);
    q.insert = (rows: unknown) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      if ((arr as Record<string, unknown>[]).some(failFor)) {
        return Promise.resolve({
          data: null,
          error: { message: "permission denied for table snapshots" },
        });
      }
      return origInsert(rows);
    };
    return q;
  }) as FakeServiceClient["from"];
  return client;
}

function snapshots(client: FakeServiceClient) {
  return client.table("provider_pricing_snapshots");
}

function alerts(client: FakeServiceClient) {
  return client.table("admin_alerts");
}

const deps = (fetchImpl: typeof fetch, extra = {}) => ({
  fetchImpl,
  now: NOW,
  key: "test-key",
  definitions: [FLAT, TIERED],
  sleepImpl: () => Promise.resolve(),
  ...extra,
});

beforeEach(() => {
  resetPricingPolicyCache();
});

describe("parsePricingFeed", () => {
  it("parses records and drops unkeyable rows", () => {
    const out = parsePricingFeed({
      prices: [
        priceRow("fal-ai/a", 0.08),
        { unit_price: 0.1 }, // no endpoint_id
        "garbage",
        priceRow("fal-ai/b", "0.0398"),
      ],
    });
    expect(out.map((r) => r.endpointId)).toEqual(["fal-ai/a", "fal-ai/b"]);
    expect(out[0]).toMatchObject({ unitPrice: 0.08, unit: "images" });
    expect(out[1]!.unitPrice).toBeCloseTo(0.0398);
  });

  it("keeps malformed prices as records (malformed ≠ missing)", () => {
    const out = parsePricingFeed({
      prices: [priceRow("fal-ai/x", "not-a-number")],
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.unitPrice).toBeNull();
  });

  it("returns [] for non-array payloads", () => {
    expect(parsePricingFeed(null)).toEqual([]);
    expect(parsePricingFeed({ prices: "nope" })).toEqual([]);
  });
});

describe("runFalPricingSync", () => {
  it("writes fresh immutable snapshots from feed + definition", async () => {
    const client = makeClient();
    const report = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );

    expect(report.snapshotsWritten).toBe(2);
    const rows = snapshots(client);
    const flat = rows.find((r) => r.endpoint_id === FLAT.endpointId)!;
    expect(flat.payload.pricing_type).toBe("flat_per_request");
    expect(flat.payload.unit_price).toBe(0.0398);
    expect(flat.source).toBe("pricing-sync");
    expect(flat.content_hash).toBeTruthy();

    const tiered = rows.find((r) => r.endpoint_id === TIERED.endpointId)!;
    expect(tiered.payload.pricing_type).toBe("resolution_tier");
    // Tiers derived: absolute USD = feed base × verified multiplier.
    expect(tiered.payload.tiers).toEqual({
      "1K": 0.08,
      "2K": 0.12,
      "4K": 0.16,
    });
    expect(tiered.payload.modifiers).toEqual({
      enable_web_search: { true: 0.015 },
    });
    expect(tiered.payload.provenance.definition_version).toBe(1);
    expect(tiered.payload.provenance.components.unit_price.source).toBe(
      "fal_pricing_api"
    );
    // Expiry bounded by TTL (6h), inside verifiedUntil.
    expect(Date.parse(tiered.expires_at)).toBe(
      NOW.getTime() + 6 * 60 * 60 * 1000
    );
  });

  it("skips an identical in-window refresh (content-hash dedupe)", async () => {
    const client = makeClient();
    const first = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );
    expect(first.snapshotsWritten).toBe(2);

    const later = new Date(NOW.getTime() + 60 * 60 * 1000);
    const second = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ]),
        { now: later }
      )
    );
    expect(second.snapshotsWritten).toBe(0);
    expect(second.unchanged).toBe(2);
    expect(snapshots(client)).toHaveLength(2);
  });

  it("renews an unchanged snapshot inside the renewal window", async () => {
    const client = makeClient();
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );

    // 4h later: 2h of TTL left < 3h renewal window → refreshed copies.
    const later = new Date(NOW.getTime() + 4 * 60 * 60 * 1000);
    const report = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ]),
        { now: later }
      )
    );
    expect(report.renewed).toBe(2);
    expect(snapshots(client)).toHaveLength(4);
  });

  it("writes a new snapshot when the feed price changes", async () => {
    const client = makeClient();
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );
    const later = new Date(NOW.getTime() + 60 * 60 * 1000);
    const report = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.045),
          priceRow(TIERED.endpointId, 0.08),
        ]),
        { now: later }
      )
    );
    expect(report.snapshotsWritten).toBe(1);
    const rows = snapshots(client).filter(
      (r) => r.endpoint_id === FLAT.endpointId
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]!.payload.unit_price).toBe(0.045);
    expect(rows[1]!.content_hash).not.toBe(rows[0]!.content_hash);
  });

  it("definition version bump produces a new snapshot at unchanged price", async () => {
    const client = makeClient();
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );
    const bumped = { ...FLAT, definitionVersion: 2 };
    const later = new Date(NOW.getTime() + 60 * 60 * 1000);
    const report = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ]),
        {
          now: later,
          definitions: [bumped, TIERED],
        }
      )
    );
    expect(report.snapshotsWritten).toBe(1);
    const rows = snapshots(client).filter(
      (r) => r.endpoint_id === FLAT.endpointId
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]!.payload.provenance.definition_version).toBe(2);
  });

  it("fails closed + alerts when an endpoint is missing from the feed", async () => {
    const client = makeClient();
    const report = await runFalPricingSync(
      client as never,
      deps(feedFetch([priceRow(TIERED.endpointId, 0.08)]))
    );
    const flat = snapshots(client).find(
      (r) => r.endpoint_id === FLAT.endpointId
    )!;
    expect(flat.payload.pricing_type).toBe("unsupported");
    expect(flat.payload.unsupported_reason).toBe("missing_from_feed");
    expect(report.unsupported).toEqual([
      { endpointId: FLAT.endpointId, reason: "missing_from_feed" },
    ]);
    expect(
      alerts(client).some(
        (a) =>
          a.rule === "pricing_feed_missing" &&
          a.details.endpoint_id === FLAT.endpointId
      )
    ).toBe(true);
    expect(
      alerts(client).some((a) => a.rule === "pricing_route_unquotable")
    ).toBe(true);
  });

  it("fails closed on malformed feed records (bad unit / price)", async () => {
    const client = makeClient();
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398, "megapixels"), // unit changed
          priceRow(TIERED.endpointId, "not-a-price"), // unparseable
        ])
      )
    );
    const rows = snapshots(client);
    expect(
      rows.find((r) => r.endpoint_id === FLAT.endpointId)!.payload
        .unsupported_reason
    ).toBe("feed_unit_changed");
    expect(
      rows.find((r) => r.endpoint_id === TIERED.endpointId)!.payload
        .unsupported_reason
    ).toBe("malformed_feed_record");
    expect(
      alerts(client).some((a) => a.rule === "pricing_feed_unit_changed")
    ).toBe(true);
    expect(
      alerts(client).some((a) => a.rule === "pricing_feed_malformed")
    ).toBe(true);
  });

  it("fails closed when docs-verified components are past their review date", async () => {
    const client = makeClient();
    const staleDef = { ...TIERED, componentsVerifiedUntil: PAST };
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ]),
        {
          definitions: [FLAT, staleDef],
        }
      )
    );
    const row = snapshots(client).find(
      (r) => r.endpoint_id === TIERED.endpointId
    )!;
    // Fresh base price cannot freshen expired tiers/modifiers.
    expect(row.payload.pricing_type).toBe("unsupported");
    expect(row.payload.unsupported_reason).toBe(
      "definition_verification_expired"
    );
    expect(
      alerts(client).some((a) => a.rule === "pricing_definition_stale")
    ).toBe(true);
  });

  it("bounds snapshot expiry by the component verification deadline", async () => {
    const client = makeClient();
    const soon = new Date(NOW.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const shortDef = { ...FLAT, componentsVerifiedUntil: soon };
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ]),
        {
          definitions: [shortDef],
        }
      )
    );
    const row = snapshots(client).find(
      (r) => r.endpoint_id === FLAT.endpointId
    )!;
    expect(Date.parse(row.expires_at)).toBe(Date.parse(soon));
  });

  it("throws + critical alert when the provider fetch fails entirely", async () => {
    const client = makeClient();
    const failing = vi.fn(async () => ({ ok: false, status: 503 })) as never;
    await expect(
      runFalPricingSync(client as never, deps(failing))
    ).rejects.toBeInstanceOf(PricingSyncFatal);
    expect(snapshots(client)).toHaveLength(0);
    expect(
      alerts(client).some(
        (a) => a.rule === "fal_pricing_sync_failed" && a.severity === "critical"
      )
    ).toBe(true);
  });

  it("throws + critical alert when FAL key is missing", async () => {
    const client = makeClient();
    const prev = process.env.FAL_KEY;
    delete process.env.FAL_KEY;
    try {
      await expect(
        runFalPricingSync(client as never, {
          now: NOW,
          definitions: [FLAT],
          fetchImpl: vi.fn() as never,
        })
      ).rejects.toBeInstanceOf(PricingSyncFatal);
    } finally {
      if (prev !== undefined) process.env.FAL_KEY = prev;
    }
    expect(
      alerts(client).some((a) => a.rule === "fal_pricing_sync_failed")
    ).toBe(true);
  });

  it("never touches provider_endpoint_state — suspension survives sync", async () => {
    const client = makeClient();
    client.seed("provider_endpoint_state", [
      {
        endpoint_id: FLAT.endpointId,
        status: "suspended",
        suspend_reason: "billing_overrun",
      },
    ]);
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );
    const state = client.table("provider_endpoint_state")[0]!;
    expect(state.status).toBe("suspended");
    expect(state.suspend_reason).toBe("billing_overrun");
    // Snapshots still refresh — suspension is enforced at quote time.
    expect(snapshots(client)).toHaveLength(2);
  });

  it("refreshes the coarse feed: change → close+insert, same → last_seen", async () => {
    const client = makeClient();
    client.seed("provider_model_pricing", [
      {
        id: "pm-1",
        provider: "fal",
        endpoint_id: FLAT.endpointId,
        unit_price: 0.0398,
        unit: "images",
        currency: "USD",
        is_active: true,
        metadata: {},
      },
    ]);
    const report = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.045),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );
    expect(report.coarseRowsWritten).toBe(2); // FLAT re-priced + TIERED new
    const coarse = client
      .table("provider_model_pricing")
      .filter((r) => r.endpoint_id === FLAT.endpointId);
    expect(coarse).toHaveLength(2);
    const closed = coarse.find((r) => r.is_active === false)!;
    const open = coarse.find((r) => r.is_active === true)!;
    expect(closed.effective_to).toBe(NOW.toISOString());
    expect(open.unit_price).toBe(0.045);
    expect(open.metadata.last_seen_at).toBe(NOW.toISOString());
  });

  it("skips a defined endpoint whose solo fetch failed without stamping state", async () => {
    const client = makeClient();
    // >50 endpoints force multiple coarse batches; the defined endpoints
    // ride their own dedicated request — a solo failure on FLAT must not
    // touch TIERED or the coarse sweep.
    client.seed(
      "provider_model_pricing",
      Array.from({ length: 60 }, (_, i) => ({
        id: `pm-${i}`,
        provider: "fal",
        endpoint_id: `fal-ai/coarse-${String(i).padStart(2, "0")}`,
        unit_price: 0.01,
        unit: "images",
        currency: "USD",
        is_active: true,
        metadata: {},
      }))
    );
    const failDefsBatch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const wanted = new Set(url.searchParams.getAll("endpoint_id"));
      if (wanted.has(FLAT.endpointId)) {
        return { ok: false, status: 500 } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          prices: [...wanted].map((id) => priceRow(id, 0.01)),
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const report = await runFalPricingSync(
      client as never,
      deps(failDefsBatch)
    );
    // Only the failing id is skipped — the bisect isolated it; TIERED's
    // probe succeeded and produced a snapshot.
    expect(snapshots(client)).toHaveLength(1);
    expect(snapshots(client)[0]!.endpoint_id).toBe(TIERED.endpointId);
    expect(report.fetchFailedEndpoints).toBe(1);
    // 60 coarse ids + TIERED's solo probe.
    expect(report.feedRecords).toBe(61);
    // …and the failed defined endpoint raised an immediate refresh alert
    // rather than going quiet until the previous snapshot expires.
    const refreshAlerts = alerts(client).filter(
      (a) => a.rule === "pricing_refresh_failed"
    );
    expect(refreshAlerts).toHaveLength(1);
    expect(refreshAlerts[0]!.details.endpoint_id).toBe(FLAT.endpointId);
    expect(refreshAlerts[0]!.severity).toBe("warning");
  });

  it("keeps defined endpoints quotable when the coarse sweep fails", async () => {
    const client = makeClient();
    // The regression that starved every route: the coarse batches fail
    // (429/404/5xx — all exercised identically here) while the dedicated
    // defined-endpoint request still succeeds.
    client.seed(
      "provider_model_pricing",
      Array.from({ length: 60 }, (_, i) => ({
        id: `pm-${i}`,
        provider: "fal",
        endpoint_id: `fal-ai/coarse-${String(i).padStart(2, "0")}`,
        unit_price: 0.01,
        unit: "images",
        currency: "USD",
        is_active: true,
        metadata: {},
      }))
    );
    const coarseDown = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const wanted = new Set(url.searchParams.getAll("endpoint_id"));
      if ([...wanted].some((id) => id.includes("coarse-"))) {
        return { ok: false, status: 429 } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          prices: [...wanted].map((id) => priceRow(id, 0.01)),
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const report = await runFalPricingSync(
      client as never,
      deps(coarseDown)
    );
    // Both defined endpoints still got fresh quotable snapshots.
    expect(snapshots(client)).toHaveLength(2);
    expect(report.unsupported).toEqual([]);
    expect(
      alerts(client).filter((a) => a.rule === "pricing_route_unquotable")
    ).toHaveLength(0);
  });

  it("isolates a delisted endpoint's 404 instead of failing its batch", async () => {
    const client = makeClient();
    // One dead coarse id returns 404 for the whole request — the bisect
    // must isolate it so the other 49 ids still refresh, then deactivate
    // the dead row so it stops poisoning future runs.
    client.seed(
      "provider_model_pricing",
      [
        {
          id: "pm-dead",
          provider: "fal",
          endpoint_id: "fal-ai/chain-of-zoom",
          unit_price: 0.025,
          unit: "images",
          currency: "USD",
          is_active: true,
          metadata: {},
        },
        {
          id: "pm-live",
          provider: "fal",
          endpoint_id: "fal-ai/live-model",
          unit_price: 0.01,
          unit: "images",
          currency: "USD",
          is_active: true,
          metadata: {},
        },
      ]
    );
    const poisoned = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const wanted = new Set(url.searchParams.getAll("endpoint_id"));
      if (wanted.has("fal-ai/chain-of-zoom")) {
        return { ok: false, status: 404 } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          prices: [...wanted].map((id) => priceRow(id, 0.01)),
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const report = await runFalPricingSync(client as never, deps(poisoned));

    const deadRow = client
      .table("provider_model_pricing")
      .find((r) => r.endpoint_id === "fal-ai/chain-of-zoom")!;
    expect(deadRow.is_active).toBe(false);
    expect(report.deactivated).toEqual(["fal-ai/chain-of-zoom"]);
    // The healthy neighbour still refreshed its discovery row.
    const live = client
      .table("provider_model_pricing")
      .find((r) => r.endpoint_id === "fal-ai/live-model")!;
    expect(live.metadata.last_seen_at).toBe(NOW.toISOString());
  });

  it("retries a 429 batch after backoff instead of failing its ids", async () => {
    const client = makeClient();
    let calls = 0;
    const throttled = vi.fn(async (input: RequestInfo | URL) => {
      calls++;
      if (calls === 1) {
        return {
          ok: false,
          status: 429,
          headers: { get: () => "1" },
        } as unknown as Response;
      }
      const url = new URL(String(input));
      const wanted = new Set(url.searchParams.getAll("endpoint_id"));
      return {
        ok: true,
        json: async () => ({
          prices: [...wanted].map((id) => priceRow(id, 0.01)),
        }),
      } as Response;
    }) as unknown as typeof fetch;

    const slept: number[] = [];
    const report = await runFalPricingSync(
      client as never,
      deps(throttled, { sleepImpl: (ms: number) => { slept.push(ms); return Promise.resolve(); } })
    );

    expect(calls).toBe(2);
    expect(slept).toContain(1000); // Retry-After: 1s honored
    expect(report.feedRecords).toBe(2);
    expect(snapshots(client)).toHaveLength(2);
  });

  it("changed-content insert failure is critical + fails the run", async () => {
    const client = makeClient();
    // First run succeeds — an $0.08 snapshot exists.
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );
    // Fal moves to $0.10 for FLAT but its insert fails — the stale $0.08
    // row is still "fresh", so without a loud failure the route would keep
    // quoting the old price unnoticed.
    failSnapshotInserts(client, (r) => r.endpoint_id === FLAT.endpointId);
    const later = new Date(NOW.getTime() + 60 * 60 * 1000);
    await expect(
      runFalPricingSync(
        client as never,
        deps(
          feedFetch([
            priceRow(FLAT.endpointId, 0.045),
            priceRow(TIERED.endpointId, 0.08),
          ]),
          { now: later }
        )
      )
    ).rejects.toBeInstanceOf(PricingSyncFatal);
    const writeAlerts = alerts(client).filter(
      (a) => a.rule === "pricing_snapshot_write_failed"
    );
    expect(writeAlerts).toHaveLength(1);
    expect(writeAlerts[0]!.severity).toBe("critical");
    expect(writeAlerts[0]!.details.endpoint_id).toBe(FLAT.endpointId);
    expect(writeAlerts[0]!.details.content_changed).toBe(true);
    // The unchanged TIERED snapshot still deduped normally.
    expect(
      snapshots(client).filter((r) => r.endpoint_id === TIERED.endpointId)
    ).toHaveLength(1);
  });

  it("identical-content insert failure alerts as warning but stays 200", async () => {
    const client = makeClient();
    await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ])
      )
    );
    // 4h later: same price, inside the renewal window — the write is a
    // refresh copy, not new information. Failure is noisy but not fatal:
    // the existing snapshot remains valid for ~2h more.
    failSnapshotInserts(client, (r) => r.endpoint_id === FLAT.endpointId);
    const later = new Date(NOW.getTime() + 4 * 60 * 60 * 1000);
    const report = await runFalPricingSync(
      client as never,
      deps(
        feedFetch([
          priceRow(FLAT.endpointId, 0.0398),
          priceRow(TIERED.endpointId, 0.08),
        ]),
        { now: later }
      )
    );
    expect(report.renewalWriteFailures).toEqual([FLAT.endpointId]);
    const writeAlerts = alerts(client).filter(
      (a) => a.rule === "pricing_snapshot_write_failed"
    );
    expect(writeAlerts).toHaveLength(1);
    expect(writeAlerts[0]!.severity).toBe("warning");
    expect(writeAlerts[0]!.details.content_changed).toBe(false);
  });
});
