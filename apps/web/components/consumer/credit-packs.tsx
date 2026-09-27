"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Extra-credit packs (13 §6): one column of radio rows stating credits,
 * price, and cost-per-image, with a `Buy N credits · $X` CTA. The
 * `extra_credit` plan bills a flat $0.01/credit (min $10) — packs are fixed
 * presets of that, so pricing is honest and identical per credit.
 */
const PACKS = [
  { dollars: 10, label: "Top up" },
  { dollars: 25, label: "Steady" },
  { dollars: 50, label: "Loaded" },
];

export function CreditPacks({
  planId,
  medianCredits,
}: {
  /** The `extra_credit` plan row id (dodo_product_id gated at checkout). */
  planId: string;
  /** Median preset cost in credits — powers ~$/image and "N looks" copy. */
  medianCredits: number;
}) {
  const [dollars, setDollars] = useState(25);

  return (
    <form action="/api/billing/checkout" method="post" className="space-y-3">
      <input type="hidden" name="plan_id" value={planId} />
      <input type="hidden" name="amount" value={dollars} />
      <input type="hidden" name="return_path" value="/app/billing/credits" />

      <fieldset className="space-y-2.5" aria-label="Choose a credit pack">
        <legend className="sr-only">Choose a credit pack</legend>
        {PACKS.map((pack) => {
          const credits = pack.dollars * 100;
          const perImage =
            medianCredits > 0
              ? (pack.dollars / (credits / medianCredits)).toFixed(2)
              : null;
          const looks =
            medianCredits > 0 ? Math.floor(credits / medianCredits) : null;
          const isSelected = dollars === pack.dollars;
          return (
            <button
              key={pack.dollars}
              type="button"
              onClick={() => setDollars(pack.dollars)}
              aria-pressed={isSelected}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                isSelected
                  ? "border-lime-400/60 bg-lime-400/5"
                  : "border-cream-100/10 bg-charcoal-800/60 hover:border-cream-100/25"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="text-cream-50 text-sm font-semibold">
                  {credits.toLocaleString()} credits
                  <span className="text-text-muted font-normal">
                    {" "}
                    · {pack.label}
                  </span>
                </span>
                <span className="text-text-secondary mt-0.5 block text-xs">
                  ${pack.dollars} · one-time
                  {perImage ? ` · ~$${perImage}/image` : ""}
                  {looks !== null && looks > 0
                    ? ` · enough for ~${looks} looks`
                    : ""}
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

      <Button type="submit" variant="brand" size="lg" className="w-full">
        Buy {dollars * 100} credits · ${dollars}
      </Button>
      <p className="text-text-muted text-center text-[11px]">
        One-time purchase · credits land instantly · $0.01 per credit
      </p>
    </form>
  );
}
