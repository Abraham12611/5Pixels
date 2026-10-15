import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Subsidy grants (issue #110): every non-paid credit grant is real
 * provider-cost liability at $0.01/credit, so all free-credit issuance
 * funnels through the grant_subsidy_credits RPC — one atomic cap check +
 * ledger write per program per month, fail-closed on exhaustion.
 *
 * Programs (seeded in 20261017000001_subsidy_budgets.sql):
 *   referral_budget   — referrer signup bonus + 30% payment share
 *   referral_referee  — referee signup bonus + free-transformation unlock
 *   retention         — cancel-save credit offers
 *   promo             — campaign/promotional grants
 *   admin_manual      — support-issued manual positive adjustments
 */
export type SubsidyProgram =
  | "referral_budget"
  | "referral_referee"
  | "retention"
  | "promo"
  | "admin_manual";

export type SubsidyOutcome = "granted" | "duplicate" | "budget_exhausted";

export interface SubsidyGrantResult {
  outcome: SubsidyOutcome;
  ledgerId: string | null;
}

export async function grantSubsidyCredits(
  service: SupabaseClient,
  input: {
    userId: string;
    program: SubsidyProgram;
    credits: number;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }
): Promise<SubsidyGrantResult> {
  const { data, error } = await service.rpc("grant_subsidy_credits", {
    p_user_id: input.userId,
    p_program: input.program,
    p_credits: input.credits,
    p_idempotency_key: input.idempotencyKey,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`subsidy grant failed: ${error.message}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { outcome?: string; ledger_id?: string }
    | null
    | undefined;
  return {
    outcome: (row?.outcome as SubsidyOutcome) ?? "budget_exhausted",
    ledgerId: (row?.ledger_id as string | null) ?? null,
  };
}
