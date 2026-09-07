"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminOrOwner } from "@/lib/db/admin";

export interface AdminAlert {
  id: string;
  rule: string;
  severity: "info" | "warning" | "critical";
  message: string;
  details: Record<string, unknown> | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

const RULES = [
  {
    key: "high_failure_rate",
    severity: "critical" as const,
    threshold: 0.2,
    windowMinutes: 60,
    message: (rate: number) =>
      `Failure rate is ${(rate * 100).toFixed(1)}% in the last hour.`,
  },
  {
    key: "queue_depth",
    severity: "warning" as const,
    threshold: 10,
    windowMinutes: 0,
    message: (depth: number) =>
      `Queue depth is ${depth} non-terminal generations.`,
  },
  {
    key: "high_provider_spend",
    severity: "warning" as const,
    threshold: 10,
    windowMinutes: 60,
    message: (spend: number) =>
      `Provider spend is $${spend.toFixed(2)} in the last hour.`,
  },
  {
    key: "blocked_generations",
    severity: "warning" as const,
    threshold: 3,
    windowMinutes: 60,
    message: (count: number) =>
      `${count} generations were blocked in the last hour.`,
  },
];

export async function getActiveAlerts(): Promise<AdminAlert[]> {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_alerts")
    .select("*")
    .is("acknowledged_at", null)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map(mapRow);
}

export async function getAlertHistory(limit = 100): Promise<AdminAlert[]> {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_alerts")
    .select("*")
    .or("acknowledged_at.not.is.null,resolved_at.not.is.null")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(mapRow);
}

function mapRow(row: Record<string, unknown>): AdminAlert {
  return {
    id: row.id as string,
    rule: row.rule as string,
    severity: row.severity as "info" | "warning" | "critical",
    message: row.message as string,
    details: (row.details as Record<string, unknown> | null) ?? null,
    acknowledgedAt: (row.acknowledged_at as string | null) ?? null,
    resolvedAt: (row.resolved_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_alerts")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/admin/alerts");
}

export async function resolveAlert(alertId: string): Promise<void> {
  await requireAdminOrOwner();

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_alerts")
    .update({
      resolved_at: new Date().toISOString(),
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) throw error;

  revalidatePath("/admin");
  revalidatePath("/admin/alerts");
}

export async function checkAndCreateAlerts(): Promise<AdminAlert[]> {
  await requireAdminOrOwner();

  const service = createServiceClient();
  const now = new Date();

  const newAlerts: AdminAlert[] = [];

  for (const rule of RULES) {
    const since = new Date(now.getTime() - rule.windowMinutes * 60 * 1000);

    let triggered = false;
    let value = 0;

    if (rule.key === "high_failure_rate") {
      const { data } = await service
        .from("generations")
        .select("status")
        .gte("created_at", since.toISOString())
        .limit(1000);

      const total = (data ?? []).length;
      const failed = (data ?? []).filter(
        (g) => g.status === "failed" || g.status === "blocked"
      ).length;

      if (total > 0) {
        value = failed / total;
        triggered = value >= rule.threshold;
      }
    } else if (rule.key === "queue_depth") {
      const { count } = await service
        .from("generations")
        .select("*", { count: "exact", head: true })
        .not("status", "in", "(completed,failed,blocked,cancelled)");

      value = count ?? 0;
      triggered = value >= rule.threshold;
    } else if (rule.key === "high_provider_spend") {
      const { data } = await service
        .from("fal_usage_logs")
        .select("raw_cost_usd")
        .gte("created_at", since.toISOString())
        .limit(1000);

      value = (data ?? []).reduce(
        (sum, row) => sum + Number(row.raw_cost_usd ?? 0),
        0
      );
      triggered = value >= rule.threshold;
    } else if (rule.key === "blocked_generations") {
      const { count } = await service
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("status", "blocked")
        .gte("created_at", since.toISOString());

      value = count ?? 0;
      triggered = value >= rule.threshold;
    }

    if (triggered) {
      const message = rule.message(value);

      // Avoid duplicate unacknowledged alerts for the same rule.
      const { data: existing } = await service
        .from("admin_alerts")
        .select("id")
        .eq("rule", rule.key)
        .is("acknowledged_at", null)
        .is("resolved_at", null)
        .limit(1);

      if ((existing ?? []).length === 0) {
        const { data, error } = await service
          .from("admin_alerts")
          .insert({
            rule: rule.key,
            severity: rule.severity,
            message,
            details: { value, threshold: rule.threshold, window: rule.windowMinutes },
          })
          .select()
          .single();

        if (!error && data) {
          newAlerts.push(mapRow(data));
        }
      }
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/alerts");
  return newAlerts;
}
