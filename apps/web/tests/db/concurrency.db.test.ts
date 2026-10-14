import { describe, expect, it } from "vitest";
import { withDbClients } from "./helpers/db";
import {
  balanceOf,
  generationOf,
  ledgerOf,
  makeCompletedGeneration,
  reconcileEvent,
  settleUnbilled,
} from "./helpers/fixtures";

/**
 * Issue #105 scenario 11 — fallback settlement and provider reconciliation
 * race on the same generation. The FOR UPDATE / SKIP LOCKED machinery must
 * guarantee a single settlement no matter which side wins the lock.
 */

const HOUR_MS = 3600 * 1000;

describe("concurrent settlement", () => {
  it("SKIP LOCKED: the fallback sweep skips a generation locked by another session", async () => {
    await withDbClients(2, async ([clientA, clientB]) => {
      const g = await makeCompletedGeneration(clientA);
      await clientA.query(
        `UPDATE public.generations
         SET completed_at = NOW() - INTERVAL '73 hours' WHERE id = $1`,
        [g.generationId]
      );

      // Session A holds the row lock — simulating reconcile's FOR UPDATE.
      await clientA.query("BEGIN");
      await clientA.query(
        `SELECT id FROM public.generations WHERE id = $1 FOR UPDATE`,
        [g.generationId]
      );

      // The sweep must skip the locked row instead of blocking on it.
      const swept = await settleUnbilled(
        clientB,
        new Date(Date.now() - 72 * HOUR_MS)
      );
      const genDuringLock = await generationOf(clientB, g.generationId);
      expect(
        genDuringLock.billing_reconcile_state,
        `sweep touched a locked row (swept=${swept})`
      ).toBeNull();

      await clientA.query("COMMIT");

      // After the lock releases, the row settles normally.
      await settleUnbilled(clientB, new Date(Date.now() - 72 * HOUR_MS));
      const genAfter = await generationOf(clientB, g.generationId);
      expect(genAfter.billing_reconcile_state).toBe("fallback_timeout");
    });
  });

  it("scenario 11: racing fallback sweep vs provider reconcile settles exactly once", async () => {
    await withDbClients(2, async ([clientA, clientB]) => {
      const g = await makeCompletedGeneration(clientA);
      await clientA.query(
        `UPDATE public.generations
         SET completed_at = NOW() - INTERVAL '73 hours' WHERE id = $1`,
        [g.generationId]
      );

      // Authoritative cost below the 5-credit provisional, so whichever
      // path wins, the final customer charge must be 3 credits total.
      const [swept, result] = await Promise.all([
        settleUnbilled(clientA, new Date(Date.now() - 72 * HOUR_MS)),
        reconcileEvent(clientB, {
          requestId: g.requestId,
          endpointId: g.endpointId,
          costTotalUsd: 0.03,
        }),
      ]);
      void swept;
      expect(["settled", "duplicate"]).toContain(result);

      const gen = await generationOf(clientA, g.generationId);
      expect(["provider", "provider_late"]).toContain(
        gen.billing_reconcile_state
      );

      const ledger = await ledgerOf(clientA, g.generationId);
      const debits = ledger.filter((r) => r.entry_type === "debit");
      expect(debits, `double-settled: ${JSON.stringify(ledger)}`).toHaveLength(
        1
      );

      const net = ledger.reduce((sum, r) => sum + Number(r.amount), 0);
      expect(net, `ledger net ${net} != -3: ${JSON.stringify(ledger)}`).toBe(
        -3
      );
      expect(await balanceOf(clientA, g.userId)).toBe(17);
    });
  });

  it("duplicate delivery race: concurrent reconcile of the same event records it once", async () => {
    await withDbClients(2, async ([clientA, clientB]) => {
      const g = await makeCompletedGeneration(clientA);

      const results = await Promise.all([
        reconcileEvent(clientA, {
          requestId: g.requestId,
          endpointId: g.endpointId,
          costTotalUsd: 0.04,
        }),
        reconcileEvent(clientB, {
          requestId: g.requestId,
          endpointId: g.endpointId,
          costTotalUsd: 0.04,
        }),
      ]);

      expect([...results].sort()).toEqual(["duplicate", "settled"]);

      const events = await clientA.query(
        `SELECT COUNT(*)::int AS n FROM public.provider_billing_events
         WHERE provider = 'fal' AND request_id = $1`,
        [g.requestId]
      );
      expect(events.rows[0].n).toBe(1);

      const ledger = await ledgerOf(clientA, g.generationId);
      const debits = ledger.filter((r) => r.entry_type === "debit");
      expect(debits).toHaveLength(1);
      expect(await balanceOf(clientA, g.userId)).toBe(16);
    });
  });
});
