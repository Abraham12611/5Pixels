"use server";

import { createClient } from "@/lib/supabase/server";
import {
  approveWriteIntent,
  createPresetFactoryContext,
  getWriteIntent,
} from "@/lib/preset-factory/service";
import {
  APPROVAL_TTL_SECONDS,
  assertApprovalSecretConfigured,
  mintApprovalToken,
} from "@/lib/mcp/preset-factory/approval";
import type { ApprovableOperation } from "@/lib/preset-factory/contract";

/**
 * Owner write-approval mint (#272).
 *
 * A's intent contract is the authority: this action runs the atomic
 * `admin_approve_write_intent` RPC — a single pending→approved transition
 * bound to the owning admin, refusing OAuth-issued callers inside SQL —
 * and only mints the ChatGPT-layer HMAC token AFTER `status='approved'`
 * is returned. The token binds {owner id, operation, intent_id, and the
 * intent's SQL-computed `payload_digest`}; concurrent approvals and stale
 * intents fail at the RPC, never at a JS check.
 */
export async function mintWriteApproval(opts: {
  intentId: string;
}): Promise<{ token?: string; expires_at?: string; error?: string }> {
  const supabase = await createClient();

  // Cookie-session factory context — the ONLY context approveWriteIntent
  // accepts (the RPC refuses OAuth-issued callers by design).
  const ctxRes = await createPresetFactoryContext(supabase);
  if (!ctxRes.ok) return { error: ctxRes.error.message };
  const ctx = ctxRes.data;

  // Fail closed BEFORE touching the intent: if no strong signing secret is
  // configured, minting would fail — and since pending→approved is a
  // one-way atomic transition, approving first would consume the approval
  // opportunity without producing a usable token.
  try {
    assertApprovalSecretConfigured();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Approval signing is not configured. Set PRESET_FACTORY_APPROVAL_SECRET.",
    };
  }

  // Caller-bound read: establishes the operation + SQL-computed digest the
  // token will bind, and surfaces a clear error for missing/foreign intents
  // before the state transition is attempted.
  const intent = await getWriteIntent(ctx, { intent_id: opts.intentId });
  if (!intent.ok) return { error: intent.error.message };

  // Atomic pending → approved transition (server-enforced; refused for
  // OAuth callers, non-owners, expired or non-pending intents).
  const approved = await approveWriteIntent(ctx, { intent_id: opts.intentId });
  if (!approved.ok) return { error: approved.error.message };
  if (approved.data.status !== "approved") {
    return { error: "Approval transition did not complete." };
  }

  try {
    // Clamp the token to the intent's real expiry — the signed credential
    // must never outlive the approval it points at.
    const intentExpiresMs = new Date(intent.data.intent.expires_at).getTime();
    const remainingSeconds = Math.floor((intentExpiresMs - Date.now()) / 1000);
    if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
      return { error: "This approval intent has already expired — stage a new request." };
    }
    const { token, expires_at } = mintApprovalToken({
      userId: ctx.userId,
      operation: intent.data.intent.operation as ApprovableOperation,
      intentId: opts.intentId,
      digest: intent.data.intent.payload_digest,
      ttlSeconds: Math.min(APPROVAL_TTL_SECONDS, remainingSeconds),
    });
    return { token, expires_at };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Approval signing is not configured. Set PRESET_FACTORY_APPROVAL_SECRET.",
    };
  }
}
