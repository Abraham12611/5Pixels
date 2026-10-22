import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimum-scope audit trail for MCP tool calls (#272): which admin called
 * which tool, for which entity — never argument payloads, which could carry
 * draft recipe material. Writes through the caller's own scoped client so
 * `admin_user_id` is enforced by the database, not by us.
 */
export async function auditMcpToolCall(
  supabase: SupabaseClient,
  opts: {
    tool: string;
    entityType?: string;
    entityId?: string;
    outcome: "ok" | "denied" | "error";
  }
): Promise<void> {
  const { error } = await supabase.from("admin_audit_logs").insert({
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
