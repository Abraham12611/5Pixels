"use server";

import { createClient } from "@/lib/supabase/server";

export async function logAdminAction({
  action,
  entityType,
  entityId,
  before,
  after,
  reason,
}: {
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("admin_audit_logs").insert({
    admin_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before: before ?? null,
    after: after ?? null,
    reason: reason ?? null,
  });
}
