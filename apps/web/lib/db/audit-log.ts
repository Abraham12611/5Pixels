"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./admin";

export interface AdminAuditLog {
  id: string;
  adminUserId: string | null;
  adminEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  adminId?: string;
}

export async function getAdminAuditLogs(
  filters: AuditLogFilters = {},
  limit = 100
): Promise<AdminAuditLog[]> {
  await requireAdmin();

  const supabase = await createClient();
  let query = supabase
    .from("admin_audit_logs")
    .select(
      `
      id,
      admin_user_id,
      action,
      entity_type,
      entity_id,
      before,
      after,
      reason,
      created_at,
      profiles(id, email)
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }
  if (filters.entityId) {
    query = query.eq("entity_id", filters.entityId);
  }
  if (filters.adminId) {
    query = query.eq("admin_user_id", filters.adminId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = (row.profiles as unknown as
      | Array<{ id: string; email: string }>
      | null)?.[0];
    return {
      id: row.id as string,
      adminUserId: (row.admin_user_id as string | null) ?? null,
      adminEmail: profile?.email ?? null,
      action: row.action as string,
      entityType: row.entity_type as string,
      entityId: (row.entity_id as string | null) ?? null,
      before: (row.before as Record<string, unknown> | null) ?? null,
      after: (row.after as Record<string, unknown> | null) ?? null,
      reason: (row.reason as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
}

export async function getAdminAuditLogFilters(): Promise<{
  actions: string[];
  entityTypes: string[];
}> {
  await requireAdmin();

  const supabase = await createClient();

  const [{ data: actions }, { data: entities }] = await Promise.all([
    supabase.from("admin_audit_logs").select("action").limit(1000),
    supabase.from("admin_audit_logs").select("entity_type").limit(1000),
  ]);

  return {
    actions: [
      ...new Set((actions ?? []).map((row) => row.action as string)),
    ].sort(),
    entityTypes: [
      ...new Set((entities ?? []).map((row) => row.entity_type as string)),
    ].sort(),
  };
}
