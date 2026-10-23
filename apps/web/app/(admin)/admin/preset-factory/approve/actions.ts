"use server";

import { createClient } from "@/lib/supabase/server";
import {
  consumeWriteIntent,
  loadWriteIntent,
  mintApprovalToken,
  type StoredWriteIntent,
} from "@/lib/mcp/preset-factory/approval";

/**
 * Owner write-approval actions (#272).
 *
 * The ONLY way to mint a write-approval token: pass a staged intent id.
 * The action loads the SERVER-HELD pending intent, re-validates ownership/
 * freshness/pending state for the signed-in admin, then signs a token bound
 * to the stored digest — there is no way to sign an arbitrary digest, URL
 * parameter, or model-supplied payload.
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

  const loaded = await loadWriteIntent(supabase, opts.intentId, user.id);
  if (!loaded.ok) return { error: loaded.error };
  const intent: StoredWriteIntent = loaded.intent;

  try {
    const { token, expires_at } = mintApprovalToken({
      userId: user.id,
      operation: intent.operation,
      digest: intent.digest,
    });
    // One intent → one mint. If the consume update is somehow lost the
    // token still can't be replayed past expiry, but the pending→approved
    // transition is the replay guard that shows up in review.
    await consumeWriteIntent(supabase, opts.intentId);
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
