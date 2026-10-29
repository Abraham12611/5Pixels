import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

/**
 * Right-aligned typographic price block used inside PlanRow and plan cards:
 * optional strikethrough anchor on top, serif display price, and quiet
 * cadence caption (`per month`, `one-time`). Restrains lime so it never
 * competes with the modal's single primary CTA button.
 */
export function PriceChip({
  priceCents,
  anchorCents,
  caption,
  selected,
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
        "flex min-w-16 flex-col items-end justify-center text-right transition-colors",
        className
      )}
    >
      {anchorCents !== undefined && anchorCents > priceCents && (
        <span className="text-text-muted text-[11px] line-through tabular-nums">
          {formatPrice(anchorCents)}
        </span>
      )}
      <span
        className={cn(
          "font-display text-2xl font-bold leading-none tabular-nums",
          selected ? "text-cream-50" : "text-cream-100"
        )}
      >
        {formatPrice(priceCents)}
      </span>
      <span className="text-text-muted mt-1 text-[11px]">{caption}</span>
    </span>
  );
}
