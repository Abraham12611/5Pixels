import { requireAdmin } from "@/lib/db/admin";
import { getAdminDashboardStats } from "@/lib/db/dashboard";
import { getActiveAlerts } from "@/lib/db/alerts";
import { StatCard } from "@/components/admin/stat-card";
import Link from "next/link";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [stats, activeAlerts] = await Promise.all([
    getAdminDashboardStats(),
    getActiveAlerts(),
  ]);

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Admin dashboard</h1>
        <p className="text-text-secondary mt-2">
          Real-time overview of product, generations, and spend.
        </p>
      </div>

      {activeAlerts.length > 0 && (
        <section className="bg-rose-950/20 border-rose-500/30 mb-8 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-rose-200 text-lg font-semibold">
                {activeAlerts.length} active alert
                {activeAlerts.length === 1 ? "" : "s"}
              </h2>
              <p className="text-rose-300/80 mt-1 text-sm">
                {activeAlerts[0]?.message}
                {activeAlerts.length > 1 &&
                  ` and ${activeAlerts.length - 1} more`}
              </p>
            </div>
            <Link
              href="/admin/alerts"
              className="text-rose-200 hover:text-rose-100 text-sm font-medium transition"
            >
              View alerts →
            </Link>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">
          Generations today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Started"
            value={stats.generations.today}
            detail="New generation jobs"
          />
          <StatCard
            label="Completed"
            value={stats.generations.completedToday}
            variant="lime"
          />
          <StatCard
            label="Failed"
            value={stats.generations.failedToday}
            variant="danger"
          />
          <StatCard
            label="Blocked"
            value={stats.generations.blockedToday}
            variant="warning"
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">
          Queue & quality
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Queue depth"
            value={stats.generations.queueDepth}
            detail="Currently processing"
          />
          <StatCard
            label="Success rate"
            value={formatPercent(stats.generations.successRate)}
            detail="Completed / resolved today"
          />
          <StatCard
            label="Spend today"
            value={formatCurrency(stats.spend.todayCents)}
            detail="Provider cost (USD)"
          />
          <StatCard
            label="Active subscriptions"
            value={stats.catalog.activeSubscriptions}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">Catalog</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active products"
            value={stats.catalog.activeProducts}
          />
          <StatCard
            label="Active versions"
            value={stats.catalog.activeVersions}
          />
          <StatCard label="Total users" value={stats.catalog.totalUsers} />
          <StatCard
            label="Active subscriptions"
            value={stats.catalog.activeSubscriptions}
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-100 mb-4 text-lg font-semibold">
            Top presets
          </h2>
          {stats.topPresets.length === 0 ? (
            <p className="text-text-secondary">No generations yet.</p>
          ) : (
            <ul className="divide-cream-100/10 divide-y">
              {stats.topPresets.map((preset) => (
                <li
                  key={preset.productId}
                  className="flex items-center justify-between py-3"
                >
                  <Link
                    href={`/admin/filters/${preset.productId}`}
                    className="text-cream-100 hover:text-lime-400 font-medium transition"
                  >
                    {preset.name}
                  </Link>
                  <span className="text-text-muted text-sm">
                    {preset.count} generation{preset.count === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-100 mb-4 text-lg font-semibold">
            Recent publishes
          </h2>
          {stats.recentPublishes.length === 0 ? (
            <p className="text-text-secondary">No published versions yet.</p>
          ) : (
            <ul className="divide-cream-100/10 divide-y">
              {stats.recentPublishes.map((version) => (
                <li
                  key={version.versionId}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <Link
                      href={`/admin/filters/${version.productId}`}
                      className="text-cream-100 hover:text-lime-400 font-medium transition"
                    >
                      {version.name}
                    </Link>
                    <p className="text-text-muted text-sm">
                      v{version.versionNumber} ·{" "}
                      <span className="font-mono">{version.slug}</span>
                    </p>
                  </div>
                  <span className="text-text-muted text-sm">
                    {formatDate(version.publishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="border-cream-100/10 bg-charcoal-850 mt-8 rounded-2xl border p-6">
        <h2 className="text-cream-100 mb-4 text-lg font-semibold">
          Provider status
        </h2>
        {stats.providerStatus.length === 0 ? (
          <p className="text-text-secondary">No provider usage today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-text-secondary border-cream-100/10 border-b">
                  <th className="py-2 font-medium">Endpoint</th>
                  <th className="py-2 font-medium">Calls today</th>
                  <th className="py-2 font-medium">Cost today</th>
                </tr>
              </thead>
              <tbody className="divide-cream-100/10 divide-y">
                {stats.providerStatus.map((provider) => (
                  <tr key={provider.endpointId}>
                    <td className="text-cream-100 py-3 font-mono">
                      {provider.endpointId}
                    </td>
                    <td className="text-cream-100 py-3">
                      {provider.callsToday}
                    </td>
                    <td className="text-cream-100 py-3">
                      {formatCurrency(Math.round(provider.costTodayUsd * 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
