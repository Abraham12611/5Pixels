"use server";

import { createClient } from "@/lib/supabase/server";
import {
  mintApprovalToken,
  type ApprovableOperation,
} from "@/lib/mcp/preset-factory/approval";

const VALID_OPS: ApprovableOperation[] = ["create_draft_batch", "create_categories"];

/**
 * Mint an owner-bound MCP write-approval token (#272).
 *
 * Only reachable from this authenticated admin page — never through MCP.
 * The action re-verifies the cookie session is admin/owner, then signs a
 * short-lived token binding {owner, operation, payload digest}. The owner
 * pastes the token into the ChatGPT conversation; the write tool verifies
 * all three bindings before the backend sees the request.
 */
export async function mintWriteApproval(opts: {
  operation: string;
  digest: string;
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

  if (!VALID_OPS.includes(opts.operation as ApprovableOperation)) {
    return { error: "Unknown operation." };
  }
  if (!/^[0-9a-f]{64}$/.test(opts.digest)) {
    return { error: "Malformed payload digest." };
  }

  try {
    const { token, expires_at } = mintApprovalToken({
      userId: user.id,
      operation: opts.operation as ApprovableOperation,
      digest: opts.digest,
    });
    return { token, expires_at };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : `Approval signing is not configured. Set PRESET_FACTORY_APPROVAL_SECRET.`,
    };
  }
}


