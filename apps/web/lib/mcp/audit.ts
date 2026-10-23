import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimum-scope audit trail for MCP tool calls (#272): which admin called
 * which tool, for which entity — never argument payloads, which could carry
 * draft recipe material. Writes through the caller's own scoped client with
 * the VERIFIED `admin_user_id` so every row names the real bearer-token
 * caller; the table's admin-only RLS policy enforces the rest. (A caller who
 * is owner-but-not-admin can't satisfy that policy — insert failure is
 * logged loudly, and A's SECURITY DEFINER ledger still records the write.)
 */
export async function auditMcpToolCall(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    tool: string;
    entityType?: string;
    entityId?: string;
    outcome: "ok" | "denied" | "error";
  }
): Promise<void> {
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: opts.userId,
    action: `mcp.${opts.tool}.${opts.outcome}`,
    entity_type: opts.entityType ?? "preset_factory",
    entity_id: opts.entityId ?? null,
    after: null,
    reason: "preset-factory-mcp",
  });
  if (error) {
    // Audit must not be silently lost, but a logging outage should not take
    // the read path down — surface loudly and continue.
    console.error(`[mcp-audit] failed for ${opts.tool}:`, error.message);
  }
}
