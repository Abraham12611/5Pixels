import { cn } from "@/lib/utils";
import { OfferBadge } from "./offer-badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

/**
 * Inline one-time-access offer — the `$3 ONE-TIME ACCESS` slot from the
 * references, adapted for the two weekly trials. Bright accent surface with
 * its own CTA; sits inside offer ladders and the pricing page's
 * `Try it first` strip.
 */
export function TrialBanner({
  headline,
  description,
  priceCents,
  ctaLabel,
  onCta,
  badge = "SPECIAL",
  className,
}: {
  headline: string;
  description: string;
  priceCents: number;
  ctaLabel?: string;
  onCta: () => void;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-[#3b5cff] to-[#2a3f9e] p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl font-bold uppercase leading-tight text-white">
          {headline}
        </h3>
        <OfferBadge tone="promo">{badge}</OfferBadge>
      </div>
      <p className="mt-1.5 text-sm text-white/80">{description}</p>
      <Button
        type="button"
        variant="brand"
        size="lg"
        onClick={onCta}
        className="mt-4 w-full"
      >
        {ctaLabel ?? `Get access for ${formatPrice(priceCents)}`}
      </Button>
    </div>
  );
}
