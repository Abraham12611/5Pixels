"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CadenceToggle, type Cadence } from "@/components/promo/cadence-toggle";
import { Button } from "@/components/ui/button";

/** Serializable plan descriptor for the billing plan grid. */
export interface ShopPlan {
  id: string;
  name: string;
  priceCents: number;
  creditsGrant: number;
  checkoutReady: boolean;
  /** Annual only — effective monthly price in cents. */
  monthlyEquivalentCents?: number;
  /** Annual only — savings vs. paying monthly, e.g. 50. */
  discountPercent?: number;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function bestValueId(plans: ShopPlan[]): string | null {
  if (plans.length === 0) return null;
  // Most credits per dollar within the cadence.
  const perTerm = (p: ShopPlan, months: number) =>
    (p.creditsGrant * months) / Math.max(1, p.priceCents);
  return plans
    .reduce((best, p) =>
      perTerm(p, 12) > perTerm(best, 12) ? p : best
    ).id;
}

function PlanCard({
  plan,
  cadence,
  isBest,
}: {
  plan: ShopPlan;
  cadence: Cadence;
  isBest: boolean;
}) {
  const annual = cadence === "annual";
  return (
    <div
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-cream-50 text-sm font-medium">{plan.name}</p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-display text-cream-50 text-3xl leading-none">
              {formatPrice(plan.priceCents)}
            </span>
            <span className="text-text-secondary text-xs">
              {annual ? "/year" : "/month"}
            </span>
          </p>
          {annual && plan.monthlyEquivalentCents !== undefined && (
            <p className="text-lime-300 mt-1 text-xs font-medium">
              {formatPrice(plan.monthlyEquivalentCents)}/mo — billed once a year
            </p>
          )}
        </div>
        {annual && plan.discountPercent !== undefined && (
          <span className="bg-promo/15 text-promo shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
            Save {plan.discountPercent}%
          </span>
        )}
      </div>

      <ul className="text-text-secondary space-y-1.5 text-xs">
        <li className="flex items-center gap-2">
          <Check size={12} weight="bold" className="text-lime-400 shrink-0" />
          {plan.creditsGrant.toLocaleString()} credits each month
        </li>
        <li className="flex items-center gap-2">
          <Check size={12} weight="bold" className="text-lime-400 shrink-0" />
          Top up extra credits anytime — they never expire
        </li>
        <li className="flex items-center gap-2">
          <Check size={12} weight="bold" className="text-lime-400 shrink-0" />
          Failed transformations release credits back
        </li>
      </ul>

      <form action="/api/billing/checkout" method="post" className="mt-auto">
        <input type="hidden" name="plan_id" value={plan.id} />
        <Button
          type="submit"
          size="sm"
          variant={isBest ? "brand" : "secondary"}
          className="w-full"
          disabled={!plan.checkoutReady}
        >
          {plan.checkoutReady
            ? `Choose ${plan.name}`
            : "Coming soon"}
        </Button>
      </form>
    </div>
  );
}

/**
 * Monthly / Annual plan grid for the billing Plan page — cadence toggle up
 * top (annual anchored first per 07 §4), one card per tier, direct checkout.
 */
export function PlanShop({
  monthly,
  annual,
}: {
  monthly: ShopPlan[];
  annual: ShopPlan[];
}) {
  const [cadence, setCadence] = useState<Cadence>("annual");
  const shown = cadence === "annual" ? annual : monthly;
  const best = bestValueId(shown);
  const maxDiscount = Math.max(
    0,
    ...annual.map((p) => p.discountPercent ?? 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <CadenceToggle
          value={cadence}
          onChange={setCadence}
          savingsLabel={maxDiscount > 0 ? `SAVE UP TO ${maxDiscount}%` : "SAVE"}
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-text-secondary py-6 text-center text-sm">
          No {cadence} plans are available right now.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cadence={cadence}
              isBest={plan.id === best}
            />
          ))}
        </div>
      )}
      <p className="text-text-muted text-center text-xs">
        {cadence === "annual"
          ? "Credits land each month, all year. Cancel anytime — unused credits stay in your balance."
          : "Renews monthly. Cancel anytime — unused credits stay in your balance."}
      </p>
    </div>
  );
}
