import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBillingData } from "@/lib/db/billing";
import { getCheapestGenerationCredits } from "@/lib/billing/credit-cost";
import { getPlansForPurchase, type PlanForPurchase } from "@/lib/db/plans";
import { creditPackOptions } from "@/lib/billing/credit-packs";
import {
  canPurchaseWeeklyPass,
  getActivePlan,
  hasEverPaid,
} from "@/lib/billing/entitlements";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getMyProfile } from "@/lib/profile/actions";
import { SettingsShell } from "@/components/consumer/settings-shell";
import { SettingCard } from "@/components/consumer/setting-card";
import { PlanShop, type ShopPlan } from "@/components/consumer/plan-shop";
import { CreditTopUp } from "@/components/consumer/credit-top-up";
import { CancelSubscriptionCard } from "@/components/consumer/cancel-subscription-card";
import { RETENTION_CREDITS } from "@/lib/billing/retention-shared";
import { Button } from "@/components/ui/button";
import { Check, Sparkle, ArrowRight } from "@phosphor-icons/react/dist/ssr";

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

function planBenefits(
  planType: string,
  priceCents: number,
  creditsGrant: number
): string[] {
  const benefits = [
    planType === "annual"
      ? `${creditsGrant.toLocaleString()} credits land every month`
      : `${creditsGrant.toLocaleString()} credits each ${
          planType === "weekly_trial" ? "week" : "month"
        }`,
    "Top up extra credits anytime — they never expire",
    "Failed transformations release credits back automatically",
  ];
  if (planType === "annual") {
    benefits.push("Pay once a year at a lower monthly rate");
  } else if (priceCents > 0 && creditsGrant / (priceCents / 100) >= 400) {
    benefits.push("More credits per dollar than starter plans");
  }
  return benefits.slice(0, 4);
}

/** Cancel-dialog lose-list — only things that actually stop on cancel. */
function planLoses(
  planType: string,
  priceCents: number,
  creditsGrant: number
): string[] {
  const loses = [
    `${creditsGrant.toLocaleString()} credits at every renewal`,
  ];
  if (planType === "annual") {
    loses.push("Your discounted annual rate — monthly plans cost more");
  } else if (priceCents > 0 && creditsGrant / (priceCents / 100) >= 400) {
    loses.push("Your higher credits-per-dollar rate");
  }
  return loses;
}

function toShopPlan(plan: PlanForPurchase): ShopPlan {
  const meta = plan.metadata ?? {};
  return {
    id: plan.id,
    name: plan.name.replace(/ Annual$/, ""),
    priceCents: plan.price_cents,
    creditsGrant: plan.credits_grant,
    checkoutReady: plan.checkout_ready,
    monthlyEquivalentCents:
      typeof meta.monthly_equivalent_cents === "number"
        ? meta.monthly_equivalent_cents
        : undefined,
    discountPercent:
      typeof meta.discount_percent === "number"
        ? meta.discount_percent
        : undefined,
  };
}

function PortalForm({ label, variant }: { label: string; variant: "secondary" | "ghost" }) {
  return (
    <form action="/api/billing/portal" method="post">
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}

export default async function BillingPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/billing/plan");
  }

  const [billing, plans, activePlan, profile, balance, everPaid, weeklyGate] =
    await Promise.all([
      getBillingData(),
      getPlansForPurchase(),
      getActivePlan(),
      getMyProfile(),
      getUserCreditBalance(),
      hasEverPaid(),
      canPurchaseWeeklyPass(),
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
  const annualPlans = plans.filter((p) => p.type === "annual");
  const weeklyPlans = plans.filter((p) => p.type === "weekly_trial");
  const creditPacks = creditPackOptions(plans);

  const subscription = billing.activeSubscription;
  const subPlan = Array.isArray(subscription?.plan)
    ? subscription.plan[0]
    : subscription?.plan;
  const hasActiveSubscription = Boolean(subscription);
  const planType = subPlan?.type ?? null;
  const isRecurring = planType === "monthly" || planType === "annual";
  const isWeeklyPass = planType === "weekly_trial";
  const isCanceling = Boolean(subscription?.cancel_at_period_end);
  const isPastDue = subscription?.status === "past_due";
  const renewal = formatDate(subscription?.current_period_end ?? null);

  // Weekly passes are for users with no real subscription history — first
  // timers and past weekly buyers ("Get another week"). Anyone who's ever
  // held a monthly/annual plan or paid a non-weekly invoice never sees them.
  const showWeekly = weeklyGate.allowed && weeklyPlans.length > 0;
  const weeklyReturner = everPaid && weeklyGate.allowed;

  // Lapsed: paid before, nothing active now — offer a restart of their last plan.
  let lapsedPlan: { id: string; name: string } | null = null;
  if (everPaid && !hasActiveSubscription) {
    const { data: lastSub } = await supabase
      .from("subscriptions")
      .select("plan:plan_id(id, name)")
      .eq("user_id", user.id)
      .not("status", "in", "(active,past_due)")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    const p = Array.isArray(lastSub?.plan) ? lastSub.plan[0] : lastSub?.plan;
    if (p?.id && p?.name) {
      const purchasable = plans.find(
        (candidate) => candidate.id === p.id && candidate.checkout_ready
      );
      if (purchasable) lapsedPlan = { id: p.id as string, name: p.name as string };
    }
  }

  // Cheapest quotable transformation — basis for the "≈ N transformations"
  // line on every top-up option (null when nothing is quotable).
  const creditsPerTransformation = await getCheapestGenerationCredits();

  // Monthly subscribers get the quiet "switch to annual" nudge (Plane Finder
  // pattern) instead of a paywall — routed through the billing portal, never
  // a second checkout that could double-bill.
  const annualSibling =
    activePlan?.type === "monthly"
      ? annualPlans.find(
          (p) => p.metadata?.sibling_monthly_slug === activePlan.slug
        )
      : undefined;
  const annualDiscount =
    typeof annualSibling?.metadata?.discount_percent === "number"
      ? annualSibling.metadata.discount_percent
      : null;

  const displayName = (subPlan?.name ?? activePlan?.name ?? "Free").replace(
    "Weekly Trial - ",
    "Weekly "
  );

  const cadenceLabel =
    planType === "monthly"
      ? "Billed monthly"
      : planType === "annual"
        ? "Billed annually"
        : isWeeklyPass
          ? "One week — doesn't renew"
          : null;

  return (
    <SettingsShell userName={name} userEmail={email}>
      <div className="space-y-6">
        <div>
          <h1 className="text-cream-50 text-xl font-semibold">Plan</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Your subscription, credits, and what happens next.
          </p>
        </div>

        {/* Status banner — state announced before controls (Mercury pattern) */}
        {isPastDue ? (
          <div
            role="status"
            className="border-error/30 bg-error/[0.07] flex flex-wrap items-center justify-between gap-3 rounded-[15px] border p-5"
          >
            <div>
              <p className="text-cream-50 text-sm font-semibold">
                Payment didn&apos;t go through
              </p>
              <p className="text-text-secondary mt-1 text-sm">
                Update your payment method to keep {displayName} and your
                monthly credits.
              </p>
            </div>
            <PortalForm label="Update payment" variant="secondary" />
          </div>
        ) : isCanceling ? (
          <div
            role="status"
            className="border-warning/30 bg-warning/[0.06] flex flex-wrap items-center justify-between gap-3 rounded-[15px] border p-5"
          >
            <div>
              <p className="text-cream-50 text-sm font-semibold">
                Your {displayName} plan ends {renewal ?? "soon"}
              </p>
              <p className="text-text-secondary mt-1 text-sm">
                Your plan stays active until then — and your credits never
                expire. After it ends, grants stop and your remaining
                credits spend at the standard rate.
              </p>
            </div>
            <PortalForm label="Restart plan" variant="secondary" />
          </div>
        ) : lapsedPlan ? (
          <div
            role="status"
            className="border-lime-500/25 bg-lime-500/[0.05] flex flex-wrap items-center justify-between gap-3 rounded-[15px] border p-5"
          >
            <div>
              <p className="text-cream-50 text-sm font-semibold">
                Welcome back — your {lapsedPlan.name} plan has ended
              </p>
              <p className="text-text-secondary mt-1 text-sm">
                Restart it in one step, or pick a different plan below.
              </p>
            </div>
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="plan_id" value={lapsedPlan.id} />
              <Button type="submit" variant="brand" size="sm">
                Restart {lapsedPlan.name}
              </Button>
            </form>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Current plan */}
          <SettingCard>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                  Current plan
                </p>
                <p className="font-display text-cream-50 mt-2 text-3xl leading-tight">
                  {displayName}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {activePlan ? (
                    <>
                      {cadenceLabel && (
                        <span className="border-cream-100/10 bg-charcoal-800 text-text-secondary rounded-full border px-2.5 py-1 text-xs font-medium">
                          {cadenceLabel}
                        </span>
                      )}
                      {isCanceling ? (
                        <span className="bg-warning/10 text-warning rounded-full px-2.5 py-1 text-xs font-medium">
                          Cancels {renewal}
                        </span>
                      ) : isWeeklyPass && renewal ? (
                        <span className="bg-cream-100/10 text-cream-100 rounded-full px-2.5 py-1 text-xs font-medium">
                          Ends {renewal}
                        </span>
                      ) : renewal ? (
                        <span className="bg-lime-500/10 text-lime-300 rounded-full px-2.5 py-1 text-xs font-medium">
                          Renews {renewal}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-text-secondary text-sm">
                      No subscription — pick a plan below to fill up on credits.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {billing.billingCustomerId && (
                  <PortalForm label="Manage subscription" variant="secondary" />
                )}
                {!hasActiveSubscription && (
                  <Button asChild size="sm" variant="ghost">
                    <Link href="#plans">Compare plans</Link>
                  </Button>
                )}
              </div>
            </div>

            {activePlan && (
              <ul className="border-cream-100/10 mt-5 grid gap-2.5 border-t pt-5 sm:grid-cols-2">
                {planBenefits(
                  planType ?? "monthly",
                  subPlan?.price_cents ?? 0,
                  activePlan.creditsGrant
                ).map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5">
                    <Check
                      size={16}
                      weight="bold"
                      className="text-lime-400 mt-0.5 shrink-0"
                    />
                    <span className="text-text-secondary text-sm">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SettingCard>

          {/* Right rail: next bill + credits + annual nudge */}
          <div className="flex flex-col gap-4">
            <SettingCard>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                {isRecurring && !isCanceling ? "Next bill" : "Billing"}
              </p>
              {isRecurring && !isCanceling ? (
                <>
                  <p className="font-display text-cream-50 mt-2 text-2xl leading-tight">
                    {formatCents(subPlan?.price_cents ?? 0)}
                  </p>
                  <p className="text-text-secondary mt-1.5 text-sm">
                    {renewal
                      ? `on ${renewal} — renews automatically`
                      : "Renews automatically"}
                  </p>
                </>
              ) : isCanceling ? (
                <>
                  <p className="font-display text-cream-50 mt-2 text-2xl leading-tight">
                    $0
                  </p>
                  <p className="text-text-secondary mt-1.5 text-sm">
                    No further charges — the plan ends{" "}
                    {renewal ?? "at the end of the period"}.
                  </p>
                </>
              ) : isWeeklyPass ? (
                <>
                  <p className="font-display text-cream-50 mt-2 text-2xl leading-tight">
                    One-time
                  </p>
                  <p className="text-text-secondary mt-1.5 text-sm">
                    Your pass ends {renewal ?? "at the end of the week"} — it
                    never renews.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-cream-50 mt-2 text-2xl leading-tight">
                    —
                  </p>
                  <p className="text-text-secondary mt-1.5 text-sm">
                    No upcoming bill.
                  </p>
                </>
              )}
            </SettingCard>

            <SettingCard>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wide">
                Credits
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-cream-50 text-3xl leading-none tabular-nums">
                  {balance.toLocaleString()}
                </span>
                <span className="text-text-secondary text-xs">left</span>
              </p>
              <Button
                asChild
                size="sm"
                variant={balance <= 0 ? "brand" : "secondary"}
                className="mt-4 w-full"
              >
                <Link
                  href={
                    hasActiveSubscription ? "#top-up" : "/app/billing/credits"
                  }
                >
                  Buy credits
                </Link>
              </Button>
              <p className="text-text-muted mt-2.5 text-xs">
                Credits never expire.
              </p>
            </SettingCard>

            {annualSibling && annualDiscount !== null && (
              <div className="border-promo/25 bg-promo/[0.06] rounded-[15px] border p-5">
                <p className="text-cream-50 text-sm font-semibold">
                  Switch to annual and save {annualDiscount}%
                </p>
                <p className="text-text-secondary mt-1 text-sm leading-relaxed">
                  {formatCents(annualSibling.price_cents)}/year — the same
                  monthly credits at a lower rate.
                </p>
                <div className="mt-3">
                  <PortalForm label="Manage plan" variant="secondary" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly pass — first-timers and returning weekly buyers only */}
        {showWeekly && (
          <SettingCard
            title={weeklyReturner ? "Get another week" : "Start with a week"}
            description={
              weeklyReturner
                ? "Another one-time week of credits — never renews, and the credits never expire."
                : "One-time weekly plans — a low-commitment way to load up on credits. They never renew."
            }
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
                      {plan.name.replace(/Weekly Trial\s*[—-]\s*/, "")} week
                    </p>
                    <p className="text-text-secondary mt-0.5 text-xs">
                      {formatCents(plan.price_cents)} ·{" "}
                      {plan.credits_grant.toLocaleString()} credits · one-time
                    </p>
                  </div>
                  <form action="/api/billing/checkout" method="post">
                    <input type="hidden" name="plan_id" value={plan.id} />
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

        {/* Plan shopping — only when no subscription is active (a new checkout
            while subscribed would double-bill; changes go through the portal) */}
        {!hasActiveSubscription && (
          <div id="plans">
            <SettingCard
              title="Choose a plan"
              description="Every plan adds credits each cycle. Pick a cadence, then a tier."
            >
              <PlanShop
                monthly={monthlyPlans.map(toShopPlan)}
                annual={annualPlans.map(toShopPlan)}
              />
            </SettingCard>
          </div>
        )}

        {/* Extra credits top-up — active subscribers see it inline here;
            everyone else lands on /app/billing/credits */}
        {hasActiveSubscription && creditPacks.length > 0 && (
          <div id="top-up" className="scroll-mt-24">
            <SettingCard
              title="Top up credits"
              description="One-time packs — they land instantly and never expire."
            >
              <CreditTopUp
                packs={creditPacks}
                creditsPerTransformation={creditsPerTransformation}
              />
            </SettingCard>
          </div>
        )}

        {/* Good to know — Krea-style honest FAQ */}
        <SettingCard title="Good to know">
          <ul className="text-text-secondary space-y-2.5 text-sm">
            {[
              "Top-up credits never expire — they wait until you need them.",
              "Plan credits land each billing cycle (or each month on annual plans).",
              "A failed transformation releases its credits back automatically.",
              "You can cancel anytime — your plan stays active until the period ends.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check
                  size={15}
                  weight="bold"
                  className="text-lime-400 mt-0.5 shrink-0"
                />
                {line}
              </li>
            ))}
          </ul>
          <Link
            href="/pricing#faq"
            className="text-lime-400 hover:text-lime-300 mt-4 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            More answers in the FAQ
            <ArrowRight size={14} weight="bold" />
          </Link>
        </SettingCard>

        {/* Cancellation — recurring plans only, and only while the plan
            isn't already set to end (the banner above covers that state).
            The card opens the retention step before the portal. */}
        {isRecurring && !isCanceling && billing.billingCustomerId && (
          <CancelSubscriptionCard
            planName={displayName}
            periodEnd={renewal}
            loses={planLoses(
              planType ?? "monthly",
              subPlan?.price_cents ?? 0,
              activePlan?.creditsGrant ?? 0
            )}
            credits={RETENTION_CREDITS}
          />
        )}
      </div>
    </SettingsShell>
  );
}
