"use server";

import { createClient } from "@/lib/supabase/server";
import {
  claimWriteIntent,
  mintApprovalToken,
  type StoredWriteIntent,
} from "@/lib/mcp/preset-factory/approval";

/**
 * Owner write-approval mint (#272).
 *
 * The ONLY way to mint a write-approval token: pass a staged intent id.
 * The action calls A's atomic claim RPC FIRST — a single conditional
 * UPDATE … RETURNING bound to `requester = auth.uid()`, `status='pending'`,
 * unexpired — and verifies exactly one row transitioned before signing.
 * The token binds the digest/operation RETURNED BY THE CLAIM, never any
 * request-supplied value. Concurrent mints cannot both succeed (the second
 * claim sees status='claimed' and returns zero rows), and a token is never
 * minted before the claim is durable.
 */
export async function mintWriteApproval(opts: {
  intentId: string;
}): Promise<{ token?: string; expires_at?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();
  if (!(profile?.is_admin || profile?.is_owner)) {
    return { error: "Admin or owner privileges are required." };
  }

  // Atomic claim FIRST — one pending→claimed transition per intent, or
  // zero rows and no token. The returned row carries the trusted digest.
  const claimed = await claimWriteIntent(supabase, opts.intentId, user.id);
  if (!claimed.ok) return { error: claimed.error };
  const intent: StoredWriteIntent = claimed.intent;

  try {
    const { token, expires_at } = mintApprovalToken({
      userId: user.id,
      operation: intent.operation,
      digest: intent.digest,
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
