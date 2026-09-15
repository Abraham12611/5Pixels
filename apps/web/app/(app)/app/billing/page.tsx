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
  Warning,
} from "@phosphor-icons/react/dist/ssr";

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

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Billing</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Your plan, credits, and billing records.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current plan */}
          <SettingCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                  Current plan
                </p>
                <p className="text-cream-50 mt-1 text-lg font-semibold">
                  {planName ?? "Free"}
                </p>
                <p className="text-text-secondary mt-1 text-sm">
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
                <Button asChild size="sm">
                  <Link href="/pricing">Upgrade</Link>
                </Button>
              ) : null}
            </div>
          </SettingCard>

          {/* Credits */}
          <SettingCard>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                  Credits
                </p>
                <p className="text-cream-50 mt-1 text-lg font-semibold">
                  {meterMax
                    ? `${balance} of ${meterMax.toLocaleString()} credits left`
                    : `${balance} credits left`}
                </p>
                <p className="text-text-secondary mt-1 text-sm">
                  {isOut
                    ? "Add credits to keep generating."
                    : isLow
                      ? "You may run out before your next reset."
                      : renews
                        ? `Resets ${renews}`
                        : "Credits don't expire while your account is active."}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
                {isLow && (
                  <Warning size={18} className="text-warning" weight="fill" />
                )}
                <CreditMeter
                  balance={balance}
                  max={meterMax}
                  tone={meterTone}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant={isOut ? "brand" : "secondary"}>
                <Link href={buyCreditsHref}>Buy credits</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/app/billing/credits">View usage</Link>
              </Button>
            </div>
          </SettingCard>
        </div>

        {/* Usage summary */}
        <SettingCard
          title={
            summary?.isBillingCycle
              ? "This billing cycle"
              : "This month"
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="border-cream-100/10 bg-charcoal-800/60 rounded-[10px] border p-3.5">
              <p className="text-cream-50 text-xl font-semibold">
                {summary?.creditsUsed ?? 0}
              </p>
              <p className="text-text-secondary mt-0.5 text-xs">Credits used</p>
            </div>
            <div className="border-cream-100/10 bg-charcoal-800/60 rounded-[10px] border p-3.5">
              <p className="text-cream-50 text-xl font-semibold">
                {summary?.transformations ?? 0}
              </p>
              <p className="text-text-secondary mt-0.5 text-xs">
                Transformations
              </p>
            </div>
            <div className="border-cream-100/10 bg-charcoal-800/60 rounded-[10px] border p-3.5">
              <p className="text-cream-50 text-xl font-semibold">
                {summary?.creditsReleased ?? 0}
              </p>
              <p className="text-text-secondary mt-0.5 text-xs">
                Credits released
              </p>
            </div>
            <div className="border-cream-100/10 bg-charcoal-800/60 rounded-[10px] border p-3.5">
              <p className="text-cream-50 text-xl font-semibold">{balance}</p>
              <p className="text-text-secondary mt-0.5 text-xs">
                Credits remaining
              </p>
            </div>
          </div>
        </SettingCard>

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
              <div className="border-cream-100/10 bg-charcoal-850 group-hover:border-cream-100/20 flex h-full items-center justify-between gap-3 rounded-[15px] border p-5 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="bg-charcoal-800 text-text-secondary rounded-[10px] p-2.5">
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
