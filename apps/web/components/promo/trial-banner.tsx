"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { OfferBadge } from "./offer-badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

/**
 * Refined dark promotional banner for Pro trial / introductory offers —
 * replaces the legacy loud blue gradient with the core dark charcoal palette,
 * editorial serif typography, transparent trial/billing disclosure, and a
 * restrained lime primary CTA.
 */
export function TrialBanner({
  eyebrow = "Explore Pro",
  headline,
  description,
  priceCents,
  ctaLabel,
  onCta,
  badge = "NEW",
  billingDetails = "7-day free trial includes 2,000 credits. After 7 days, your Pro subscription renews automatically at the standard monthly rate unless canceled beforehand in Billing settings.",
  className,
}: {
  eyebrow?: string;
  headline: string;
  description: string;
  priceCents: number;
  ctaLabel?: string;
  onCta: () => void;
  badge?: string;
  /** Discloses what happens when the trial ends. */
  billingDetails?: string;
  className?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        "border-cream-100/10 bg-charcoal-850 relative overflow-hidden rounded-2xl border p-6",
        className
      )}
    >
      <div
        aria-hidden
        className="bg-lime-500/10 pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="text-lime-400 text-[11px] font-semibold uppercase tracking-[0.18em]">
            {eyebrow}
          </span>
          <OfferBadge tone="promo">{badge}</OfferBadge>
        </div>

        <h3 className="font-display text-cream-50 mt-2 text-2xl font-bold leading-tight">
          {headline}
        </h3>
        <p className="text-text-secondary mt-1.5 text-sm leading-relaxed">
          {description}
        </p>

        {billingDetails && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1 text-xs transition-colors"
            >
              See trial and billing details
              <CaretDown
                size={12}
                weight="bold"
                className={cn(
                  "transition-transform",
                  showDetails && "rotate-180"
                )}
              />
            </button>
            {showDetails && (
              <p className="border-cream-100/10 bg-charcoal-800/70 text-text-secondary mt-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed">
                {billingDetails}
              </p>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="brand"
          size="lg"
          onClick={onCta}
          className="mt-5 w-full"
        >
          {ctaLabel ??
            (priceCents === 0
              ? "Start free week"
              : `Get access for ${formatPrice(priceCents)}`)}
        </Button>
      </div>
    </div>
  );
}
