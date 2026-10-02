import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

/**
 * `Save $X compared to monthly` — computed from real catalog prices,
 * never hardcoded. Renders nothing when there's no saving.
 */
export function SaveLine({
  annualCents,
  monthlyCents,
  className,
}: {
  /** The annual plan's total price for the year. */
  annualCents: number;
  /** What 12 months of the monthly plan would cost. */
  monthlyCents: number;
  className?: string;
}) {
  const saving = monthlyCents - annualCents;
  if (saving <= 0) return null;
  return (
    <p className={cn("text-success text-xs", className)}>
      Save {formatPrice(saving)} compared to monthly
    </p>
  );
}
