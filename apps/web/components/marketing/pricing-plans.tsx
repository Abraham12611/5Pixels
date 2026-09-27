"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { cn } from "@/lib/utils";
import type { PlanForPurchase } from "@/lib/db/plans";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

const FREE_BENEFITS = [
  "10 welcome credits",
  "Full preset catalog",
  "Failed transformations release credits",
];

function planBenefits(plan: PlanForPurchase): string[] {
  const benefits = [
    `${plan.credits_grant.toLocaleString()} credits ${
      plan.type === "monthly" ? "every month" : "per week"
    }`,
    "Top up extra credits anytime",
    "Failed transformations release credits",
  ];
  if (plan.markup_multiplier <= 2.5) {
    benefits.push("Lower credit cost per transformation");
  }
  return benefits.slice(0, 4);
}

interface PricingPlansProps {
  weeklyPlans: PlanForPurchase[];
  monthlyPlans: PlanForPurchase[];
  isAuthenticated: boolean;
  activePlanId: string | null;
  /** Median preset cost in credits — powers ~$/image. */
  medianCredits: number;
}

/**
 * `/pricing` plan cards behind a Weekly | Monthly segmented control
 * (13 §5). Each card states name, price, cadence, credits, cost-per-image,
 * bullets, and a CTA. The recommended plan leads with a "Best value" badge.
 */
export function PricingPlans({
  weeklyPlans,
  monthlyPlans,
  isAuthenticated,
  activePlanId,
  medianCredits,
}: PricingPlansProps) {
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");
  const shown = period === "monthly" ? monthlyPlans : weeklyPlans;
  const recommendedId =
    period === "monthly" && monthlyPlans.length > 0
      ? monthlyPlans.reduce((best, p) =>
          p.credits_grant / Math.max(1, p.price_cents) >
          best.credits_grant / Math.max(1, best.price_cents)
            ? p
            : best
        ).id
      : null;

  const cta = (plan: PlanForPurchase, primary: boolean) => {
    if (!isAuthenticated) {
      return (
        <Button
          asChild
          size="sm"
          variant={primary ? "brand" : "secondary"}
          className="w-full"
        >
          <Link href="/signup?next=/pricing">{`Choose ${plan.name.replace("Weekly Trial — ", "")}`}</Link>
        </Button>
      );
    }
    return (
      <form action="/api/billing/checkout" method="post">
        <input type="hidden" name="plan_id" value={plan.id} />
        <input type="hidden" name="return_path" value="/pricing" />
        <Button
          type="submit"
          size="sm"
          variant={primary ? "brand" : "secondary"}
          className="w-full"
          disabled={!plan.dodo_product_id}
        >
          {plan.dodo_product_id
            ? plan.is_trial
              ? "Start free trial"
              : `Choose ${plan.name.replace("Weekly Trial — ", "")}`
            : "Coming soon"}
        </Button>
      </form>
    );
  };

  return (
    <div>
      {/* Billing-period segmented control */}
      <div className="mb-5 flex justify-center sm:justify-start">
        <div
          role="tablist"
          aria-label="Billing period"
          className="border-cream-100/10 bg-charcoal-850 flex rounded-full border p-1"
        >
          <FilterChip
            label="Monthly"
            active={period === "monthly"}
            onClick={() => setPeriod("monthly")}
          />
          <FilterChip
            label="Weekly"
            active={period === "weekly"}
            onClick={() => setPeriod("weekly")}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Free — always visible */}
        {period === "monthly" && (
          <div className="border-cream-100/10 bg-charcoal-850 flex flex-col rounded-[20px] border p-6">
            <p className="text-cream-50 text-sm font-semibold">Free</p>
            <p className="text-cream-50 mt-3 text-3xl font-semibold">$0</p>
            <p className="text-text-secondary mt-1 text-xs">
              10 credits to start
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
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled
                >
                  {activePlanId ? "Included" : "Current plan"}
                </Button>
              ) : (
                <Button
                  asChild
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  <Link href="/signup">Sign up free</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Paid plans for the selected period */}
        {shown.map((plan) => {
          const recommended = plan.id === recommendedId;
          const isCurrent = activePlanId === plan.id;
          const perImage =
            plan.credits_grant > 0
              ? ((plan.price_cents / plan.credits_grant) * medianCredits) / 100
              : null;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-[20px] border p-6",
                recommended
                  ? "border-lime-500/35 bg-charcoal-800"
                  : "border-cream-100/10 bg-charcoal-850"
              )}
            >
              {recommended && (
                <span className="bg-lime-500/10 text-lime-300 absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Best value
                </span>
              )}
              <p className="text-cream-50 text-sm font-semibold">
                {plan.name.replace("Weekly Trial — ", "")}
              </p>
              <p className="text-cream-50 mt-3 text-3xl font-semibold">
                {formatPrice(plan.price_cents)}
                <span className="text-text-secondary text-sm font-normal">
                  {plan.type === "monthly" ? "/mo" : "/wk"}
                </span>
              </p>
              <p className="text-text-secondary mt-1 text-xs">
                {plan.credits_grant.toLocaleString()} credits
                {perImage !== null &&
                  ` · ~$${perImage.toFixed(2)}/image`}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {planBenefits(plan).map((b) => (
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
                {isCurrent ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled
                  >
                    Current plan
                  </Button>
                ) : (
                  cta(plan, recommended)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
