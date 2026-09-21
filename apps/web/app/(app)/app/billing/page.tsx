import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBillingData, getCreditPeriodSummary } from "@/lib/db/billing";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getActivePlan } from "@/lib/billing/entitlements";
import { getMyProfile } from "@/lib/profile/actions";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { CreditMeter } from "@/components/consumer/five-pixel";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Coins,
  Receipt,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
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

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/billing");
  }

  const [billing, balance, activePlan, summary, profile] = await Promise.all([
    getBillingData(),
    getUserCreditBalance(),
    getActivePlan(),
    getCreditPeriodSummary(),
    getMyProfile(),
  ]);

  if (!billing) {
    redirect("/login");
  }

  const name =
    profile?.display_name ??
    (user.user_metadata?.name as string | null) ??
    "Your account";
  const email = profile?.email ?? user.email ?? "";

  // Min preset cost ≈ cheapest transformation; balance below that is "low".
  const { data: cheapest } = await supabase
    .from("product_versions")
    .select("credit_cost")
    .eq("state", "active")
    .order("credit_cost", { ascending: true })
    .limit(1)
    .maybeSingle();
  const lowCreditAt = Number(cheapest?.credit_cost ?? 5) || 5;

  const isOut = balance <= 0;
  const isLow = !isOut && balance <= lowCreditAt;
  const meterTone = isOut ? "error" : isLow ? "warning" : "default";
  const planName = activePlan?.name ?? null;
  const renews = formatDate(
    billing.activeSubscription?.current_period_end ??
      activePlan?.currentPeriodEnd ??
      null
  );
  const meterMax = activePlan?.creditsGrant ?? null;
  const buyCreditsHref = activePlan
    ? "/app/billing/plan#top-up"
    : "/pricing";

  const usageMetrics = [
    { label: "Credits used", value: summary?.creditsUsed ?? 0 },
    { label: "Transformations", value: summary?.transformations ?? 0 },
    { label: "Credits released", value: summary?.creditsReleased ?? 0 },
    { label: "Credits remaining", value: balance },
  ];

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Billing</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Your plan, credits, and billing records.
          </p>
        </div>

        {/* Balance hero */}
        <SettingCard className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-px",
              isOut
                ? "bg-error/60"
                : isLow
                  ? "bg-warning/60"
                  : "bg-lime-500/40"
            )}
          />
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
            <div className="min-w-0">
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                Credit balance
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-cream-50 text-5xl leading-none tracking-tight tabular-nums sm:text-6xl">
                  {balance.toLocaleString()}
                </span>
                <span className="text-text-secondary text-sm">
                  {meterMax
                    ? `of ${meterMax.toLocaleString()} credits left`
                    : "credits left"}
                </span>
              </p>
              <p
                className={cn(
                  "mt-3 text-sm",
                  isOut
                    ? "text-error"
                    : isLow
                      ? "text-warning"
                      : "text-text-secondary"
                )}
              >
                {isOut
                  ? "You're out of credits — top up to keep generating."
                  : isLow
                    ? "Running low — you may run out before your next reset."
                    : renews
                      ? `Resets ${renews}`
                      : "Credits don't expire while your account is active."}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild variant={isOut || isLow ? "brand" : "secondary"}>
                  <Link href={buyCreditsHref}>Buy credits</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/app/billing/credits">View usage</Link>
                </Button>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <CreditMeter
                balance={balance}
                max={meterMax}
                tone={meterTone}
                className="scale-150 origin-bottom-right"
              />
              <p className="text-text-muted text-xs">
                {meterMax
                  ? `${Math.round((balance / meterMax) * 100)}% of this cycle's credits`
                  : "Each bar is ~10 credits"}
              </p>
            </div>
          </div>
        </SettingCard>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current plan */}
          <SettingCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                  Current plan
                </p>
                <p className="font-display text-cream-50 mt-2 text-2xl leading-tight">
                  {planName ?? "Free"}
                </p>
                <p className="text-text-secondary mt-1.5 text-sm">
                  {planName
                    ? renews
                      ? `Renews ${renews}`
                      : "Active"
                    : "Upgrade for more credits and premium looks."}
                </p>
              </div>
              {billing.dodoCustomerId && planName ? (
                <form action="/api/billing/portal" method="post">
                  <Button type="submit" variant="secondary" size="sm">
                    Manage plan
                  </Button>
                </form>
              ) : !planName ? (
                <Button asChild size="sm" variant="brand">
                  <Link href="/pricing">Upgrade</Link>
                </Button>
              ) : null}
            </div>
          </SettingCard>

          {/* Usage summary */}
          <SettingCard
            title={summary?.isBillingCycle ? "This billing cycle" : "This month"}
          >
            <div className="grid grid-cols-2 gap-3">
              {usageMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="border-cream-100/10 bg-charcoal-800/60 rounded-[10px] border p-3"
                >
                  <p className="text-cream-50 text-lg font-semibold tabular-nums">
                    {metric.value.toLocaleString()}
                  </p>
                  <p className="text-text-secondary mt-0.5 text-xs">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </SettingCard>
        </div>

        {/* Section nav cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              href: "/app/billing/plan",
              icon: Crown,
              label: "Plan",
              hint: planName
                ? `${planName} · manage or change`
                : "See plans and upgrade",
            },
            {
              href: "/app/billing/credits",
              icon: Coins,
              label: "Credit history",
              hint: "Usage and credit activity",
            },
            {
              href: "/app/billing/history",
              icon: Receipt,
              label: "Billing history",
              hint: "Invoices and payment methods",
            },
          ].map(({ href, icon: ItemIcon, label, hint }) => (
            <Link key={href} href={href} className="group">
              <div className="border-cream-100/10 bg-charcoal-850 group-hover:border-lime-500/30 flex h-full items-center justify-between gap-3 rounded-[15px] border p-5 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="bg-charcoal-800 text-text-secondary group-hover:text-lime-300 rounded-[10px] p-2.5 transition-colors">
                    <ItemIcon size={18} />
                  </span>
                  <div>
                    <p className="text-cream-50 text-sm font-medium">{label}</p>
                    <p className="text-text-muted mt-0.5 text-xs">{hint}</p>
                  </div>
                </div>
                <CaretRight
                  size={16}
                  className="text-text-muted group-hover:text-cream-100 transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SettingsShell>
  );
}
