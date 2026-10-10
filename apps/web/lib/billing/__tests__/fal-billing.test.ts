import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "./helpers/fake-service-client";
import {
  buildBillingEventsUrl,
  parseBillingEvents,
  runBillingReconciliation,
} from "../fal-billing";

const OLD = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago

function completedGen(id: string, requestId: string | null, extra = {}) {
  return {
    id,
    provider_request_id: requestId,
    provider_endpoint: "fal-ai/nano-banana-2/edit",
    status: "completed",
    completed_at: OLD,
    billing_reconciled_at: null,
    ...extra,
  };
}

function eventFor(requestId: string, costTotal = 0.08) {
  return {
    request_id: requestId,
    endpoint_id: "fal-ai/nano-banana-2/edit",
    timestamp: OLD,
    output_units: 1,
    unit: "image",
    unit_price: 0.08,
    percent_discount: null,
    cost_subtotal: 0.08,
    cost_discount: 0,
    cost_total: costTotal,
  };
}

function stubFetch(events: unknown[]) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ billing_events: events }),
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.FAL_KEY = "test-key";
  delete process.env.FAL_BILLING_KEY;
});

describe("buildBillingEventsUrl", () => {
  it("joins request_ids as CSV and carries start + limit", () => {
    const url = buildBillingEventsUrl(["r1", "r2"], "2026-01-01T00:00:00Z");
    expect(url).toContain("request_id=r1%2Cr2");
    expect(url).toContain("start=2026-01-01T00%3A00%3A00Z");
    expect(url).toContain("limit=50");
  });
});

describe("parseBillingEvents", () => {
  it("parses the documented response shape", () => {
    const events = parseBillingEvents({
      billing_events: [eventFor("r1", 0.045)],
      next_cursor: "x",
      has_more: false,
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.cost_total).toBe(0.045);
    expect(events[0]!.request_id).toBe("r1");
  });

  it("drops events without a request_id or a valid cost_total", () => {
    const events = parseBillingEvents({
      billing_events: [
        { endpoint_id: "x", cost_total: 1 }, // no request_id
        eventFor("r2", -5), // negative cost
        { request_id: "r3", cost_total: "not-a-number" },
        "garbage",
        eventFor("r4", 0.02),
      ],
    });
    expect(events.map((e) => e.request_id)).toEqual(["r4"]);
  });

  it("returns [] on non-array payloads", () => {
    expect(parseBillingEvents(null)).toEqual([]);
    expect(parseBillingEvents({ billing_events: "nope" })).toEqual([]);
  });
});

describe("runBillingReconciliation", () => {
  it("reconciles events through the RPC and summarizes outcomes", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [
      completedGen("g1", "req-1"),
      completedGen("g2", "req-2"),
      completedGen("g3", "req-3"), // fal hasn't billed this one yet
    ]);

    const rpcCalls: Record<string, unknown>[] = [];
    fake.rpcHandlers.set("reconcile_billing_event", (args) => {
      rpcCalls.push(args);
      return args.p_request_id === "req-1" ? "settled" : "overrun_absorbed";
    });

    const fetchImpl = stubFetch([eventFor("req-1", 0.08), eventFor("req-2", 0.5)]);
    const summary = await runBillingReconciliation(fake as never, fetchImpl);

    expect(summary.scanned).toBe(3);
    expect(summary.eventsFetched).toBe(2);
    expect(summary.settled).toBe(1);
    expect(summary.overrunsAbsorbed).toBe(1);
    expect(summary.pendingBilling).toBe(1);
    expect(rpcCalls).toHaveLength(2);
    expect(rpcCalls[0]!.p_cost_total).toBe(0.08);
    expect(rpcCalls[0]!.p_provider).toBe("fal");
  });

  it("skips generations already reconciled, still running, or too fresh", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [
      completedGen("g-done", "req-old", {
        billing_reconciled_at: OLD,
      }),
      { ...completedGen("g-run", "req-run"), status: "in_progress" },
      {
        ...completedGen("g-new", "req-new"),
        completed_at: new Date().toISOString(), // inside the 30m grace window
      },
    ]);

    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const summary = await runBillingReconciliation(fake as never, fetchImpl);

    expect(summary.scanned).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("counts fetch failures as errors without sinking the batch", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [completedGen("g1", "req-1")]);
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })) as unknown as typeof fetch;

    const summary = await runBillingReconciliation(fake as never, fetchImpl);
    expect(summary.scanned).toBe(1);
    expect(summary.errors).toBe(1);
    expect(summary.settled).toBe(0);
  });

  it("counts unmatched + duplicate RPC results", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [
      completedGen("g1", "req-1"),
      completedGen("g2", "req-2"),
    ]);
    fake.rpcHandlers.set("reconcile_billing_event", (args) =>
      args.p_request_id === "req-1" ? "unmatched" : "duplicate"
    );

    const summary = await runBillingReconciliation(
      fake as never,
      stubFetch([eventFor("req-1"), eventFor("req-2")])
    );
    expect(summary.unmatched).toBe(1);
    expect(summary.duplicates).toBe(1);
  });

  it("counts RPC errors without sinking the batch", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [completedGen("g1", "req-1")]);
    (fake as { rpc: unknown }).rpc = () =>
      Promise.resolve({ data: null, error: { message: "db down" } });

    const summary = await runBillingReconciliation(
      fake as never,
      stubFetch([eventFor("req-1")])
    );
    expect(summary.errors).toBe(1);
  });
});
