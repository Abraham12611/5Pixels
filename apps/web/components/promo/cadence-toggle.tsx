"use client";

import { cn } from "@/lib/utils";
import { OfferBadge } from "./offer-badge";

export type Cadence = "monthly" | "annual";

/**
 * Monthly / Annual billing pill. Annual half carries the savings badge and is
 * the default everywhere this appears (annual anchoring, 07 §4).
 */
export function CadenceToggle({
  value,
  onChange,
  savingsLabel = "SAVE UP TO 50%",
  className,
}: {
  value: Cadence;
  onChange: (v: Cadence) => void;
  savingsLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className={cn(
        "bg-charcoal-800 inline-flex items-center rounded-full p-1",
        className
      )}
    >
      {(["monthly", "annual"] as const).map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              active
                ? "bg-lime-500 text-ink-950"
                : "text-text-secondary hover:text-cream-100"
            )}
          >
            {c}
            {c === "annual" && !active && (
              <OfferBadge tone="promo">{savingsLabel}</OfferBadge>
            )}
            {c === "annual" && active && (
              <span className="bg-ink-950/15 text-ink-950 rounded px-1 text-[10px] font-bold">
                {savingsLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
