import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { withDb } from "./helpers/db";
import {
  balanceOf,
  generationOf,
  ledgerOf,
  makeCompletedGeneration,
  makeUser,
  reconcileEvent,
} from "./helpers/fixtures";

/**
 * Issue #105 scenarios 3, 4, 5, 9, 12, 14 — authoritative provider billing
 * events settle the held reserve at the true cost (capped at the envelope),
 * duplicate deliveries are idempotent, the partial unique indexes behave,
 * and reconciliation mechanics can never drive a balance negative.
 */

describe("authoritative billing reconciliation", () => {
  it("scenario 3: cost below reserve converts hold to smaller debit and frees the rest", async () => {
    await withDb(async (client) => {
      const g = await makeCompletedGeneration(client);

      const result = await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.04,
      });
      expect(result).toBe("settled");

      const ledger = await ledgerOf(client, g.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      // ceil(0.04/0.01) = 4 -> the -10 reservation converts to a -4 debit.
      expect(ledger[0].entry_type).toBe("debit");
      expect(Number(ledger[0].amount)).toBe(-4);
      expect(ledger[0].metadata.settlement_mode).toBe("authoritative");
      expect(ledger[0].metadata.authoritative_credit_cost).toBe(4);

      const gen = await generationOf(client, g.generationId);
      expect(Number(gen.actual_credit_cost)).toBe(4);
      expect(Number(gen.provider_cost_usd)).toBeCloseTo(0.04, 6);
      expect(gen.billing_reconcile_state).toBe("provider");
      expect(gen.billing_reconciled_at).not.toBeNull();

      // 20 granted - 4 settled = 16 (the other 6 of the reserve released).
      expect(await balanceOf(client, g.userId)).toBe(16);

      const event = await client.query(
        `SELECT generation_id, ledger_credit_delta, overrun
         FROM public.provider_billing_events WHERE request_id = $1`,
        [g.requestId]
      );
      expect(event.rows[0].generation_id).toBe(g.generationId);
      expect(event.rows[0].overrun).toBe(false);
    });
  });

  it("scenario 4: authoritative cost at the reserve settles for the full hold", async () => {
    await withDb(async (client) => {
      const g = await makeCompletedGeneration(client, { maximumCostUsd: 0.1 });

      const result = await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.1,
      });
      expect(result).toBe("settled");

      const ledger = await ledgerOf(client, g.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      expect(ledger[0].entry_type).toBe("debit");
      expect(Number(ledger[0].amount)).toBe(-10);

      const gen = await generationOf(client, g.generationId);
      expect(Number(gen.actual_credit_cost)).toBe(10);
      expect(await balanceOf(client, g.userId)).toBe(10);
    });
  });

  it("scenario 5: provider cost above quote max caps the customer, stores truth, suspends route, alerts", async () => {
    await withDb(async (client) => {
      const g = await makeCompletedGeneration(client, { maximumCostUsd: 0.1 });

      const result = await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.15,
      });
      expect(result).toBe("overrun_absorbed");

      // Customer charge is capped at the 10-credit reservation.
      const ledger = await ledgerOf(client, g.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      expect(ledger[0].entry_type).toBe("debit");
      expect(Number(ledger[0].amount)).toBe(-10);
      expect(await balanceOf(client, g.userId)).toBe(10);

      // Provider truth is still recorded on the generation + event.
      const gen = await generationOf(client, g.generationId);
      expect(Number(gen.actual_credit_cost)).toBe(10);
      expect(Number(gen.provider_cost_usd)).toBeCloseTo(0.15, 6);

      const event = await client.query(
        `SELECT overrun, quote_maximum_usd::numeric::float AS qmax
         FROM public.provider_billing_events WHERE request_id = $1`,
        [g.requestId]
      );
      expect(event.rows[0].overrun).toBe(true);
      expect(event.rows[0].qmax).toBeCloseTo(0.1, 6);

      // Circuit breaker: the endpoint is suspended with reason.
      const state = await client.query(
        `SELECT status, suspend_reason, overrun_count
         FROM public.provider_endpoint_state
         WHERE provider = 'fal' AND endpoint_id = $1`,
        [g.endpointId]
      );
      expect(state.rows[0], "endpoint should be suspended").toMatchObject({
        status: "suspended",
        suspend_reason: "billing_overrun",
        overrun_count: 1,
      });

      // A critical admin alert was emitted referencing this generation.
      const alerts = await client.query(
        `SELECT severity, details->>'generation_id' AS gen
         FROM public.admin_alerts
         WHERE rule = 'provider_billing_overrun'
           AND details->>'generation_id' = $1`,
        [g.generationId]
      );
      expect(alerts.rows, "expected billing-overrun alert").toHaveLength(1);
      expect(alerts.rows[0].severity).toBe("critical");
    });
  });

  it("scenario 9: a duplicate billing event is idempotent", async () => {
    await withDb(async (client) => {
      const g = await makeCompletedGeneration(client);

      const first = await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.04,
      });
      const second = await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.04,
      });
      expect(first).toBe("settled");
      expect(second).toBe("duplicate");

      const ledger = await ledgerOf(client, g.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      expect(await balanceOf(client, g.userId)).toBe(16);

      const events = await client.query(
        `SELECT COUNT(*)::int AS n FROM public.provider_billing_events
         WHERE provider = 'fal' AND request_id = $1`,
        [g.requestId]
      );
      expect(events.rows[0].n).toBe(1);
    });
  });

  it("scenario 12: partial unique idempotency index rejects exact dupes only", async () => {
    await withDb(async (client) => {
      const { userId: userA } = await makeUser(client);
      const { userId: userB } = await makeUser(client);
      const key = `shared-key-${randomUUID()}`;

      const insert = (user: string, idem: string | null) =>
        client.query(
          `INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key)
           VALUES ($1, 'purchase', 1, $2)`,
          [user, idem]
        );

      // Same user + same non-null key -> unique violation.
      await insert(userA, key);
      await expect(insert(userA, key)).rejects.toMatchObject({ code: "23505" });

      // Same key under a different user -> allowed (index is composite).
      await insert(userB, key);

      // NULL keys are exempt -> repeats allowed.
      await insert(userA, null);
      await insert(userA, null);

      // The reconcile path's ON CONFLICT (user_id, idempotency_key) DO NOTHING
      // relies on this index — verify the conflict target actually resolves.
      const res = await client.query(
        `INSERT INTO public.credit_ledger (user_id, entry_type, amount, idempotency_key)
         VALUES ($1, 'adjustment', 1, $2)
         ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
         DO NOTHING RETURNING id`,
        [userA, key]
      );
      expect(res.rows, "conflicting adjustment should be ignored").toHaveLength(
        0
      );
    });
  });

  it("scenario 14: provider reconciliation alone can never drive the balance negative", async () => {
    await withDb(async (client) => {
      // Grant exactly the reserve — the tightest possible balance.
      const g = await makeCompletedGeneration(client, { grantCredits: 10 });
      expect(await balanceOf(client, g.userId)).toBe(0);

      // Provider bills well above the quote maximum.
      await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.15,
      });

      const balance = await balanceOf(client, g.userId);
      expect(
        balance,
        `balance went negative after overrun settle: ${balance}`
      ).toBeGreaterThanOrEqual(0);
      // Customer paid exactly the capped reserve — nothing more.
      expect(balance).toBe(0);
    });
  });
});
