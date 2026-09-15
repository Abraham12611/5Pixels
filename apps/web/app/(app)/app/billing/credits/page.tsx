import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCreditActivity, getCreditPeriodSummary } from "@/lib/db/billing";
import { getActivePlan } from "@/lib/billing/entitlements";
import { getMyProfile } from "@/lib/profile/actions";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { CreditMeter } from "@/components/consumer/five-pixel";
import { Button } from "@/components/ui/button";
import { Coins } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-lime-500/10 text-lime-300",
  Failed: "bg-error/10 text-error",
  "In progress": "bg-warning/10 text-warning",
  Purchase: "bg-cream-100/10 text-cream-100",
  "Plan credits": "bg-cream-100/10 text-cream-100",
  Adjustment: "bg-cream-100/10 text-text-secondary",
};

export default async function BillingCreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/billing/credits");
  }

  const [summary, activity, activePlan, profile] = await Promise.all([
    getCreditPeriodSummary(),
    getCreditActivity(),
    getActivePlan(),
    getMyProfile(),
  ]);

  const name =
    profile?.display_name ??
    (user.user_metadata?.name as string | null) ??
    "Your account";
  const email = profile?.email ?? user.email ?? "";

  const balance = summary?.balance ?? 0;
  const meterMax = activePlan?.creditsGrant ?? null;
  const resets = formatDate(summary?.periodEnd ?? null);
  const isOut = balance <= 0;

  const metrics = [
    { label: "Credits used", value: summary?.creditsUsed ?? 0 },
    { label: "Transformations completed", value: summary?.transformations ?? 0 },
    { label: "Credits released", value: summary?.creditsReleased ?? 0 },
    { label: "Credits remaining", value: balance },
  ];

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-cream-50 text-xl font-semibold">Credits</h1>
            <p className="text-text-secondary mt-1 text-sm">
              How your credits are earned and spent.
            </p>
          </div>
          <span className="border-cream-100/10 bg-charcoal-850 text-text-secondary rounded-full border px-3.5 py-1.5 text-xs font-medium">
            {summary?.isBillingCycle ? "This billing cycle" : "This month"}
          </span>
        </div>

        {/* Balance card */}
        <SettingCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-cream-50 text-3xl font-semibold">
                {balance}{" "}
                <span className="text-text-secondary text-base font-normal">
                  credits left
                </span>
              </p>
              <p className="text-text-secondary mt-1 text-sm">
                {isOut
                  ? "Add credits to keep generating."
                  : resets
                    ? `Resets ${resets}`
                    : "Credits don't expire while your account is active."}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <CreditMeter
                balance={balance}
                max={meterMax}
                tone={isOut ? "error" : "default"}
              />
              <Button asChild size="sm" variant={isOut ? "brand" : "secondary"}>
                <Link
                  href={activePlan ? "/app/billing/plan#top-up" : "/pricing"}
                >
                  Buy credits
                </Link>
              </Button>
            </div>
          </div>
        </SettingCard>

        {/* Metric tiles */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="border-cream-100/10 bg-charcoal-850 rounded-[15px] border p-4"
            >
              <p className="text-cream-50 text-2xl font-semibold">
                {metric.value}
              </p>
              <p className="text-text-secondary mt-1 text-xs">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Credit ledger */}
        <SettingCard title="Credit activity">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="bg-charcoal-800 text-text-muted rounded-[15px] p-4">
                <Coins size={24} />
              </span>
              <p className="text-cream-50 mt-4 text-sm font-medium">
                No usage history yet
              </p>
              <p className="text-text-secondary mt-1 max-w-xs text-sm">
                Credit activity will appear here after your first
                transformation.
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link href="/explore">Explore looks</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-cream-100/10 divide-y">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-cream-50 truncate text-sm font-medium">
                      {entry.label}
                    </p>
                    <p className="text-text-muted mt-0.5 text-xs">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        STATUS_STYLES[entry.statusLabel] ??
                          "bg-cream-100/10 text-text-secondary"
                      )}
                    >
                      {entry.statusLabel}
                    </span>
                    <span
                      className={cn(
                        "w-32 text-right text-sm font-medium tabular-nums",
                        entry.kind === "released" || entry.kind === "added"
                          ? "text-lime-300"
                          : "text-cream-50"
                      )}
                    >
                      {entry.kind === "released"
                        ? `${entry.amount} credits released`
                        : `${entry.amount > 0 ? "+" : "−"}${Math.abs(entry.amount)} credits`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SettingCard>
      </div>
    </SettingsShell>
  );
}
