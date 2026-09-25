"use client";

import { useState } from "react";
import { Check, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { OfferBadgeTone } from "./offer-badge";
import { PriceChip } from "./price-chip";

export interface PlanRowBullet {
  icon?: "credits" | "gens" | "infinity" | "check" | "x";
  text: string;
  dimmed?: boolean;
}

const BULLET_ICONS: Record<
  NonNullable<PlanRowBullet["icon"]>,
  React.ReactNode
> = {
  credits: <span className="inline-block h-3 w-3 rounded-full border-2 border-current" />,
  gens: <span className="text-[11px] leading-none">✳</span>,
  infinity: <span className="text-sm leading-none">∞</span>,
  check: <Check size={12} weight="bold" />,
  x: <span className="text-[11px] leading-none">✕</span>,
};

/**
 * Radio-selectable plan row — the ladder unit used in the Special Offer
 * takeover and PaywallSheet v2. One plan per row: name + cadence line left,
 * PriceChip right, radio far-left. Selected = accent border + filled radio +
 * tinted surface. Deeper detail behind `Learn more`.
 */
export function PlanRow({
  name,
  cadence,
  priceCents,
  anchorCents,
  priceCaption,
  bullets,
  moreBullets,
  headerTab,
  headerTone = "promo",
  selected,
  onSelect,
  dimmed = false,
}: {
  name: string;
  cadence: string;
  priceCents: number;
  anchorCents?: number;
  priceCaption: string;
  bullets: PlanRowBullet[];
  /** Extra bullets revealed by `Learn more`. */
  moreBullets?: PlanRowBullet[];
  headerTab?: string;
  headerTone?: OfferBadgeTone;
  selected: boolean;
  onSelect: () => void;
  /** The "in the shadow" presentation for the non-anchored sibling. */
  dimmed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "relative rounded-2xl transition-all",
        headerTab && "pt-5",
        dimmed && "opacity-75"
      )}
    >
      {headerTab && (
        <span className="absolute inset-x-0 top-0 z-10 flex justify-center">
          <span
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-t-2xl py-1.5 text-[11px] font-bold uppercase tracking-wide",
              headerTone === "promo" && "bg-promo text-cream-50",
              headerTone === "lime" && "bg-lime-500 text-ink-950",
              headerTone === "neutral" &&
                "bg-charcoal-700 text-cream-100"
            )}
          >
            {headerTab}
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-3 border p-4 text-left transition-colors",
          headerTab ? "rounded-b-2xl rounded-t-none" : "rounded-2xl",
          selected
            ? "border-promo bg-charcoal-850"
            : "border-cream-100/10 bg-charcoal-850/60 hover:border-cream-100/25",
          dimmed && "bg-charcoal-850/40"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-lime-500 bg-lime-500 text-ink-950"
              : "border-cream-100/25"
          )}
        >
          {selected && <Check size={12} weight="bold" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-cream-50 font-display text-lg font-bold leading-tight">
              {name}
            </span>
            {anchorCents !== undefined && anchorCents > priceCents && (
              <span className="text-text-muted text-xs line-through">
                ${(anchorCents / 100).toFixed(0)}
              </span>
            )}
          </span>
          <span className="text-text-secondary mt-0.5 block text-xs">
            {cadence}
          </span>

          <span className="mt-3 block space-y-1.5">
            {[...bullets, ...(expanded ? (moreBullets ?? []) : [])].map(
              (b, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    b.dimmed ? "text-text-muted" : "text-text-secondary"
                  )}
                >
                  <span className="w-4 shrink-0 text-center">
                    {b.icon ? BULLET_ICONS[b.icon] : BULLET_ICONS.check}
                  </span>
                  {b.text}
                </span>
              )
            )}
          </span>

          {moreBullets && moreBullets.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }
              }}
              className="text-text-muted hover:text-cream-100 mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
            >
              {expanded ? "Show less" : "Learn more"}
              <CaretDown
                size={12}
                weight="bold"
                className={cn("transition-transform", expanded && "rotate-180")}
              />
            </span>
          )}
        </span>

        <PriceChip
          priceCents={priceCents}
          anchorCents={anchorCents}
          caption={priceCaption}
          selected={selected}
          className="shrink-0"
        />
      </button>
    </div>
  );
}
