"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Coins } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { CreditPack } from "@/lib/billing/credit-packs";

export type { CreditPack } from "@/lib/billing/credit-packs";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function translation(credits: number, perTransformation: number): string {
  const n = Math.floor(credits / Math.max(1, perTransformation));
  return `≈ up to ${n.toLocaleString()} transformation${n === 1 ? "" : "s"}`;
}

/**
 * Fixed-pack credit top-up — Steel-style amount grid: pick a pack, then one
 * CTA restates the deal. The form posts only `plan_id`, never an amount;
 * every pack maps to a provider product server-side. Each card carries the
 * plain-English "what it buys" line (06 §3.2). `creditsPerTransformation`
 * comes from the cheapest currently-quotable generation (fresh pricing
 * snapshots), so the estimate is honest.
 */
export function CreditTopUp({
  packs,
  creditsPerTransformation,
}: {
  packs: CreditPack[];
  /** Cheapest currently-quotable transformation — basis for "≈ N". */
  creditsPerTransformation?: number | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = packs.find((p) => p.planId === selectedId) ?? null;

  if (packs.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Credit packs">
        {packs.map((pack) => {
          const popular = pack.priceCents === 5000;
          const isSelected = selectedId === pack.planId;
          return (
            <button
              key={pack.planId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!pack.checkoutReady}
              onClick={() => setSelectedId(pack.planId)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-lime-500/60 bg-charcoal-800 ring-1 ring-lime-500/30"
                  : "border-cream-100/10 bg-charcoal-800/60 hover:border-cream-100/25",
                !pack.checkoutReady && "cursor-not-allowed opacity-50"
              )}
            >
              {popular && (
                <span className="bg-lime-500 text-ink-950 absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                  Most value
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  "absolute right-3 bottom-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "border-lime-500 bg-lime-500 text-ink-950"
                    : "border-cream-100/25"
                )}
              >
                {isSelected && <Check size={10} weight="bold" />}
              </span>
              <p className="text-cream-50 flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <Coins
                  size={14}
                  weight="fill"
                  className="text-lime-400 shrink-0"
                />
                {pack.credits.toLocaleString()} credits
              </p>
              {creditsPerTransformation ? (
                <p className="text-text-muted mt-1 text-xs leading-snug">
                  {translation(pack.credits, creditsPerTransformation)}
                </p>
              ) : null}
              <p className="font-display text-cream-50 mt-2.5 text-lg font-bold">
                {pack.checkoutReady ? formatUsd(pack.priceCents) : "Soon"}
              </p>
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
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-text-muted">
            {selected
              ? `${selected.credits.toLocaleString()} credits${
                  creditsPerTransformation
                    ? ` — ${translation(selected.credits, creditsPerTransformation)}`
                    : ""
                }`
              : "Pick a pack"}
          </span>
          <span className="text-cream-50 font-semibold tabular-nums">
            {selected ? formatUsd(selected.priceCents) : "—"}
          </span>
        </div>
        <Button
          type="submit"
          variant="brand"
          className="mt-2.5 w-full"
          disabled={!selected}
        >
          {selected
            ? `Get ${selected.credits.toLocaleString()} credits — ${formatUsd(selected.priceCents)}`
            : "Get credits"}
        </Button>
      </form>
    </div>
  );
}
