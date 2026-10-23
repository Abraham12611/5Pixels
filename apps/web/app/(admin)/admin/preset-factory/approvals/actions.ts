"use server";

import { createClient } from "@/lib/supabase/server";
import {
  approveWriteIntent,
  createPresetFactoryContext,
} from "@/lib/preset-factory/service";

export interface BulkApproveResult {
  intent_id: string;
  ok: boolean;
  error?: string;
}

/**
 * Bulk owner approval (#272) — runs A's atomic `admin_approve_write_intent`
 * RPC once per intent. Each transition is independently server-enforced:
 * owner-only (after A's approver change), OAuth-session refusal, expiry,
 * pending-state — and a failure on one row never affects the others.
 * Results are reported per intent so a partial failure is always visible.
 */
export async function bulkApproveWriteIntents(
  intentIds: string[]
): Promise<BulkApproveResult[]> {
  const supabase = await createClient();
  const ctxRes = await createPresetFactoryContext(supabase);
  if (!ctxRes.ok) {
    return intentIds.map((intent_id) => ({
      intent_id,
      ok: false,
      error: ctxRes.error.message,
    }));
  }
  if (!ctxRes.data.isOwner) {
    return intentIds.map((intent_id) => ({
      intent_id,
      ok: false,
      error: "Owner approval required — the inbox approver must be the product owner.",
    }));
  }

  const results: BulkApproveResult[] = [];
  for (const intent_id of intentIds.slice(0, 25)) {
    const res = await approveWriteIntent(ctxRes.data, { intent_id });
    results.push({
      intent_id,
      ok: res.ok,
      error: res.ok ? undefined : res.error.message,
    });
  }
  return results;
}
