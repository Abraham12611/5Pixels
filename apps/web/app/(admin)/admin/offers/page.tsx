import Link from "next/link";
import { listCampaignsWithMetrics, setCampaignStatus } from "@/lib/offers/admin";
import { CampaignStatusActions } from "@/components/admin/campaign-status-actions";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  live: "bg-lime-500/15 text-lime-400",
  paused: "bg-amber-500/15 text-amber-400",
  draft: "bg-charcoal-700 text-cream-100",
  scheduled: "bg-blue-500/15 text-blue-400",
  archived: "bg-charcoal-700/50 text-text-muted",
};

export default async function OffersPage() {
  const campaigns = await listCampaignsWithMetrics();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-cream-50 text-3xl font-bold">Offers</h1>
      </div>
      <p className="text-text-secondary mt-2">
        Promo campaigns, variant ladders, and conversion funnels.
      </p>

      <div className="border-cream-100/10 bg-charcoal-850 mt-8 overflow-hidden rounded-2xl border">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-cream-50 text-sm font-medium">
              No campaigns yet
            </p>
            <p className="text-text-secondary max-w-xs text-sm">
              Seed a campaign via migration, then manage it here.
            </p>
          </div>
        ) : (
          <ul className="divide-cream-100/10 divide-y">
            {campaigns.map((c) => {
              const convRate =
                c.metrics.impressions > 0
                  ? (
                      (c.metrics.conversions / c.metrics.impressions) *
                      100
                    ).toFixed(1)
                  : "—";
              return (
                <li key={c.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-cream-50 truncate font-semibold">
                        {c.name}
                      </p>
                      <p className="text-text-muted font-mono text-xs">
                        {c.slug}
                      </p>
                      <p className="text-text-muted mt-1 text-xs">
                        {c.audience.join(", ")} · {c.surfaces.join(", ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs",
                          STATUS_TONE[c.status]
                        )}
                      >
                        {c.status}
                      </span>
                      <CampaignStatusActions
                        campaignId={c.id}
                        status={c.status}
                        action={setCampaignStatus}
                      />
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/admin/offers/${c.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
                    {(
                      [
                        ["Impressions", c.metrics.impressions],
                        ["Accepts", c.metrics.accepts],
                        ["Declines", c.metrics.declines],
                        ["Checkouts", c.metrics.checkouts_started],
                        ["Conversions", c.metrics.conversions],
                        ["Conv. rate", `${convRate}%`],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="bg-charcoal-800/60 rounded-lg px-3 py-2"
                      >
                        <p className="text-text-muted text-[10px] uppercase tracking-wide">
                          {label}
                        </p>
                        <p className="text-cream-100 text-sm font-semibold">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-text-muted mt-2 text-xs">
                    Revenue attributed:{" "}
                    <span className="text-cream-100">
                      {formatPrice(c.metrics.revenue_cents)}
                    </span>
                    {c.metrics.refunds > 0 && (
                      <span className="text-amber-400">
                        {" "}
                        · {c.metrics.refunds} refund
                        {c.metrics.refunds === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
