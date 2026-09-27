"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, LockSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanForPurchase } from "@/lib/db/plans";

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * Cost per transformation for a plan: price-per-credit × the cost of the run
 * that triggered the paywall (falls back to a credit when unknown).
 */
function costPerImageCents(
  plan: PlanForPurchase,
  required: number
): number | null {
  if (plan.credits_grant <= 0 || plan.price_cents <= 0) return null;
  const perCredit = plan.price_cents / plan.credits_grant;
  return perCredit * Math.max(1, required);
}

function formatPerImage(cents: number | null): string | null {
  if (cents === null) return null;
  return `~$${(cents / 100).toFixed(2)}/image`;
}

const INCLUDED = [
  "Every preset and poster",
  "HD downloads",
  "New looks added weekly",
];

export type PaywallOptionKind = "trial" | "subscription" | "pack";

export function optionKind(plan: PlanForPurchase): PaywallOptionKind {
  if (plan.type === "extra_credit") return "pack";
  if (plan.is_trial || plan.type === "weekly_trial") return "trial";
  return "subscription";
}

export function optionCta(plan: PlanForPurchase): string {
  const kind = optionKind(plan);
  if (kind === "trial" && plan.is_trial) return "Start free trial";
  if (kind === "subscription") return "Subscribe";
  return `Buy ${plan.credits_grant.toLocaleString()} credits`;
}

/**
 * Shared paywall body (13 §4): preset context + exact shortfall, one option
 * row per purchasable plan stating price · cadence · credits ·
 * cost-per-image, a "What's included" list, and the security line. Rendered
 * inside the T2 Sheet on touch and the Dialog on wider screens.
 */
export function PaywallContent({
  plans,
  required,
  balance,
  presetName,
  presetThumbUrl,
  returnPath,
}: {
  plans: PlanForPurchase[];
  required: number;
  balance?: number;
  presetName: string;
  presetThumbUrl?: string | null;
  /** Where checkout returns to on success/cancel — the create page. */
  returnPath: string;
}) {
  const weekly = plans.filter((p) => p.type === "weekly_trial").slice(0, 2);
  const monthly = plans
    .filter((p) => p.type === "monthly")
    .filter((p) => [2000, 5000].includes(p.price_cents))
    .slice(0, 2);
  const oneTime = plans.find((p) => p.type === "extra_credit") ?? null;
  const options = [...weekly, ...monthly, ...(oneTime ? [oneTime] : [])];

  // Most credits per dollar earns the "Best value" badge — never "popular".
  const bestValueId =
    options.length > 0
      ? options.reduce((best, p) =>
          p.credits_grant / Math.max(1, p.price_cents) >
          best.credits_grant / Math.max(1, best.price_cents)
            ? p
            : best
        ).id
      : null;

  // The spec default-selects the trial option when one exists.
  const defaultId = weekly[0]?.id ?? bestValueId ?? options[0]?.id ?? null;
  const [planId, setPlanId] = useState<string | null>(defaultId);
  const selected = options.find((p) => p.id === planId) ?? null;
  const hasTrial = options.some((p) => optionKind(p) === "trial");

  return (
    <div className="flex flex-col">
      {/* Preset context — the interrupted intent stays visible */}
      <div className="border-cream-100/10 bg-charcoal-800 mt-3 flex items-center gap-3 rounded-xl border p-3">
        {presetThumbUrl ? (
          <Image
            src={presetThumbUrl}
            alt=""
            width={40}
            height={50}
            className="h-12 w-10 shrink-0 rounded-md object-cover"
            unoptimized
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-cream-50 truncate text-sm font-semibold">
            {presetName}
          </p>
          <p className="text-text-muted mt-0.5 text-xs">
            {typeof balance === "number"
              ? `You need ${required} ${required === 1 ? "credit" : "credits"} — you have ${balance}.`
              : `This transformation costs ${required} ${required === 1 ? "credit" : "credits"}.`}
          </p>
        </div>
      </div>

      {/* Plan options — price, cadence, credits, cost-per-image per row */}
      <fieldset className="mt-4 space-y-2.5" aria-label="Choose a plan">
        <legend className="sr-only">Choose a plan</legend>
        {options.map((plan) => {
          const kind = optionKind(plan);
          const perImage = formatPerImage(costPerImageCents(plan, required));
          const isSelected = planId === plan.id;
          const cadence =
            kind === "subscription"
              ? `/${plan.interval === "monthly" ? "mo" : "wk"}`
              : kind === "trial"
                ? plan.is_trial
                  ? "/trial"
                  : " · one-time"
                : " · one-time";
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setPlanId(plan.id)}
              aria-pressed={isSelected}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-lime-400/60 bg-lime-400/5"
                  : "border-cream-100/10 bg-charcoal-850 hover:border-cream-100/25"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-cream-50 truncate text-sm font-semibold">
                    {plan.name.replace("Weekly Trial — ", "")}
                  </span>
                  {plan.id === bestValueId && (
                    <span className="bg-lime-500/10 text-lime-300 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                      Best value
                    </span>
                  )}
                </span>
                <span className="text-text-secondary mt-0.5 block text-xs">
                  {formatPrice(plan.price_cents)}
                  {cadence} · {plan.credits_grant.toLocaleString()} credits
                  {perImage ? ` · ${perImage}` : ""}
                </span>
              </span>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  isSelected
                    ? "border-lime-400 bg-lime-400 text-ink-950"
                    : "border-cream-100/25"
                )}
              >
                {isSelected && <Check size={12} weight="bold" />}
              </span>
            </button>
          );
        })}
      </fieldset>

      {/* What's included */}
      <p className="text-cream-50 mt-5 text-sm font-semibold">
        What&rsquo;s included
      </p>
      <ul className="mt-2 space-y-2">
        {INCLUDED.map((line) => (
          <li key={line} className="flex items-center gap-2.5 text-sm">
            <span className="bg-lime-400/15 text-lime-400 flex h-5 w-5 items-center justify-center rounded-full">
              <Check size={11} weight="bold" />
            </span>
            <span className="text-text-secondary">{line}</span>
          </li>
        ))}
      </ul>
      <p className="text-text-muted mt-3 text-xs">
        {hasTrial
          ? "Cancel any time. We'll remind you before the trial ends."
          : "Credits never expire while your account is active."}
      </p>

      {/* Docked CTA — label matches the selected option */}
      <form action="/api/billing/checkout" method="post" className="mt-4">
        <input type="hidden" name="plan_id" value={planId ?? ""} />
        <input type="hidden" name="return_path" value={returnPath} />
        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={!selected || !selected.dodo_product_id}
        >
          {selected
            ? `${optionCta(selected)} — ${formatPrice(selected.price_cents)}`
            : "Choose a plan"}
        </Button>
      </form>
      {selected && !selected.dodo_product_id && (
        <p className="text-text-muted mt-2 text-center text-[11px]">
          This plan isn&rsquo;t available for checkout yet.
        </p>
      )}
      <p className="text-text-muted mt-2 flex items-center justify-center gap-1.5 text-[11px]">
        <LockSimple size={12} weight="bold" />
        Secure checkout · card details never touch 5Pixels
      </p>
    </div>
  );
}
