"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminOrOwner } from "@/lib/db/admin";

export interface AdminAnalytics {
  summary: {
    total30d: number;
    completed30d: number;
    failed30d: number;
    blocked30d: number;
    successRate: number;
    queueDepth: number;
  };
  spend: {
    providerSpendToday: number;
    providerSpend7d: number;
    providerSpend30d: number;
    creditsReserved30d: number;
    creditsDebit30d: number;
    creditsRefund30d: number;
  };
  products: ProductAnalytics[];
  failures: FailureAnalytics[];
  endpoints: EndpointAnalytics[];
  trend: TrendPoint[];
}

export interface ProductAnalytics {
  productId: string;
  productName: string;
  productType: string;
  total: number;
  completed: number;
  failed: number;
  blocked: number;
  creditsReserved: number;
  creditsDebit: number;
  creditsRefund: number;
  avgCreditCost: number;
}

export interface FailureAnalytics {
  code: string;
  count: number;
}

export interface EndpointAnalytics {
  endpointId: string;
  calls: number;
  rawCost: number;
  computeSeconds: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

function startOfDay(offsetDays = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d;
}

function iso(d: Date): string {
  return d.toISOString();
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  await requireAdminOrOwner();

  const service = createServiceClient();
  const since = startOfDay(30);
  const since7 = startOfDay(7);
  const today = startOfDay(0);

  const [{ data: generations }, { data: productRows }, { data: falUsage }, { data: ledger }] =
    await Promise.all([
      service
        .from("generations")
        .select("product_id, status, failure_code, credit_cost, created_at")
        .gte("created_at", iso(since))
        .limit(10000),
      service
        .from("products")
        .select("id, name, type"),
      service
        .from("fal_usage_logs")
        .select("endpoint_id, raw_cost_usd, compute_seconds, created_at")
        .gte("created_at", iso(since))
        .limit(10000),
      service
        .from("credit_ledger")
        .select("entry_type, amount, created_at")
        .gte("created_at", iso(since))
        .limit(10000),
    ]);

  // Queue depth: non-terminal generations created before now.
  const { count: queueDepth } = await service
    .from("generations")
    .select("*", { count: "exact", head: true })
    .not("status", "in", "(completed,failed,blocked,cancelled)");

  // Product map.
  const productMap = new Map<string, { name: string; type: string }>();
  for (const p of productRows ?? []) {
    productMap.set(p.id as string, {
      name: (p.name as string) ?? "Unknown",
      type: (p.type as string) ?? "filter",
    });
  }

  // Product aggregation.
  const productStats = new Map<string, ProductAnalytics>();
  for (const g of generations ?? []) {
    const pid = g.product_id as string;
    const p = productMap.get(pid) ?? { name: "Unknown", type: "filter" };
    const existing = productStats.get(pid);
    if (!existing) {
      productStats.set(pid, {
        productId: pid,
        productName: p.name,
        productType: p.type,
        total: 0,
        completed: 0,
        failed: 0,
        blocked: 0,
        creditsReserved: 0,
        creditsDebit: 0,
        creditsRefund: 0,
        avgCreditCost: 0,
      });
    }

    const stats = productStats.get(pid)!;
    stats.total++;
    if (g.status === "completed") stats.completed++;
    if (g.status === "failed") stats.failed++;
    if (g.status === "blocked") stats.blocked++;
    stats.creditsReserved += Number(g.credit_cost ?? 0);
  }

  // Ledger aggregation by product is not linked, so we use global credit stats.
  let creditsReserved30d = 0;
  let creditsDebit30d = 0;
  let creditsRefund30d = 0;

  for (const l of ledger ?? []) {
    const type = l.entry_type as string;
    const amount = Number(l.amount ?? 0);
    if (type === "reservation") creditsReserved30d += amount;
    if (type === "debit") creditsDebit30d += amount;
    if (type === "refund") creditsRefund30d += amount;
  }

  // Failure code aggregation.
  const failureCounts = new Map<string, number>();
  for (const g of generations ?? []) {
    if (g.failure_code) {
      failureCounts.set(
        g.failure_code as string,
        (failureCounts.get(g.failure_code as string) ?? 0) + 1
      );
    }
  }

  const failures: FailureAnalytics[] = [...failureCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  // Endpoint aggregation.
  const endpointStats = new Map<string, EndpointAnalytics>();
  let providerSpendToday = 0;
  let providerSpend7d = 0;
  let providerSpend30d = 0;

  for (const u of falUsage ?? []) {
    const endpoint = (u.endpoint_id as string) ?? "unknown";
    const cost = Number(u.raw_cost_usd ?? 0);
    const compute = Number(u.compute_seconds ?? 0);
    const created = new Date(u.created_at as string);

    if (!endpointStats.has(endpoint)) {
      endpointStats.set(endpoint, {
        endpointId: endpoint,
        calls: 0,
        rawCost: 0,
        computeSeconds: 0,
      });
    }

    const s = endpointStats.get(endpoint)!;
    s.calls++;
    s.rawCost += cost;
    s.computeSeconds += compute;

    providerSpend30d += cost;
    if (created >= since7) providerSpend7d += cost;
    if (created >= today) providerSpendToday += cost;
  }

  const endpoints = [...endpointStats.values()].sort(
    (a, b) => b.rawCost - a.rawCost
  );

  // Trend: last 7 days.
  const trend = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(i);
    trend.set(d.toISOString().slice(0, 10), 0);
  }

  for (const g of generations ?? []) {
    const created = new Date(g.created_at as string).toISOString().slice(0, 10);
    if (trend.has(created)) {
      trend.set(created, (trend.get(created) ?? 0) + 1);
    }
  }

  const trendPoints: TrendPoint[] = [...trend.entries()].map(([date, count]) => ({
    date,
    count,
  }));

  // Final product stats.
  for (const s of productStats.values()) {
    const completedCount = s.completed;
    s.avgCreditCost =
      completedCount > 0 ? Math.round((s.creditsReserved / completedCount) * 100) / 100 : 0;
  }

  const products = [...productStats.values()].sort((a, b) => b.total - a.total);

  const completed30d = (generations ?? []).filter((g) => g.status === "completed").length;
  const failed30d = (generations ?? []).filter((g) => g.status === "failed").length;
  const blocked30d = (generations ?? []).filter((g) => g.status === "blocked").length;
  const resolved = completed30d + failed30d + blocked30d;
  const successRate = resolved > 0 ? (completed30d / resolved) * 100 : 0;

  return {
    summary: {
      total30d: generations?.length ?? 0,
      completed30d,
      failed30d,
      blocked30d,
      successRate: Math.round(successRate * 10) / 10,
      queueDepth: queueDepth ?? 0,
    },
    spend: {
      providerSpendToday,
      providerSpend7d,
      providerSpend30d,
      creditsReserved30d,
      creditsDebit30d,
      creditsRefund30d,
    },
    products,
    failures,
    endpoints,
    trend: trendPoints,
  };
}
