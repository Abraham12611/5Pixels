"use server";

import { createClient } from "@/lib/supabase/server";
import type { UsageDay } from "@/components/consumer/usage-card";

export interface UsageStats {
  days: UsageDay[];
  totalCreditsSpent: number;
  totalGenerations: number;
}

function toDayKey(date: Date): string {
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate());
  const month = prevDate.toLocaleDateString("en-US", { month: "short" });
  const day = prevDate.getDate();
  return `${month} ${day}`;
}

export async function getMyUsageStats(): Promise<UsageStats | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [ledgerResult, generationsResult] = await Promise.all([
    supabase
      .from("credit_ledger")
      .select("amount, entry_type, created_at")
      .eq("user_id", user.id)
      .lt("amount", 0)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const ledger = ledgerResult.data ?? [];
  const totalGenerations = generationsResult.count ?? 0;

  let totalCreditsSpent = 0;
  const creditsByDay = new Map<string, number>();

  for (let d = 6; d >= 0; d--) {
    const day = new Date(since);
    day.setDate(day.getDate() + d);
    const key = toDayKey(day);
    creditsByDay.set(key, 0);
  }

  for (const entry of ledger) {
    const amount = Math.abs(Number(entry.amount) || 0);
    totalCreditsSpent += amount;
    const key = toDayKey(new Date(entry.created_at as string));
    creditsByDay.set(key, (creditsByDay.get(key) ?? 0) + amount);
  }

  const days: UsageDay[] = [...creditsByDay.entries()].map(([date, credits]) => ({
    date,
    credits,
  }));

  return { days, totalCreditsSpent, totalGenerations };
}
