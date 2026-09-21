import { describe, expect, it } from "vitest";
import { mapLedgerRow } from "../ledger";

const base = {
  id: "row-1",
  created_at: "2026-09-10T00:00:00Z",
  metadata: null,
};

describe("mapLedgerRow", () => {
  it("labels debits with the preset name and Completed status", () => {
    const entry = mapLedgerRow(
      { ...base, entry_type: "debit", amount: -2 },
      { productName: "Midnight Premiere" }
    );
    expect(entry).toMatchObject({
      kind: "spent",
      label: "Midnight Premiere",
      amount: -2,
      statusLabel: "Completed",
    });
  });

  it("labels refunds as released credits with Failed status", () => {
    const entry = mapLedgerRow(
      { ...base, entry_type: "refund", amount: 2 },
      { productName: "Studio Founder" }
    );
    expect(entry.kind).toBe("released");
    expect(entry.statusLabel).toBe("Failed");
    expect(entry.label).toBe("Studio Founder");
  });

  it("labels reservations as In progress", () => {
    const entry = mapLedgerRow(
      { ...base, entry_type: "reservation", amount: -3 },
      { productName: "Magazine Cover 02" }
    );
    expect(entry.statusLabel).toBe("In progress");
    expect(entry.kind).toBe("held");
  });

  it("labels plan-linked purchases by plan name", () => {
    const entry = mapLedgerRow(
      {
        ...base,
        entry_type: "purchase",
        amount: 3000,
        metadata: { plan_id: "p1", subscription_id: "s1" },
      },
      { planName: "Pro" }
    );
    expect(entry.label).toBe("Pro plan credits");
    expect(entry.kind).toBe("added");
  });

  it("labels unlinked purchases as credit top-ups", () => {
    const entry = mapLedgerRow({
      ...base,
      entry_type: "purchase",
      amount: 1000,
      metadata: { invoice_id: "i1" },
    });
    expect(entry.label).toBe("Credit top-up");
  });

  it("labels the signup allocation as welcome credits", () => {
    const entry = mapLedgerRow({
      ...base,
      entry_type: "allocation",
      amount: 10,
      metadata: { reason: "initial_signup_credits" },
    });
    expect(entry.label).toBe("Welcome credits");
    expect(entry.statusLabel).toBe("Plan credits");
  });

  it("falls back to Transformation when the preset is unknown", () => {
    const entry = mapLedgerRow({ ...base, entry_type: "debit", amount: -4 });
    expect(entry.label).toBe("Transformation");
  });

  it("treats unknown entry types as adjustments", () => {
    const entry = mapLedgerRow({
      ...base,
      entry_type: "adjustment",
      amount: 5,
    });
    expect(entry.statusLabel).toBe("Adjustment");
    expect(entry.kind).toBe("added");
  });
});
