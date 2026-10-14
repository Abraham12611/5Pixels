import { getPricingRouteStatus } from "@/lib/db/pricing-status";
import { requireAdminOrOwner } from "@/lib/db/admin";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function Badge({
  tone,
  children,
}: {
  tone: "green" | "red" | "amber" | "gray";
  children: React.ReactNode;
}) {
  const cls = {
    green: "bg-emerald-500/15 text-emerald-300",
    red: "bg-red-500/15 text-red-300",
    amber: "bg-amber-500/15 text-amber-300",
    gray: "bg-cream-100/10 text-text-secondary",
  }[tone];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

// Read-only pricing freshness/status view (#104). Wholesale provider prices
// and snapshot internals stay server-side — this surfaces only what an
// operator needs: freshness, quotability, and circuit-breaker state.
export default async function AdminPricingPage() {
  await requireAdminOrOwner();
  const rows = await getPricingRouteStatus();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold">Pricing</h1>
        <p className="text-text-secondary mt-2">
          Fal pricing freshness per route — read-only. Snapshots are written by
          the pricing-sync cron; a route without a fresh quotable snapshot fails
          closed.
        </p>
      </div>

      <section className="border-cream-100/10 bg-charcoal-850 overflow-x-auto rounded-2xl border p-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-text-secondary border-cream-100/10 border-b">
              <th className="pr-4 pb-3 font-medium">Endpoint</th>
              <th className="pr-4 pb-3 font-medium">Snapshot</th>
              <th className="pr-4 pb-3 font-medium">Fetched</th>
              <th className="pr-4 pb-3 font-medium">Expires</th>
              <th className="pr-4 pb-3 font-medium">Feed price</th>
              <th className="pb-3 font-medium">Route state</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.endpointId}
                className="border-cream-100/5 border-b last:border-0"
              >
                <td className="text-cream-100 py-3 pr-4 font-mono text-xs">
                  {r.endpointId}
                  {r.defined && (
                    <span
                      className="text-text-secondary ml-1"
                      title="verified pricing definition"
                    >
                      ✓
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {r.pricingType === "unsupported" ? (
                    <Badge tone="red">unsupported</Badge>
                  ) : r.quotable ? (
                    <Badge tone="green">{r.pricingType}</Badge>
                  ) : r.stale ? (
                    <Badge tone="amber">stale</Badge>
                  ) : (
                    <Badge tone="gray">none</Badge>
                  )}
                  {r.snapshotSource && (
                    <div className="text-text-secondary mt-1 text-xs">
                      {r.snapshotSource}
                    </div>
                  )}
                </td>
                <td className="text-text-secondary py-3 pr-4 text-xs">
                  {fmt(r.fetchedAt)}
                </td>
                <td className="text-text-secondary py-3 pr-4 text-xs">
                  {fmt(r.expiresAt)}
                </td>
                <td className="text-text-secondary py-3 pr-4 text-xs">
                  {r.coarseUnitPrice != null
                    ? `$${r.coarseUnitPrice}/${r.coarseUnit ?? "?"}`
                    : "—"}
                  {r.coarseLastSeen && (
                    <div className="mt-1">seen {fmt(r.coarseLastSeen)}</div>
                  )}
                </td>
                <td className="py-3">
                  {r.endpointState === "suspended" ? (
                    <Badge tone="red">
                      suspended{r.suspendReason ? `: ${r.suspendReason}` : ""}
                    </Badge>
                  ) : (
                    <Badge tone="gray">active</Badge>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-text-secondary py-6 text-center text-sm"
                >
                  No pricing data — the pricing-sync cron has not run yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
