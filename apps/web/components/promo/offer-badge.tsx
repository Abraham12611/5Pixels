import { cn } from "@/lib/utils";

export type OfferBadgeTone = "promo" | "lime" | "neutral";

/**
 * Offer micro-tag — discount badges (`X% OFF`, `SPECIAL`) render in
 * --color-promo magenta; recommendation tags (`BEST VALUE`, `MOST POPULAR`)
 * render in lime. Never a button, never decorative.
 */
export function OfferBadge({
  children,
  tone = "promo",
  className,
}: {
  children: React.ReactNode;
  tone?: OfferBadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone === "promo" && "bg-promo text-cream-50",
        tone === "lime" && "bg-lime-500 text-ink-950",
        tone === "neutral" &&
          "border-cream-100/20 text-cream-100 border bg-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
