"use client";

import { useRef, useState } from "react";
import { Check, LockSimple, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PlanForPurchase } from "@/lib/db/plans";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * Credits paywall — full-height sheet shown when a signed-in user without
 * enough credits taps Generate. Weekly trials lead (lime), monthly plans
 * follow, a one-time pack sits below. Nothing generates before purchase.
 */
export function PaywallSheet({
  open,
  onOpenChange,
  plans,
  required,
  presetName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanForPurchase[];
  required: number;
  presetName: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, panelRef);

  const weekly = plans.filter((p) => p.type === "weekly_trial").slice(0, 2);
  const monthly = plans
    .filter((p) => p.type === "monthly")
    .filter((p) => [2000, 5000].includes(p.price_cents))
    .slice(0, 2);
  const oneTime = plans.find((p) => p.type === "extra_credit") ?? null;

  const [planId, setPlanId] = useState<string | null>(null);

  if (!open) return null;

  const all = [...weekly, ...monthly, ...(oneTime ? [oneTime] : [])];
  const selected = all.find((p) => p.id === planId) ?? null;
  const canCheckout = selected !== null && selected.checkout_ready;

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className="bg-ink-950/80 animate-overlay-in fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add credits to generate"
        tabIndex={-1}
        className="bg-ink-950 animate-sheet-in max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)] outline-none"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-ink-950/95 px-5 pb-2 pt-4 backdrop-blur">
          <span className="text-cream-50 text-sm font-bold">5Pixels</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="text-text-secondary hover:text-cream-50 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-800 transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-5">
          <h2 className="font-display text-cream-50 mt-2 text-3xl leading-tight">
            You need credits to generate
          </h2>
          <p className="text-text-secondary mt-1.5 text-sm">
            {presetName} and your photo are saved — pick a plan to continue.
          </p>
          {required > 0 && (
            <p className="text-text-muted mt-1 text-xs">
              This transformation costs {required}{" "}
              {required === 1 ? "credit" : "credits"}.
            </p>
          )}

          {/* Weekly trials — promoted */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {weekly.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                promoted
                popular={i === 1}
                selected={planId === plan.id}
                onSelect={() => setPlanId(plan.id)}
              />
            ))}
          </div>

          {/* Monthly */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            {monthly.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={planId === plan.id}
                onSelect={() => setPlanId(plan.id)}
              />
            ))}
          </div>

          {/* One-time */}
          {oneTime && (
            <>
              <p className="text-text-muted mt-5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                Just this once
              </p>
              <button
                type="button"
                onClick={() => setPlanId(oneTime.id)}
                aria-pressed={planId === oneTime.id}
                className={cn(
                  "mt-2 flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
                  planId === oneTime.id
                    ? "border-lime-400/60 bg-lime-400/5"
                    : "border-cream-100/10 bg-charcoal-850 hover:border-cream-100/25"
                )}
              >
                <span>
                  <span className="font-display text-cream-50 text-lg">
                    {oneTime.credits_grant.toLocaleString()} credits
                  </span>
                  <span className="text-text-muted block text-xs">
                    {formatPrice(oneTime.price_cents)} · one-time purchase
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border",
                    planId === oneTime.id
                      ? "border-lime-400 bg-lime-400 text-ink-950"
                      : "border-cream-100/25"
                  )}
                >
                  {planId === oneTime.id && <Check size={12} weight="bold" />}
                </span>
              </button>
            </>
          )}

          {/* What's included */}
          <p className="font-display text-cream-50 mt-6 text-lg">
            What&rsquo;s included
          </p>
          <ul className="mt-2 space-y-2 pb-4">
            {[
              "Every preset and poster",
              "HD downloads",
              "New looks added weekly",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5 text-sm">
                <span className="bg-lime-400/15 text-lime-400 flex h-5 w-5 items-center justify-center rounded-full">
                  <Check size={11} weight="bold" />
                </span>
                <span className="text-text-secondary">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sticky CTA */}
        <div className="border-cream-100/10 bg-ink-950/95 sticky bottom-0 border-t px-5 pb-2 pt-3 backdrop-blur">
          <form action="/api/billing/checkout" method="post">
            <input type="hidden" name="plan_id" value={planId ?? ""} />
            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={!canCheckout}
            >
              {selected
                ? `Continue — ${formatPrice(selected.price_cents)}`
                : "Choose a plan"}
            </Button>
          </form>
          {selected && !selected.checkout_ready && (
            <p className="text-text-muted mt-2 text-center text-[11px]">
              This plan isn&rsquo;t available for checkout yet.
            </p>
          )}
          <p className="text-text-muted mt-2 flex items-center justify-center gap-1.5 text-[11px]">
            <LockSimple size={12} weight="bold" />
            Secure checkout · weekly trials are one-time purchases
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  promoted,
  popular,
  selected,
  onSelect,
}: {
  plan: PlanForPurchase;
  promoted?: boolean;
  popular?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const name = plan.name.replace("Weekly Trial — ", "").replace(" Monthly", "");
  const cadence = plan.interval === "monthly" ? "/mo" : " one-time";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative rounded-xl p-4 text-left transition-colors",
        promoted
          ? "bg-lime-400 text-ink-950"
          : "border-cream-100/10 bg-charcoal-850 text-cream-50 border",
        selected && !promoted && "border-lime-400/70 ring-lime-400/40 ring-1",
        selected && promoted && "ring-cream-50/70 ring-2"
      )}
    >
      {popular && (
        <span className="bg-ink-950 text-lime-400 absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
          Popular
        </span>
      )}
      <p
        className={cn(
          "font-display text-lg leading-tight",
          promoted ? "text-ink-950" : "text-cream-50"
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          "font-display mt-1 text-2xl font-bold",
          promoted ? "text-ink-950" : "text-cream-50"
        )}
      >
        {formatPrice(plan.price_cents)}
        <span
          className={cn(
            "ml-1 align-middle text-[11px] font-normal",
            promoted ? "text-ink-950/60" : "text-text-muted"
          )}
        >
          {cadence}
        </span>
      </p>
      <p
        className={cn(
          "mt-1 text-xs font-semibold",
          promoted ? "text-ink-950/80" : "text-text-secondary"
        )}
      >
        {plan.credits_grant.toLocaleString()} credits
      </p>
      <span
        className={cn(
          "absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border",
          selected
            ? promoted
              ? "border-ink-950 bg-ink-950 text-lime-400"
              : "border-lime-400 bg-lime-400 text-ink-950"
            : promoted
              ? "border-ink-950/30"
              : "border-cream-100/25"
        )}
      >
        {selected && <Check size={12} weight="bold" />}
      </span>
    </button>
  );
}
