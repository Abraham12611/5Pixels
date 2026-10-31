"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, LockSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { CreditPack } from "@/lib/billing/credit-packs";

export type { CreditPack } from "@/lib/billing/credit-packs";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function translation(credits: number, perTransformation: number): string {
  const n = Math.floor(credits / Math.max(1, perTransformation));
  return `≈ ${n.toLocaleString()} look${n === 1 ? "" : "s"}`;
}

function resolvePopularPlanId(packs: CreditPack[]): string | null {
  const byPrice = packs.find(
    (p) => p.priceCents === 1500 || p.priceCents === 5000
  );
  if (byPrice) return byPrice.planId;
  if (packs.length >= 3) return packs[2]!.planId;
  return null;
}

/**
 * Fixed-pack credit top-up — clean 2×2 selectable dark cards + a single
 * primary checkout CTA that restates the selected price ("Continue — $15").
 * The form posts only `plan_id`, never an amount; every pack maps to a
 * provider product server-side.
 */
export function CreditTopUp({
  packs,
  creditsPerTransformation,
}: {
  packs: CreditPack[];
  /** Cheapest currently-quotable transformation — basis for "≈ N looks". */
  creditsPerTransformation?: number | null;
}) {
  const popularPlanId = resolvePopularPlanId(packs);
  const defaultPack =
    packs.find((p) => p.planId === popularPlanId && p.checkoutReady) ??
    packs.find((p) => p.checkoutReady) ??
    null;

  const [selectedId, setSelectedId] = useState<string | null>(
    defaultPack?.planId ?? null
  );
  const selected =
    packs.find((p) => p.planId === selectedId && p.checkoutReady) ?? null;

  if (packs.length === 0) return null;

  return (
    <div>
      <div
        className="grid grid-cols-2 gap-3"
        role="radiogroup"
        aria-label="Credit packs"
      >
        {packs.map((pack) => {
          const popular = pack.planId === popularPlanId;
          const isSelected = selected?.planId === pack.planId;
          return (
            <button
              key={pack.planId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!pack.checkoutReady}
              onClick={() => setSelectedId(pack.planId)}
              className={cn(
                "relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all",
                isSelected
                  ? "border-lime-400 bg-lime-500/[0.06] ring-1 ring-lime-400/25"
                  : popular
                    ? "border-lime-400/35 bg-charcoal-800/70 hover:border-lime-400/60"
                    : "border-cream-100/10 bg-charcoal-800/60 hover:border-cream-100/25",
                !pack.checkoutReady && "cursor-not-allowed opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  {popular && (
                    <span className="border-lime-400/30 bg-lime-400/15 text-lime-300 mb-1.5 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      Popular
                    </span>
                  )}
                  <p className="font-display text-cream-50 text-lg font-bold leading-tight tabular-nums">
                    {pack.credits.toLocaleString()} credits
                  </p>
                </div>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "border-lime-400 bg-lime-400 text-ink-950"
                      : "border-cream-100/25 bg-charcoal-900/50"
                  )}
                >
                  {isSelected && <Check size={11} weight="bold" />}
                </span>
              </div>

              {creditsPerTransformation ? (
                <p className="text-text-secondary mt-1.5 text-xs">
                  {translation(pack.credits, creditsPerTransformation)}
                </p>
              ) : null}

              <div className="border-cream-100/10 mt-3.5 flex items-baseline justify-between border-t pt-2.5">
                <span className="font-display text-cream-50 text-xl font-bold leading-none tabular-nums">
                  {pack.checkoutReady ? formatUsd(pack.priceCents) : "Soon"}
                </span>
                <span className="text-text-muted text-[11px]">one-time</span>
              </div>
            </button>
          );
        })}
      </div>

      <form action="/api/billing/checkout" method="post" className="mt-4">
        <input
          type="hidden"
          name="plan_id"
          value={selected?.planId ?? ""}
          readOnly
        />
        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={!selected}
        >
          {selected
            ? `Continue — ${formatUsd(selected.priceCents)}`
            : "Choose a credit pack"}
        </Button>
        <p className="text-text-muted mt-2.5 flex items-center justify-center gap-1.5 text-[11px]">
          <LockSimple size={11} weight="bold" />
          Secure checkout · One-time purchase
        </p>
      </form>
    </div>
  );
}
