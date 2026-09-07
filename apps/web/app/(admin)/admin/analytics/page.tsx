import { requireAdminOrOwner } from "@/lib/db/admin";
import { getAdminAnalytics } from "@/lib/db/analytics";

function currency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function percent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-5">
      <p className="text-text-muted text-xs font-medium uppercase">{label}</p>
      <p className="text-cream-50 mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TrendChart({ points }: { points: { date: string; count: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className="space-y-2">
      {points.map((p) => (
        <div key={p.date} className="flex items-center gap-3">
          <span className="text-text-muted w-24 text-xs">{formatDate(p.date)}</span>
          <div className="flex-1">
            <div
              className="bg-lime-500 h-4 rounded-full"
              style={{
                width: `${(p.count / max) * 100}%`,
              }}
            />
          </div>
          <span className="text-cream-100 w-8 text-right text-sm">{p.count}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAdminOrOwner();
  const data = await getAdminAnalytics();

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Analytics</h1>
        <p className="text-text-secondary mt-2">
          Product, provider, and credit metrics for the last 30 days.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total generations (30d)" value={data.summary.total30d.toString()} />
        <Stat label="Success rate" value={percent(data.summary.successRate)} />
        <Stat label="Queue depth" value={data.summary.queueDepth.toString()} />
        <Stat
          label="Provider spend (30d)"
          value={currency(data.spend.providerSpend30d)}
        />
        <Stat
          label="Provider spend (7d)"
          value={currency(data.spend.providerSpend7d)}
        />
        <Stat
          label="Provider spend (today)"
          value={currency(data.spend.providerSpendToday)}
        />
        <Stat
          label="Credits reserved (30d)"
          value={data.spend.creditsReserved30d.toFixed(2)}
        />
        <Stat
          label="Credits debited (30d)"
          value={data.spend.creditsDebit30d.toFixed(2)}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-100 text-lg font-semibold">Generation trend (7d)</h2>
          <div className="mt-4">
            <TrendChart points={data.trend} />
          </div>
        </section>

        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-100 text-lg font-semibold">Top products by volume</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-text-secondary border-cream-100/10 border-b">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Completed</th>
                  <th className="pb-2 font-medium">Failed</th>
                  <th className="pb-2 font-medium">Avg cost</th>
                </tr>
              </thead>
              <tbody className="divide-cream-100/10 divide-y">
                {data.products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-text-secondary py-6 text-center"
                    >
                      No generation data.
                    </td>
                  </tr>
                ) : (
                  data.products.slice(0, 10).map((p) => (
                    <tr key={p.productId} className="hover:bg-charcoal-800/50 transition">
                      <td className="py-3">
                        <span className="text-cream-100">{p.productName}</span>
                        <span className="text-text-muted ml-2 text-xs capitalize">
                          {p.productType}
                        </span>
                      </td>
                      <td className="py-3 text-cream-100">{p.total}</td>
                      <td className="py-3 text-lime-400">{p.completed}</td>
                      <td className="py-3 text-rose-400">
                        {p.failed + p.blocked}
                      </td>
                      <td className="py-3 text-cream-100">
                        {p.avgCreditCost.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-100 text-lg font-semibold">Provider endpoints</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-text-secondary border-cream-100/10 border-b">
                  <th className="pb-2 font-medium">Endpoint</th>
                  <th className="pb-2 font-medium">Calls</th>
                  <th className="pb-2 font-medium">Raw cost</th>
                  <th className="pb-2 font-medium">Compute (s)</th>
                </tr>
              </thead>
              <tbody className="divide-cream-100/10 divide-y">
                {data.endpoints.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-text-secondary py-6 text-center">
                      No provider usage.
                    </td>
                  </tr>
                ) : (
                  data.endpoints.map((e) => (
                    <tr key={e.endpointId} className="hover:bg-charcoal-800/50 transition">
                      <td className="py-3 font-mono text-xs text-cream-100">
                        {e.endpointId}
                      </td>
                      <td className="py-3 text-cream-100">{e.calls}</td>
                      <td className="py-3 text-cream-100">
                        {currency(e.rawCost)}
                      </td>
                      <td className="py-3 text-cream-100">
                        {e.computeSeconds.toFixed(1)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
          <h2 className="text-cream-100 text-lg font-semibold">Failure codes</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-text-secondary border-cream-100/10 border-b">
                  <th className="pb-2 font-medium">Code</th>
                  <th className="pb-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody className="divide-cream-100/10 divide-y">
                {data.failures.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-text-secondary py-6 text-center">
                      No failures recorded.
                    </td>
                  </tr>
                ) : (
                  data.failures.map((f) => (
                    <tr key={f.code} className="hover:bg-charcoal-800/50 transition">
                      <td className="py-3 font-mono text-xs text-cream-100">
                        {f.code}
                      </td>
                      <td className="py-3 text-cream-100">{f.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
