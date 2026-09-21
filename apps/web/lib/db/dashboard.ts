"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "./admin";

export interface AdminDashboardStats {
  generations: {
    today: number;
    completedToday: number;
    failedToday: number;
    blockedToday: number;
    queueDepth: number;
    successRate: number;
  };
  spend: {
    todayUsd: number;
    todayCents: number;
  };
  catalog: {
    activeProducts: number;
    activeVersions: number;
    totalUsers: number;
    activeSubscriptions: number;
  };
  topPresets: Array<{
    productId: string;
    name: string;
    slug: string;
    count: number;
  }>;
  recentPublishes: Array<{
    productId: string;
    versionId: string;
    name: string;
    slug: string;
    versionNumber: number;
    publishedAt: string;
  }>;
  providerStatus: Array<{
    endpointId: string;
    callsToday: number;
    costTodayUsd: number;
  }>;
}

function startOfToday(): string {
  const now = new Date();
  return `${now.toISOString().slice(0, 10)}T00:00:00Z`;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await requireAdmin();

  const supabase = createServiceClient();
  const today = startOfToday();

  const [
    { count: generationsToday },
    { count: completedToday },
    { count: failedToday },
    { count: blockedToday },
    { count: queueDepth },
    { data: falUsageToday },
    { data: topPresetsRaw },
    { data: recentPublishesRaw },
    { count: activeProductsCount },
    { count: activeVersionsCount },
    { count: totalUsersCount },
    { count: activeSubscriptionsCount },
  ] = await Promise.all([
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("created_at", today),
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", today),
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("status", "blocked")
      .gte("created_at", today),
    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .in("status", [
        "validating",
        "queued",
        "generating",
        "post_processing",
      ]),
    supabase
      .from("fal_usage_logs")
      .select("endpoint_id, raw_cost_usd")
      .gte("created_at", today),
    supabase
      .from("generations")
      .select(
        `
        product_id,
        products(id, name, slug)
      `
      )
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("product_versions")
      .select(
        `
        id,
        version_number,
        published_at,
        products(id, name, slug)
      `
      )
      .eq("state", "active")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(5),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("public_status", "active"),
    supabase
      .from("product_versions")
      .select("*", { count: "exact", head: true })
      .eq("state", "active")
      .not("published_at", "is", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const resolvedToday =
    (completedToday ?? 0) + (failedToday ?? 0) + (blockedToday ?? 0);
  const successRate =
    resolvedToday > 0
      ? Math.round(((completedToday ?? 0) / resolvedToday) * 100)
      : 0;

  const spendTodayUsd = (falUsageToday ?? []).reduce(
    (sum, row) => sum + Number(row.raw_cost_usd ?? 0),
    0
  );

  const providerMap = new Map<string, { calls: number; cost: number }>();
  for (const row of falUsageToday ?? []) {
    const endpointId = row.endpoint_id || "unknown";
    const existing = providerMap.get(endpointId) ?? { calls: 0, cost: 0 };
    existing.calls += 1;
    existing.cost += Number(row.raw_cost_usd ?? 0);
    providerMap.set(endpointId, existing);
  }

  const providerStatus = Array.from(providerMap.entries())
    .map(([endpointId, { calls, cost }]) => ({
      endpointId,
      callsToday: calls,
      costTodayUsd: cost,
    }))
    .sort((a, b) => b.costTodayUsd - a.costTodayUsd);

  const topPresets = aggregateTopPresets(topPresetsRaw ?? []);

  const recentPublishes = (recentPublishesRaw ?? []).map((row) => {
    const product = (row.products as unknown as
      | Array<{ id: string; name: string; slug: string }>
      | null)?.[0];
    if (!product) return null;
    return {
      productId: product.id,
      versionId: row.id as string,
      name: product.name,
      slug: product.slug,
      versionNumber: row.version_number as number,
      publishedAt: row.published_at as string,
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    generations: {
      today: generationsToday ?? 0,
      completedToday: completedToday ?? 0,
      failedToday: failedToday ?? 0,
      blockedToday: blockedToday ?? 0,
      queueDepth: queueDepth ?? 0,
      successRate,
    },
    spend: {
      todayUsd: spendTodayUsd,
      todayCents: Math.round(spendTodayUsd * 100),
    },
    catalog: {
      activeProducts: activeProductsCount ?? 0,
      activeVersions: activeVersionsCount ?? 0,
      totalUsers: totalUsersCount ?? 0,
      activeSubscriptions: activeSubscriptionsCount ?? 0,
    },
    topPresets,
    recentPublishes,
    providerStatus,
  };
}

function aggregateTopPresets(
  rows: Array<{
    product_id: string;
    products: Array<{ id: string; name: string; slug: string }> | null;
  }>
): AdminDashboardStats["topPresets"] {
  const counts = new Map<
    string,
    { productId: string; name: string; slug: string; count: number }
  >();

  for (const row of rows) {
    const product = row.products?.[0];
    if (!product) continue;

    const existing = counts.get(product.id);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(product.id, {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        count: 1,
      });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
