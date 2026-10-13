import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { withDb } from "./helpers/db";
import {
  balanceOf,
  generationOf,
  ledgerOf,
  makeAsset,
  makeCompletedGeneration,
  makeProduct,
  makeUser,
  reconcileEvent,
  settleUnbilled,
} from "./helpers/fixtures";

/**
 * Issue #105 scenarios 6, 7, 8, 10 — the 72h missing-event SLA fallback
 * settles at the provisional charge, late provider events may only refund
 * downward, and pre-#93 unquoted rows never touch new-denomination credits.
 */

const HOUR_MS = 3600 * 1000;

describe("SLA fallback and late provider events", () => {
  it("scenario 6: 72h fallback settles the provisional charge", async () => {
    await withDb(async (client) => {
      const g = await makeCompletedGeneration(client);

      // Age the row past the 72h SLA so the sweep picks it up.
      await client.query(
        `UPDATE public.generations
         SET completed_at = NOW() - INTERVAL '73 hours' WHERE id = $1`,
        [g.generationId]
      );

      const settled = await settleUnbilled(
        client,
        new Date(Date.now() - 72 * HOUR_MS)
      );
      expect(settled).toBeGreaterThanOrEqual(1);

      const gen = await generationOf(client, g.generationId);
      expect(gen.billing_reconcile_state).toBe("fallback_timeout");
      // Reconciliation is deliberately NOT closed — late events still land.
      expect(gen.billing_reconciled_at).toBeNull();

      const ledger = await ledgerOf(client, g.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      expect(ledger[0].entry_type).toBe("debit");
      // Provisional = ceil(0.05/0.01) = 5, not the full 10 reserve.
      expect(Number(ledger[0].amount)).toBe(-5);
      expect(ledger[0].metadata.settlement_mode).toBe("fallback_timeout");

      expect(await balanceOf(client, g.userId)).toBe(15);
    });
  });

  it("scenario 7: a late event below the provisional charge refunds the difference", async () => {
    await withDb(async (client) => {
      const g = await makeCompletedGeneration(client);
      await client.query(
        `UPDATE public.generations
         SET completed_at = NOW() - INTERVAL '73 hours' WHERE id = $1`,
        [g.generationId]
      );
      await settleUnbilled(client, new Date(Date.now() - 72 * HOUR_MS));
      expect(await balanceOf(client, g.userId)).toBe(15);

      const result = await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.03,
      });
      expect(result).toBe("settled");

      const gen = await generationOf(client, g.generationId);
      expect(gen.billing_reconcile_state).toBe("provider_late");
      expect(Number(gen.actual_credit_cost)).toBe(3);
      expect(gen.billing_reconciled_at).not.toBeNull();

      const ledger = await ledgerOf(client, g.generationId);
      const adjustment = ledger.find((r) => r.entry_type === "adjustment");
      expect(adjustment, JSON.stringify(ledger)).toBeDefined();
      expect(Number(adjustment!.amount)).toBe(2);

      // 20 - 5 provisional + 2 refund = 17.
      expect(await balanceOf(client, g.userId)).toBe(17);

      const event = await client.query(
        `SELECT ledger_credit_delta::numeric::float AS delta
         FROM public.provider_billing_events WHERE request_id = $1`,
        [g.requestId]
      );
      expect(event.rows[0].delta).toBe(-2);
    });
  });

  it("scenario 8: a late event above the provisional charge cannot increase the customer charge", async () => {
    await withDb(async (client) => {
      const g = await makeCompletedGeneration(client);
      await client.query(
        `UPDATE public.generations
         SET completed_at = NOW() - INTERVAL '73 hours' WHERE id = $1`,
        [g.generationId]
      );
      await settleUnbilled(client, new Date(Date.now() - 72 * HOUR_MS));
      expect(await balanceOf(client, g.userId)).toBe(15);

      // Authoritative cost (0.09) is above the 5-credit provisional but
      // below the quote max — the extra exposure is absorbed, not billed.
      const result = await reconcileEvent(client, {
        requestId: g.requestId,
        endpointId: g.endpointId,
        costTotalUsd: 0.09,
      });
      expect(result).toBe("settled");

      const gen = await generationOf(client, g.generationId);
      expect(gen.billing_reconcile_state).toBe("provider_late");
      expect(Number(gen.actual_credit_cost)).toBe(5);

      const ledger = await ledgerOf(client, g.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      expect(
        ledger.filter((r) => Number(r.amount) < 0),
        `negative ledger rows: ${JSON.stringify(ledger)}`
      ).toHaveLength(1);

      // Balance is untouched — the charge stayed at the provisional 5.
      expect(await balanceOf(client, g.userId)).toBe(15);
    });
  });

  it("scenario 10: a pre-#93 unquoted row never mutates new-denomination credits", async () => {
    await withDb(async (client) => {
      const { userId } = await makeUser(client);
      const { productId, productVersionId } = await makeProduct(client);
      const sourceAssetId = await makeAsset(client, userId);
      const generationId = randomUUID();
      const requestId = `legacy-${randomUUID()}`;

      // Legacy row: no quote, no fixed-denomination charge recorded.
      await client.query(
        `INSERT INTO public.generations (
           id, user_id, product_id, product_version_id, source_asset_id,
           status, requested_options, idempotency_key, provider_request_id,
           provider_endpoint, completed_at
         ) VALUES (
           $1, $2, $3, $4, $5, 'completed', '{}'::jsonb, $6, $7,
           'fal-ai/legacy/endpoint', NOW() - INTERVAL '73 hours'
         )`,
        [
          generationId,
          userId,
          productId,
          productVersionId,
          sourceAssetId,
          `legacy-idem-${randomUUID()}`,
          requestId,
        ]
      );

      // Fallback sweep marks it without writing ledger rows.
      await settleUnbilled(client, new Date(Date.now() - 72 * HOUR_MS));
      let gen = await generationOf(client, generationId);
      expect(gen.billing_reconcile_state).toBe("fallback_timeout");
      expect(await ledgerOf(client, generationId)).toHaveLength(0);

      // The late provider event reconciles it as unquoted — still no ledger.
      const result = await reconcileEvent(client, {
        requestId,
        endpointId: "fal-ai/legacy/endpoint",
        costTotalUsd: 0.07,
      });
      expect(result).toBe("settled_unquoted");

      gen = await generationOf(client, generationId);
      expect(gen.billing_reconcile_state).toBe("provider_unquoted");
      expect(Number(gen.provider_cost_usd)).toBeCloseTo(0.07, 6);
      expect(await ledgerOf(client, generationId)).toHaveLength(0);
      expect(await balanceOf(client, userId)).toBe(0);
    });
  });
});
