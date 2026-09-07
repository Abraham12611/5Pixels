"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOwner } from "./admin";
import { logAdminAction } from "./audit";

export interface AdminUser {
  id: string;
  email: string | null;
  displayName: string | null;
  status: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  createdAt: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireOwner();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, status, is_admin, is_owner, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: (row.email as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    isAdmin: (row.is_admin as boolean | null) ?? false,
    isOwner: (row.is_owner as boolean | null) ?? false,
    createdAt: (row.created_at as string) ?? "",
  }));
}

export interface UpdateRoleInput {
  userId: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  status?: string;
  reason?: string;
}

export async function updateUserRole(
  input: UpdateRoleInput
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireOwner();

  if (input.userId === user.id) {
    return { success: false, error: "You cannot change your own role." };
  }

  const service = createServiceClient();

  const { data: before } = await service
    .from("profiles")
    .select("is_admin, is_owner, status")
    .eq("id", input.userId)
    .single();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.isAdmin !== undefined) updates.is_admin = input.isAdmin;
  if (input.isOwner !== undefined) updates.is_owner = input.isOwner;
  if (input.status !== undefined) updates.status = input.status;

  const { error } = await service
    .from("profiles")
    .update(updates)
    .eq("id", input.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAdminAction({
    action: "admin.update_user_role",
    entityType: "profile",
    entityId: input.userId,
    before: (before as Record<string, unknown>) ?? {},
    after: {
      ...((before as Record<string, unknown>) ?? {}),
      ...updates,
    },
    reason: input.reason,
    throwOnFailure: false,
  });

  revalidatePath("/admin/users");
  return { success: true };
}
