import { cn } from "@/lib/utils";

/**
 * The five-square brand motif used as a quiet active/loading signal.
 * Server-safe — no client hooks.
 */
export function FivePixelMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center gap-[3px]", className)}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="bg-lime-400 h-[3px] w-[3px] rounded-[1px]" />
      ))}
    </span>
  );
}

export type CreditMeterTone = "default" | "warning" | "error";

interface CreditMeterProps {
  /** Current available balance. */
  balance: number;
  /**
   * Reference capacity for the meter (e.g. plan credit grant). When null, a
   * fixed display scale of 10 credits per segment is used so the meter still
   * communicates low/medium/high at a glance. The exact number is always
   * rendered beside the meter — the meter is a secondary signal only.
   */
  max?: number | null;
  tone?: CreditMeterTone;
  className?: string;
}

const SEGMENTS = 5;
const FALLBACK_SEGMENT_CREDITS = 10;

/**
 * Five-segment credit meter. Each segment fills vertically by fraction so
 * partial balances read honestly. Never used alone — pair with exact balance
 * text and a textual hint for low/zero states.
 */
export function CreditMeter({
  balance,
  max,
  tone = "default",
  className,
}: CreditMeterProps) {
  const perSegment =
    max && max > 0 ? max / SEGMENTS : FALLBACK_SEGMENT_CREDITS;

  const toneClass =
    tone === "error"
      ? "bg-error"
      : tone === "warning"
        ? "bg-warning"
        : "bg-lime-400";

  return (
    <span
      role="img"
      aria-label={`Credit level ${Math.min(
        balance,
        max ?? balance
      )} of ${max ?? "50+"}`}
      className={cn("inline-flex items-end gap-[3px]", className)}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const fill = Math.min(
          1,
          Math.max(0, (balance - i * perSegment) / perSegment)
        );
        return (
          <span
            key={i}
            className="bg-charcoal-700 relative h-3.5 w-[5px] overflow-hidden rounded-[1.5px]"
          >
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 transition-[height] duration-300 ease-out",
                toneClass
              )}
              style={{ height: `${fill * 100}%` }}
            />
          </span>
        );
      })}
    </span>
  );
}
