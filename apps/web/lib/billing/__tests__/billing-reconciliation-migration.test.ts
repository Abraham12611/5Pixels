import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contract test for the reconciliation SQL — the RPC is mocked in unit
 * tests, so these assertions guard the invariants that mocked tests can't
 * see (and that a reviewer caught regressions on once already).
 */
const sql = readFileSync(
  join(
    __dirname,
    "../../../../../supabase/migrations/20261011000001_fal_billing_reconciliation.sql"
  ),
  "utf-8"
);

describe("billing reconciliation migration", () => {
  it("uses the composite partial unique index for adjustment idempotency", () => {
    // credit_ledger has NO global UNIQUE on idempotency_key — only
    // (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL.
    // A bare ON CONFLICT (idempotency_key) fails at runtime.
    expect(sql).toContain(
      "ON CONFLICT (user_id, idempotency_key)"
    );
    expect(sql).not.toMatch(
      /ON CONFLICT \(idempotency_key\)\s*DO NOTHING/
    );
  });

  it("only writes ledger adjustments for quoted (fixed-credit) generations", () => {
    // Pre-#93 rows carry the old credit denomination — no new-denomination
    // ledger writes or actual_credit_cost rewrites may touch them.
    expect(sql).toMatch(/v_gen\.quote_id IS NOT NULL[\s\S]*?credit_ledger/);
    expect(sql).toContain("WHEN quote_id IS NOT NULL");
    expect(sql).toContain("'settled_unquoted'");
  });

  it("caps the authoritative charge at the reservation", () => {
    expect(sql).toMatch(/LEAST\(\s*public\.credits_for_provider_cost/);
  });

  it("records the adjustment delta on the billing event for audit", () => {
    expect(sql).toContain("ledger_credit_delta");
  });
});
