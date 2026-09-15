export type CreditEntryKind = "spent" | "released" | "added" | "held";

export interface CreditActivityEntry {
  id: string;
  kind: CreditEntryKind;
  /** Human-readable label — preset name or purchase/grant description. */
  label: string;
  /** Signed credit amount (negative = spent/held). */
  amount: number;
  statusLabel:
    | "Completed"
    | "Failed"
    | "In progress"
    | "Purchase"
    | "Plan credits"
    | "Adjustment";
  date: string;
}

export interface LedgerRowLike {
  id: string;
  entry_type: string;
  amount: number | string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

/**
 * Map a credit_ledger row to a consumer-facing ledger entry. Preset names are
 * resolved by the caller (via generation → product join); purchase entries
 * name their plan when known.
 */
export function mapLedgerRow(
  row: LedgerRowLike,
  opts: { productName?: string | null; planName?: string | null } = {}
): CreditActivityEntry {
  const amount = Number(row.amount) || 0;
  const { productName, planName } = opts;

  switch (row.entry_type) {
    case "debit":
      return {
        id: row.id,
        kind: "spent",
        label: productName ?? "Transformation",
        amount,
        statusLabel: "Completed",
        date: row.created_at,
      };
    case "refund":
      return {
        id: row.id,
        kind: "released",
        label: productName ?? "Transformation",
        amount,
        statusLabel: "Failed",
        date: row.created_at,
      };
    case "reservation":
      return {
        id: row.id,
        kind: "held",
        label: productName ?? "Transformation",
        amount,
        statusLabel: "In progress",
        date: row.created_at,
      };
    case "purchase": {
      const isTopUp =
        typeof row.metadata?.subscription_id !== "string" && !planName;
      return {
        id: row.id,
        kind: "added",
        label: planName
          ? `${planName} plan credits`
          : isTopUp
            ? "Credit top-up"
            : "Credits purchase",
        amount,
        statusLabel: "Purchase",
        date: row.created_at,
      };
    }
    case "allocation":
      return {
        id: row.id,
        kind: "added",
        label:
          row.metadata?.reason === "initial_signup_credits"
            ? "Welcome credits"
            : "Plan credits",
        amount,
        statusLabel: "Plan credits",
        date: row.created_at,
      };
    default:
      return {
        id: row.id,
        kind: amount >= 0 ? "added" : "spent",
        label: "Credit adjustment",
        amount,
        statusLabel: "Adjustment",
        date: row.created_at,
      };
  }
}
