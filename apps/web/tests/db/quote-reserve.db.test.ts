import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { withDb } from "./helpers/db";
import {
  attachProviderRequest,
  balanceOf,
  completeGeneration,
  createGeneration,
  failGeneration,
  generationOf,
  grantCredits,
  ledgerOf,
  makeAsset,
  makeProduct,
  makeQuote,
  makeSnapshot,
  makeUser,
  markGenerating,
} from "./helpers/fixtures";

/**
 * Issue #105 scenarios 1, 2, 13 — quote creation holds the reserve,
 * completion keeps the hold open pending authoritative billing, and
 * failure releases the reservation back to the customer.
 */

async function createReservedGeneration(client: import("pg").Client) {
  const { userId } = await makeUser(client);
  await grantCredits(client, userId, 20);
  const { productId, productVersionId } = await makeProduct(client);
  const { snapshotId, endpointId } = await makeSnapshot(client);
  const { quoteId } = await makeQuote(client, {
    userId,
    productId,
    productVersionId,
    snapshotId,
    endpointId,
    reserveCredits: 10,
    expectedCostUsd: 0.08,
    maximumCostUsd: 0.1,
  });
  const sourceAssetId = await makeAsset(client, userId);
  const created = await createGeneration(client, {
    userId,
    quoteId,
    sourceAssetId,
  });
  return { userId, quoteId, endpointId, created };
}

describe("quote/reservation lifecycle", () => {
  it("scenario 1: quote consumption creates a -reserve hold and reduces balance", async () => {
    await withDb(async (client) => {
      const { userId, quoteId, created } =
        await createReservedGeneration(client);

      expect(created.status).toBe("created");
      expect(created.processingToken).toBeTruthy();
      expect(created.creditCost).toBe(10);
      expect(created.balanceAfter, "balance_after returned by RPC").toBe(10);

      const ledger = await ledgerOf(client, created.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      expect(ledger[0].entry_type).toBe("reservation");
      expect(Number(ledger[0].amount)).toBe(-10);
      expect(ledger[0].metadata.quote_id).toBe(quoteId);

      expect(await balanceOf(client, userId)).toBe(10);

      const quote = await client.query(
        `SELECT consumed_at, generation_id FROM public.generation_quotes WHERE id = $1`,
        [quoteId]
      );
      expect(quote.rows[0].consumed_at).not.toBeNull();
      expect(quote.rows[0].generation_id).toBe(created.generationId);
    });
  });

  it("scenario 2: completion keeps the full reserve held pending authoritative billing", async () => {
    await withDb(async (client) => {
      const { userId, endpointId, created } =
        await createReservedGeneration(client);

      await attachProviderRequest(client, {
        userId,
        generationId: created.generationId,
        token: created.processingToken,
        requestId: `req-${randomUUID()}`,
        endpointId,
      });
      await markGenerating(client, created.generationId);
      const outputAssetId = await makeAsset(client, userId);
      await completeGeneration(client, {
        userId,
        generationId: created.generationId,
        token: created.processingToken,
        outputAssetId,
      });

      // The hold must NOT be converted yet: still an open -10 reservation.
      const ledger = await ledgerOf(client, created.generationId);
      expect(ledger, JSON.stringify(ledger)).toHaveLength(1);
      expect(ledger[0].entry_type).toBe("reservation");
      expect(Number(ledger[0].amount)).toBe(-10);
      expect(ledger[0].metadata.settlement_mode).toBe("hold_for_authoritative");

      const gen = await generationOf(client, created.generationId);
      expect(gen.status).toBe("completed");
      // snapshot flat_per_request @ $0.05 -> ceil(0.05/0.01) = 5 provisional
      expect(Number(gen.provisional_credit_cost)).toBe(5);
      expect(Number(gen.actual_credit_cost)).toBe(5);
      // Balance still reflects the full held reserve, not the provisional.
      expect(await balanceOf(client, userId)).toBe(10);
    });
  });

  it("scenario 13: a failed generation releases the reservation and refunds the hold", async () => {
    await withDb(async (client) => {
      const { userId, created } = await createReservedGeneration(client);

      await markGenerating(client, created.generationId);
      await failGeneration(client, {
        userId,
        generationId: created.generationId,
        token: created.processingToken,
      });

      const gen = await generationOf(client, created.generationId);
      expect(gen.status).toBe("failed");

      const ledger = await ledgerOf(client, created.generationId);
      const released = ledger.find(
        (r) => r.entry_type === "reservation_released"
      );
      const refund = ledger.find((r) => r.entry_type === "refund");
      expect(released, JSON.stringify(ledger)).toBeDefined();
      expect(Number(released!.amount)).toBe(-10);
      expect(refund, JSON.stringify(ledger)).toBeDefined();
      expect(Number(refund!.amount)).toBe(10);

      // Hold released + refund -> customer is made whole.
      expect(await balanceOf(client, userId)).toBe(20);
    });
  });
});
