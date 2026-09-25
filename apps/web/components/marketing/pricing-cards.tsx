"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CadenceToggle, type Cadence } from "@/components/promo/cadence-toggle";
import { OfferBadge } from "@/components/promo/offer-badge";
import { SaveLine } from "@/components/promo/save-line";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlanForPurchase } from "@/lib/db/plans";

const FREE_BENEFITS = [
  "Browse every preset",
  "Upload and preview any look",
  "Your photo is saved while you decide",
  "Upgrade whenever you're ready",
];

function planBenefits(plan: PlanForPurchase, annual: boolean): string[] {
  const benefits = [
    `${plan.credits_grant.toLocaleString()} credits every month`,
    "Every preset and poster",
    "HD downloads",
    "Failed transformations release credits",
  ];
  if (annual) benefits.push("Lower credit rate than monthly");
  else if (plan.markup_multiplier <= 2.5)
    benefits.push("Lower credit cost per transformation");
  return benefits.slice(0, 5);
}

/**
 * S5 — pricing page cards (07 §4). Annual is the default cadence: annual
 * plans show their effective monthly price with the matching monthly plan's
 * price struck through as anchor + a computed SaveLine. Recommended tier
 * gets the promo accent; every other card stays neutral.
 */
export function PricingCards({
  plans,
  isAuthenticated,
  activePlanId,
}: {
  plans: PlanForPurchase[];
  isAuthenticated: boolean;
  activePlanId: string | null;
}) {
  const [cadence, setCadence] = useState<Cadence>("annual");

  const annualPlans = plans.filter((p) => p.type === "annual");
  const monthlyPlans = plans.filter((p) => p.type === "monthly");
  const weeklyPlans = plans.filter((p) => p.type === "weekly_trial");

  const visible =
    cadence === "annual" && annualPlans.length > 0 ? annualPlans : monthlyPlans;

  // Recommended tier draws the eye — Pro in both cadences.
  const recommendedSlug =
    cadence === "annual" ? "annual-pro" : "monthly-pro";

  function monthlyAnchor(plan: PlanForPurchase): PlanForPurchase | null {
    return (
      monthlyPlans.find((m) => m.credits_grant === plan.credits_grant) ?? null
    );
  }

  function cta(plan: PlanForPurchase, recommended: boolean) {
    const label =
      plan.type === "annual"
        ? `Get ${plan.name.replace(" Annual", "")} — ${formatPrice(plan.price_cents)}/yr`
        : `Choose ${plan.name}`;
    if (!isAuthenticated) {
      return (
        <Button
          asChild
          variant={recommended ? "brand" : "secondary"}
          className="w-full"
        >
          <Link href="/signup?next=/pricing">{label}</Link>
        </Button>
      );
    }
    if (activePlanId === plan.id) {
      return (
        <Button variant="secondary" className="w-full" disabled>
          Current plan
        </Button>
      );
    }
    return (
      <form action="/api/billing/checkout" method="post">
        <input type="hidden" name="plan_id" value={plan.id} />
        <Button
          type="submit"
          variant={recommended ? "brand" : "secondary"}
          className="w-full"
          disabled={!plan.checkout_ready}
        >
          {plan.checkout_ready ? label : "Coming soon"}
        </Button>
      </form>
    );
  }

  return (
    <div>
      <div className="flex justify-center">
        <CadenceToggle value={cadence} onChange={setCadence} />
      </div>

      <div className="mx-auto mt-10 grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {/* Free — browses everything, pays nothing. No fake credit promise. */}
        <div className="border-cream-100/10 bg-charcoal-850 flex flex-col rounded-[20px] border p-6">
          <p className="text-cream-50 text-sm font-semibold">Free</p>
          <p className="text-cream-50 mt-3 text-3xl font-semibold">$0</p>
          <p className="text-text-secondary mt-1 text-xs">
            Look around as long as you like
          </p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {FREE_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <Check
                  size={15}
                  weight="bold"
                  className="text-lime-400 mt-0.5 shrink-0"
                />
                <span className="text-text-secondary text-sm">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {isAuthenticated ? (
              <Button variant="secondary" className="w-full" disabled>
                {activePlanId ? "Included" : "Current plan"}
              </Button>
            ) : (
              <Button asChild variant="secondary" className="w-full">
                <Link href="/signup">Sign up</Link>
              </Button>
            )}
          </div>
        </div>

        {visible.map((plan) => {
          const recommended = plan.slug === recommendedSlug;
          const isAnnual = plan.type === "annual";
          const anchor = isAnnual ? monthlyAnchor(plan) : null;
          const effectiveMonthly = isAnnual
            ? Math.round(plan.price_cents / 12)
            : plan.price_cents;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[20px] border p-6",
                recommended
                  ? "border-promo/60 bg-charcoal-800 shadow-[0_0_40px_-12px_rgba(255,77,150,0.35)]"
                  : "border-cream-100/10 bg-charcoal-850"
              )}
            >
              {recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <OfferBadge tone="promo">Best value</OfferBadge>
                </span>
              )}
              <p className="text-cream-50 text-sm font-semibold">
                {plan.name.replace(" Annual", "").replace(" Monthly", "")}
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                {anchor && anchor.price_cents > effectiveMonthly && (
                  <span className="text-text-muted text-sm line-through">
                    {formatPrice(anchor.price_cents)}
                  </span>
                )}
                <span className="text-cream-50 text-3xl font-semibold">
                  {formatPrice(effectiveMonthly)}
                </span>
                <span className="text-text-secondary text-sm">/mo</span>
              </div>
              <p className="text-text-secondary mt-1 text-xs">
                {isAnnual
                  ? `${formatPrice(plan.price_cents)} billed yearly`
                  : `${plan.credits_grant.toLocaleString()} credits / month`}
              </p>
              {isAnnual && anchor && (
                <SaveLine
                  className="mt-1"
                  annualCents={plan.price_cents}
                  monthlyCents={anchor.price_cents * 12}
                />
              )}
              <ul className="mt-5 flex-1 space-y-2.5">
                {planBenefits(plan, isAnnual).map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <Check
                      size={15}
                      weight="bold"
                      className={cn(
                        "mt-0.5 shrink-0",
                        recommended ? "text-promo" : "text-lime-400"
                      )}
                    />
                    <span className="text-text-secondary text-sm">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">{cta(plan, recommended)}</div>
            </div>
          );
        })}
      </div>

      {/* Weekly trials — the cheap first step */}
      {weeklyPlans.length > 0 && (
        <div className="border-cream-100/10 bg-charcoal-850 mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[15px] border px-5 py-4">
          <p className="text-text-secondary text-sm">
            <span className="text-cream-50 font-medium">Just want a taste?</span>{" "}
            One-time weekly passes —{" "}
            {weeklyPlans
              .map(
                (p) =>
                  `${p.name.replace("Weekly Trial — ", "").replace("Weekly Trial - ", "")} ${formatPrice(p.price_cents)}`
              )
              .join(" or ")}
            . No subscription.
          </p>
          {isAuthenticated ? (
            <form action="/api/billing/checkout" method="post">
              <input
                type="hidden"
                name="plan_id"
                value={weeklyPlans[0]?.id ?? ""}
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={!weeklyPlans[0]?.checkout_ready}
              >
                Start a weekly pass
              </Button>
            </form>
          ) : (
            <Button asChild variant="secondary" size="sm">
              <Link href="/signup?next=/pricing">Start a weekly pass</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
