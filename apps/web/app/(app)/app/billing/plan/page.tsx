import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBillingData } from "@/lib/db/billing";
import { getPlansForPurchase } from "@/lib/db/plans";
import { getActivePlan } from "@/lib/billing/entitlements";
import { getMyProfile } from "@/lib/profile/actions";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { Button } from "@/components/ui/button";
import { Check, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function planBenefits(markup: number, creditsGrant: number): string[] {
  const benefits = [
    `${creditsGrant.toLocaleString()} credits every month`,
    "Top up extra credits anytime",
    "Failed transformations release credits back automatically",
  ];
  if (markup <= 2.5) {
    benefits.push("Lower credit cost per transformation");
  } else if (markup <= 3.5) {
    benefits.push("Better credit rates than starter plans");
  }
  return benefits.slice(0, 4);
}

export default async function BillingPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/billing/plan");
  }

  const [billing, plans, activePlan, profile] = await Promise.all([
    getBillingData(),
    getPlansForPurchase(),
    getActivePlan(),
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

  const monthlyPlans = plans.filter((p) => p.type === "monthly");
  const weeklyPlans = plans.filter((p) => p.type === "weekly_trial");
  const extraCreditPlan = plans.find((p) => p.type === "extra_credit");
  const isSubscriber = Boolean(
    billing.activeSubscription && activePlan?.type === "monthly"
  );
  const renewal = formatDate(
    billing.activeSubscription?.current_period_end ?? null
  );
  const subPlan = Array.isArray(billing.activeSubscription?.plan)
    ? billing.activeSubscription.plan[0]
    : billing.activeSubscription?.plan;
  const cadence =
    subPlan?.interval === "monthly"
      ? "Billed monthly"
      : billing.activeSubscription?.trial
        ? "Weekly trial"
        : null;
  const cancelsAt = billing.activeSubscription?.cancel_at_period_end;

  // Most credits per dollar earns the "Best value" tag.
  const bestValuePlanId =
    monthlyPlans.length > 0
      ? monthlyPlans.reduce((best, p) =>
          p.credits_grant / Math.max(1, p.price_cents) >
          best.credits_grant / Math.max(1, best.price_cents)
            ? p
            : best
        ).id
      : null;

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Plan</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Your current plan and what it includes.
          </p>
        </div>

        {/* Current plan */}
        <SettingCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                Current plan
              </p>
              <p className="font-display text-cream-50 mt-2 text-3xl leading-tight">
                {activePlan?.name ?? "Free"}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {activePlan ? (
                  <>
                    {cadence && (
                      <span className="border-cream-100/10 bg-charcoal-800 text-text-secondary rounded-full border px-2.5 py-1 text-xs font-medium">
                        {cadence}
                      </span>
                    )}
                    {cancelsAt ? (
                      <span className="bg-warning/10 text-warning rounded-full px-2.5 py-1 text-xs font-medium">
                        Cancels {renewal}
                      </span>
                    ) : renewal ? (
                      <span className="bg-lime-500/10 text-lime-300 rounded-full px-2.5 py-1 text-xs font-medium">
                        Renews {renewal}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <p className="text-text-secondary text-sm">
                    No subscription — you start with free credits.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link href="/pricing">Change plan</Link>
              </Button>
              {billing.dodoCustomerId && (
                <form action="/api/billing/portal" method="post">
                  <Button type="submit" variant="secondary" size="sm">
                    Manage subscription
                  </Button>
                </form>
              )}
            </div>
          </div>

          {activePlan && (
            <ul className="border-cream-100/10 mt-5 grid gap-2.5 border-t pt-5 sm:grid-cols-2">
              {planBenefits(
                activePlan.markupMultiplier,
                activePlan.creditsGrant
              ).map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5">
                  <Check
                    size={16}
                    weight="bold"
                    className="text-lime-400 mt-0.5 shrink-0"
                  />
                  <span className="text-text-secondary text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          )}
        </SettingCard>

        {/* Extra credits top-up — subscribers only */}
        {isSubscriber && extraCreditPlan && (
          <SettingCard
            title="Extra credits"
            description="One-time top-up — 1 credit for every $0.01, minimum $10. Credits land instantly."
          >
            <form
              id="top-up"
              action="/api/billing/checkout"
              method="post"
              className="flex flex-wrap items-end gap-3"
            >
              <input
                type="hidden"
                name="plan_id"
                value={extraCreditPlan.id}
              />
              <div className="min-w-40">
                <label
                  htmlFor="top-up-amount"
                  className="text-text-secondary mb-1.5 block text-xs font-medium"
                >
                  Amount (USD)
                </label>
                <input
                  id="top-up-amount"
                  name="amount"
                  type="number"
                  min="10"
                  step="1"
                  defaultValue="10"
                  className="border-cream-100/10 bg-charcoal-800 text-cream-50 focus:border-lime-500/50 w-full rounded-[10px] border px-3.5 py-2 text-sm focus:outline-none"
                />
              </div>
              <Button type="submit" size="sm">
                Buy credits
              </Button>
            </form>
          </SettingCard>
        )}

        {/* Upgrade options for free / trial users */}
        {!isSubscriber && (
          <>
            {weeklyPlans.length > 0 && (
              <SettingCard
                title="Try for a week"
                description="Short weekly plans — a low-commitment way to load up on credits."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {weeklyPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="border-lime-500/30 bg-lime-500/[0.04] relative flex items-center justify-between gap-3 overflow-hidden rounded-[12px] border p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="bg-lime-500/50 absolute inset-x-0 top-0 h-px"
                      />
                      <div>
                        <p className="text-cream-50 flex items-center gap-1.5 text-sm font-medium">
                          <Sparkle
                            size={14}
                            weight="fill"
                            className="text-lime-400"
                          />
                          {plan.name.replace("Weekly Trial - ", "")} week
                        </p>
                        <p className="text-text-secondary mt-0.5 text-xs">
                          {formatCents(plan.price_cents)} ·{" "}
                          {plan.credits_grant.toLocaleString()} credits
                        </p>
                      </div>
                      <form action="/api/billing/checkout" method="post">
                        <input
                          type="hidden"
                          name="plan_id"
                          value={plan.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="brand"
                          disabled={!plan.checkout_ready}
                        >
                          {plan.checkout_ready ? "Start" : "Soon"}
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              </SettingCard>
            )}

            <SettingCard
              title="Monthly plans"
              description="Every monthly plan adds credits each billing cycle. Choose on the pricing page or start checkout here."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {monthlyPlans.map((plan) => {
                  const isBest = plan.id === bestValuePlanId;
                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative flex flex-col gap-4 rounded-[12px] border p-5",
                        isBest
                          ? "border-lime-500/40 bg-lime-500/[0.05]"
                          : "border-cream-100/10 bg-charcoal-800/60"
                      )}
                    >
                      {isBest && (
                        <span className="bg-lime-500 text-ink-950 absolute -top-px right-4 rounded-b-lg px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
                          Best value
                        </span>
                      )}
                      <div>
                        <p className="text-cream-50 text-sm font-medium">
                          {plan.name}
                        </p>
                        <p className="mt-1.5 flex items-baseline gap-1.5">
                          <span className="font-display text-cream-50 text-3xl leading-none">
                            {formatCents(plan.price_cents)}
                          </span>
                          <span className="text-text-secondary text-xs">
                            /month
                          </span>
                        </p>
                        <p className="text-text-secondary mt-1.5 text-xs">
                          {plan.credits_grant.toLocaleString()} credits every
                          month
                        </p>
                      </div>
                      <form action="/api/billing/checkout" method="post">
                        <input
                          type="hidden"
                          name="plan_id"
                          value={plan.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant={isBest ? "brand" : "secondary"}
                          className="w-full"
                          disabled={!plan.checkout_ready}
                        >
                          {plan.checkout_ready
                            ? `Choose ${plan.name}`
                            : "Coming soon"}
                        </Button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </SettingCard>
          </>
        )}

        {/* Cancellation / downgrade — secondary */}
        {isSubscriber && billing.dodoCustomerId && (
          <div className="border-cream-100/10 rounded-[15px] border p-5">
            <p className="text-cream-50 text-sm font-medium">
              Cancel your subscription
            </p>
            <p className="text-text-secondary mt-1 text-sm leading-relaxed">
              Cancel anytime from the billing portal. Your plan stays active
              until {renewal ?? "the end of the current period"}, and unused
              credits remain in your balance.
            </p>
            <form action="/api/billing/portal" method="post" className="mt-3">
              <Button type="submit" variant="ghost" size="sm">
                Manage in billing portal
              </Button>
            </form>
          </div>
        )}
      </div>
    </SettingsShell>
  );
}
