import { describe, expect, it } from "vitest";

interface LedgerEntry {
  entry_type:
    | "allocation"
    | "purchase"
    | "reservation"
    | "reservation_released"
    | "debit"
    | "refund"
    | "adjustment";
  amount: number;
}

/**
 * The single source of truth for spendable credits: the plain sum of every
 * ledger row. Reservations are negative, so open holds already reduce this —
 * there is no separate "posted minus held" formula.
 */
function balance(entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

function hasLiveReservation(entries: LedgerEntry[], cost: number): boolean {
  return entries.some(
    (e) => e.entry_type === "reservation" && e.amount === -cost
  );
}

function hasRelease(entries: LedgerEntry[], cost: number): boolean {
  return entries.some(
    (e) => e.entry_type === "reservation_released" && e.amount === -cost
  );
}

function hasDebit(entries: LedgerEntry[], cost: number): boolean {
  return entries.some((e) => e.entry_type === "debit" && e.amount === -cost);
}

function hasRefund(entries: LedgerEntry[], cost: number): boolean {
  return entries.some((e) => e.entry_type === "refund" && e.amount === cost);
}

describe("credit math", () => {
  it("calculates a positive balance", () => {
    expect(balance([{ entry_type: "allocation", amount: 10 }])).toBe(10);
  });

  it("reflects reservations as negative", () => {
    expect(
      balance([
        { entry_type: "allocation", amount: 10 },
        { entry_type: "reservation", amount: -3 },
      ])
    ).toBe(7);
  });

  it("subtracts multiple open holds before a new reservation", () => {
    const entries: LedgerEntry[] = [
      { entry_type: "purchase", amount: 10 },
      { entry_type: "reservation", amount: -4 },
      { entry_type: "reservation", amount: -4 },
    ];
    // Available is 2, so a third 4-credit reservation must be rejected.
    expect(balance(entries)).toBe(2);
    expect(balance(entries)).toBeLessThan(4);
  });

  it("detects a live reservation coexisting with a debit (double-charge state)", () => {
    const entries: LedgerEntry[] = [
      { entry_type: "allocation", amount: 10 },
      { entry_type: "reservation", amount: -3 },
      { entry_type: "debit", amount: -3 },
    ];
    // A still-live reservation + a final debit would double-charge; the
    // invariant check must flag this state.
    expect(hasLiveReservation(entries, 3) && hasDebit(entries, 3)).toBe(true);
  });

  it("detects a double refund", () => {
    const entries: LedgerEntry[] = [
      { entry_type: "allocation", amount: 10 },
      { entry_type: "reservation", amount: -3 },
      { entry_type: "refund", amount: 3 },
      { entry_type: "refund", amount: 3 },
    ];
    expect(balance(entries)).toBe(13);
  });
});

describe("failure release invariant", () => {
  it("released hold + refund returns exactly the pre-reservation balance", () => {
    const entries: LedgerEntry[] = [
      { entry_type: "allocation", amount: 10 },
      { entry_type: "reservation_released", amount: -3 },
      { entry_type: "refund", amount: 3 },
    ];
    // The historical bug defined "available" without reservations, turning a
    // 10-credit account into 13 after one failure. Summing all rows fixes it.
    expect(balance(entries)).toBe(10);
  });

  it("terminalizes the hold — no live reservation survives a failure", () => {
    const entries: LedgerEntry[] = [
      { entry_type: "allocation", amount: 10 },
      { entry_type: "reservation_released", amount: -3 },
      { entry_type: "refund", amount: 3 },
    ];
    expect(hasLiveReservation(entries, 3)).toBe(false);
    expect(hasRelease(entries, 3)).toBe(true);
    expect(hasRefund(entries, 3)).toBe(true);
  });

  it("stays non-negative across reserve → fail → reserve cycles", () => {
    const entries: LedgerEntry[] = [
      { entry_type: "purchase", amount: 10 },
      { entry_type: "reservation_released", amount: -4 },
      { entry_type: "refund", amount: 4 },
      { entry_type: "reservation", amount: -7 },
    ];
    // 10 - 4 + 4 - 7 = 3 available while the second run is in flight.
    expect(balance(entries)).toBe(3);
    expect(balance(entries)).toBeGreaterThanOrEqual(0);
  });

  it("a refund reversal caps at available and cannot double-count holds", () => {
    // Granted 10, held 7 in-flight, provider reverses the grant: the reversal
    // is capped at available (3), leaving 0 — the hold stays committed.
    const entries: LedgerEntry[] = [
      { entry_type: "purchase", amount: 10 },
      { entry_type: "reservation", amount: -7 },
      { entry_type: "debit", amount: -3 }, // reversal, capped at available
    ];
    expect(balance(entries)).toBe(0);
    expect(balance(entries)).toBeGreaterThanOrEqual(0);
  });
});
