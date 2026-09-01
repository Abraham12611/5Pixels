"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUserCreditBalance(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase.rpc("get_user_balance");
  if (error) {
    console.error("[getUserCreditBalance] failed", error.message);
    return 0;
  }
  return (data as number | null) ?? 0;
}
