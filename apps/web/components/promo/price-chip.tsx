import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

/**
 * Right-aligned price block used inside PlanRow and plan cards:
 * optional strikethrough anchor on top, big number, cadence caption
 * (`per month`, `one-time`). Selected state inverts to accent fill.
 */
export function PriceChip({
  priceCents,
  anchorCents,
  caption,
  selected,
  tone = "neutral",
  className,
}: {
  priceCents: number;
  /** Undiscounted anchor shown struck through above the price. */
  anchorCents?: number;
  caption: string;
  selected?: boolean;
  tone?: "neutral" | "lime";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-w-20 flex-col items-center justify-center rounded-xl px-3 py-2 text-center transition-colors",
        selected
          ? tone === "lime"
            ? "bg-lime-500 text-ink-950"
            : "bg-cream-50 text-ink-950"
          : "bg-charcoal-800 text-cream-50",
        className
      )}
    >
      {anchorCents !== undefined && anchorCents > priceCents && (
        <span
          className={cn(
            "text-[11px] line-through",
            selected ? "text-ink-950/60" : "text-text-muted"
          )}
        >
          {formatPrice(anchorCents)}
        </span>
      )}
      <span className="font-display text-xl font-bold leading-none">
        {formatPrice(priceCents)}
      </span>
      <span
        className={cn(
          "mt-0.5 text-[10px]",
          selected ? "text-ink-950/70" : "text-text-muted"
        )}
      >
        {caption}
      </span>
    </span>
  );
}
