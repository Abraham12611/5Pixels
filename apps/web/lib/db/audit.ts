"use server";

import { createClient } from "@/lib/supabase/server";

export async function logAdminAction({
  action,
  entityType,
  entityId,
  before,
  after,
  reason,
  throwOnFailure = true,
}: {
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  /**
   * Critical mutations should surface audit-log failures so they cannot be
   * silently ignored. Callers can opt out for non-critical logging.
   */
  throwOnFailure?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (throwOnFailure) throw new Error("Cannot log admin action: no session");
    return;
  }

  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before: before ?? null,
    after: after ?? null,
    reason: reason ?? null,
  });

  if (error) {
    if (throwOnFailure) throw error;
    // Non-critical failures still go to stderr so they are not lost.
    console.error("Failed to write admin audit log:", error);
  }
}
