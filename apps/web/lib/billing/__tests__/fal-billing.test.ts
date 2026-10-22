import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeServiceClient } from "./helpers/fake-service-client";
import {
  BillingReconcileFatal,
  buildBillingEventsUrl,
  parseBillingEvents,
  runBillingReconciliation,
} from "../fal-billing";

const OLD = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
const OLDER = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(); // 4h ago

function completedGen(id: string, requestId: string | null, extra = {}) {
  return {
    id,
    provider_request_id: requestId,
    provider_endpoint: "fal-ai/nano-banana-2/edit",
    status: "completed",
    created_at: OLDER,
    completed_at: OLD,
    billing_reconciled_at: null,
    billing_reconcile_state: null,
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
    // Provider fields we don't normalize must survive into `raw`.
    cost_estimate_nano_usd: 45678901,
  };
}

function stubFetch(events: unknown[]) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ billing_events: events }),
  })) as unknown as typeof fetch;
}

function failingFetch(status: number) {
  return vi.fn(async () => ({
    ok: false,
    status,
    text: async () => "boom",
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
    expect(events[0]!.raw).toMatchObject({ cost_estimate_nano_usd: 45678901 });
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
    // Raw event JSON is preserved verbatim for the audit column.
    expect(rpcCalls[0]!.p_raw).toMatchObject({
      request_id: "req-1",
      cost_estimate_nano_usd: 45678901,
    });
  });

  it("anchors the fal start bound before provider execution, not completed_at", async () => {
    const fake = new FakeServiceClient();
    const createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const completedAt = new Date(createdAt.getTime() + 6 * 1000);
    fake.seed("generations", [
      completedGen("g1", "req-1", {
        created_at: createdAt.toISOString(),
        completed_at: completedAt.toISOString(),
      }),
    ]);

    const fetchImpl = stubFetch([eventFor("req-1")]);
    await runBillingReconciliation(fake as never, fetchImpl);

    const calledUrl = (fetchImpl as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as string;
    const start = new URL(calledUrl).searchParams.get("start")!;
    // created_at - 1h safety buffer, guaranteed before fal ran the job.
    expect(start).toBe(
      new Date(createdAt.getTime() - 60 * 60 * 1000).toISOString()
    );
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

  it("fails loudly with a critical alert when every fetch fails", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [completedGen("g1", "req-1")]);

    await expect(
      runBillingReconciliation(fake as never, failingFetch(500))
    ).rejects.toThrow(BillingReconcileFatal);

    const alerts = fake.table("admin_alerts");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      rule: "billing_reconcile_broken",
      severity: "critical",
    });
  });

  it("fails loudly with a critical alert on a 401/403 auth rejection", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [
      completedGen("g1", "req-1"),
      completedGen("g2", "req-2"),
    ]);

    await expect(
      runBillingReconciliation(fake as never, failingFetch(403))
    ).rejects.toThrow(BillingReconcileFatal);

    const alerts = fake.table("admin_alerts");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      rule: "billing_reconcile_broken",
      severity: "critical",
    });
    expect(alerts[0]!.details).toMatchObject({ status: 403 });
  });

  it("fails loudly when no billing key is configured", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [completedGen("g1", "req-1")]);
    delete process.env.FAL_KEY;

    await expect(
      runBillingReconciliation(fake as never, stubFetch([eventFor("req-1")]))
    ).rejects.toThrow(BillingReconcileFatal);

    expect(fake.table("admin_alerts")[0]).toMatchObject({
      rule: "billing_reconcile_broken",
      severity: "critical",
    });
  });

  it("continues on a partial fetch failure and raises a warning alert", async () => {
    const fake = new FakeServiceClient();
    // 51 candidates → 2 request_id batches; first fetch fails, second works.
    const rows = Array.from({ length: 51 }, (_, i) =>
      completedGen(`g${i}`, `req-${i}`, {
        created_at: new Date(
          Date.now() - (4 * 60 + i) * 60 * 1000
        ).toISOString(),
      })
    );
    fake.seed("generations", rows);

    fake.rpcHandlers.set("reconcile_billing_event", () => "settled");

    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return { ok: false, status: 500, text: async () => "boom" };
      }
      return {
        ok: true,
        json: async () => ({ billing_events: [eventFor("req-0")] }),
      };
    }) as unknown as typeof fetch;

    const summary = await runBillingReconciliation(fake as never, fetchImpl);

    expect(summary.scanned).toBe(51);
    expect(summary.errors).toBe(50);
    expect(summary.eventsFetched).toBe(1);
    const alerts = fake.table("admin_alerts");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      rule: "billing_reconcile_partial",
      severity: "warning",
    });
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

  it("fallback-settles generations past the missing-event deadline", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [
      completedGen("g-old", "req-old", {
        completed_at: new Date(
          Date.now() - 80 * 60 * 60 * 1000
        ).toISOString(), // 80h — past the 72h SLA
      }),
    ]);
    fake.rpcHandlers.set("settle_unbilled_generations", (args) => {
      expect(typeof args.p_completed_before).toBe("string");
      return 1;
    });

    const summary = await runBillingReconciliation(
      fake as never,
      stubFetch([]) // fal never billed it
    );

    expect(summary.fallbackSettled).toBe(1);
    expect(
      fake.table("admin_alerts").some(
        (a) => a.rule === "billing_reconcile_missing_events"
      )
    ).toBe(true);
  });

  it("late sweep still checks fallback_timeout rows so events self-correct", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [
      completedGen("g-fb", "req-fb", {
        billing_reconcile_state: "fallback_timeout",
        completed_at: new Date(
          Date.now() - 80 * 60 * 60 * 1000
        ).toISOString(),
      }),
    ]);

    const rpcCalls: Record<string, unknown>[] = [];
    fake.rpcHandlers.set("reconcile_billing_event", (args) => {
      rpcCalls.push(args);
      return "settled";
    });

    const summary = await runBillingReconciliation(
      fake as never,
      stubFetch([eventFor("req-fb", 0.09)])
    );

    expect(summary.lateScanned).toBe(1);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]!.p_request_id).toBe("req-fb");
  });

  it("still runs the SLA fallback when the billing key is missing", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [completedGen("g1", "req-1")]);
    delete process.env.FAL_KEY;

    let settleCalls = 0;
    fake.rpcHandlers.set("settle_unbilled_generations", () => {
      settleCalls += 1;
      return 1;
    });

    await expect(
      runBillingReconciliation(fake as never, stubFetch([]))
    ).rejects.toThrow(BillingReconcileFatal);

    // The customer's reserve must release on the SLA even with fal dark.
    expect(settleCalls).toBe(1);
  });

  it("still runs the SLA fallback when every fal fetch fails", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [completedGen("g1", "req-1")]);

    let settleCalls = 0;
    fake.rpcHandlers.set("settle_unbilled_generations", () => {
      settleCalls += 1;
      return 0;
    });

    await expect(
      runBillingReconciliation(fake as never, failingFetch(500))
    ).rejects.toThrow(BillingReconcileFatal);

    expect(settleCalls).toBe(1);
  });

  it("warns about generations awaiting events past the alert age", async () => {
    const fake = new FakeServiceClient();
    fake.seed("generations", [
      completedGen("g-aging", "req-aging", {
        completed_at: new Date(
          Date.now() - 50 * 60 * 60 * 1000
        ).toISOString(), // 50h — over alert age, under SLA deadline
      }),
    ]);
    fake.rpcHandlers.set("settle_unbilled_generations", () => 0);

    const summary = await runBillingReconciliation(fake as never, stubFetch([]));

    expect(summary.agedPending).toBe(1);
    expect(summary.fallbackSettled).toBe(0);
    expect(
      fake.table("admin_alerts").some(
        (a) => a.rule === "billing_reconcile_aged_pending"
      )
    ).toBe(true);
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
    // Both RPCs fail: the event reconcile AND the fallback settle pass.
    expect(summary.errors).toBe(2);
  });
});
