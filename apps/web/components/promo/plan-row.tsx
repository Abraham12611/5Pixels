"use client";

import { useState } from "react";
import { Check, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { OfferBadge, type OfferBadgeTone } from "./offer-badge";
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
 * takeover and BlockedCreditSurface. One plan per row: name + cadence line left,
 * PriceChip right, radio far-left. Selected = lime ring + filled radio +
 * elevated surface. A `headerTab` rides the top-right corner as an
 * overlapping chip (Opal/Revolut pattern). Deeper detail behind `Learn more`.
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
        "relative transition-all",
        headerTab && "mt-3",
        dimmed && "opacity-70"
      )}
    >
      {headerTab && (
        <span className="absolute -top-2.5 right-4 z-10">
          <OfferBadge tone={headerTone} className="shadow-md">
            {headerTab}
          </OfferBadge>
        </span>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all",
          selected
            ? "border-lime-500/60 bg-charcoal-800 ring-1 ring-lime-500/30"
            : "border-cream-100/10 bg-charcoal-800/60 hover:border-cream-100/25"
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
          tone="lime"
          className="shrink-0"
        />
      </button>
    </div>
  );
}
