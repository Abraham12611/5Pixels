import Link from "next/link";
import { requireAdmin } from "@/lib/db/admin";
import { getAdminGenerations } from "@/lib/db/generations-admin";
import { GenerationStatusBadge } from "@/components/admin/generation-status-badge";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminGenerationsPage() {
  await requireAdmin();
  const generations = await getAdminGenerations();

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Generation operations</h1>
        <p className="text-text-secondary mt-2">
          Recent generation jobs across all users.
        </p>
      </div>

      <div className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="text-text-secondary border-cream-100/10 border-b bg-charcoal-900/50">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Preset</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Latency</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-cream-100/10 divide-y">
              {generations.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-text-secondary px-4 py-8 text-center"
                  >
                    No generations yet.
                  </td>
                </tr>
              ) : (
                generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-charcoal-800/50 transition">
                    <td className="text-cream-100 px-4 py-3 font-mono text-xs">
                      {gen.id.slice(0, 8)}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      {gen.userEmail ?? gen.userId.slice(0, 8)}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      <span className="capitalize">{gen.productType}</span>
                      <span className="text-text-muted ml-1">
                        · {gen.productName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <GenerationStatusBadge status={gen.status} />
                    </td>
                    <td className="text-cream-100 px-4 py-3 font-mono text-xs">
                      {gen.providerEndpoint ? (
                        <span
                          className="max-w-[160px] truncate block"
                          title={gen.providerEndpoint}
                        >
                          {gen.providerEndpoint}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      {gen.actualCreditCost ?? gen.creditCost}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      {gen.providerCostUsd != null
                        ? formatCurrency(Math.round(gen.providerCostUsd * 100))
                        : "—"}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      {formatDuration(gen.latencyMs)}
                    </td>
                    <td className="text-cream-100 px-4 py-3">
                      {formatDate(gen.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/generations/${gen.id}`}
                        className="text-lime-400 hover:text-lime-300 text-xs font-medium transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
