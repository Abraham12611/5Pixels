import { describe, expect, it } from "vitest";

interface LedgerEntry {
  entry_type: "allocation" | "reservation" | "debit" | "refund";
  amount: number;
}

function balance(entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

function isReservationDrained(entries: LedgerEntry[], cost: number): boolean {
  const hasReservation = entries.some(
    (e) => e.entry_type === "reservation" && e.amount === -cost
  );
  const hasDebit = entries.some(
    (e) => e.entry_type === "debit" && e.amount === -cost
  );
  const hasRefund = entries.some(
    (e) => e.entry_type === "refund" && e.amount === cost
  );
  return !(hasReservation && (hasDebit || hasRefund));
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

  it("keeps a reservation and a debit from coexisting", () => {
    const entries: LedgerEntry[] = [
      { entry_type: "allocation", amount: 10 },
      { entry_type: "reservation", amount: -3 },
      { entry_type: "debit", amount: -3 },
    ];
    expect(isReservationDrained(entries, 3)).toBe(false);
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
