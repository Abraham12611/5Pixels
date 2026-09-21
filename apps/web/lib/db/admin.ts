"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const { user } = await requireAuthSession();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();

  // Owner is treated as the highest-privilege admin.
  if (error || !(profile?.is_admin || profile?.is_owner)) {
    redirect("/app");
  }

  return { supabase, user, profile };
}

export async function requireOwner() {
  const { user } = await requireAuthSession();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();

  if (error || !profile?.is_owner) {
    throw new Error("Forbidden: owner privilege required");
  }

  return { supabase, user, profile };
}

export async function requireAdminOrOwner() {
  const { user } = await requireAuthSession();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();

  if (error || !(profile?.is_admin || profile?.is_owner)) {
    redirect("/app");
  }

  return { supabase, user, profile };
}

async function requireAuthSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  return { supabase, user };
}
