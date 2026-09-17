import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/** Circular arrow button shown on cards and tiles across the landing sections. */
export function ArrowCircle({
  light = false,
  className,
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
        light
          ? "border-ink-950/15 text-ink-950"
          : "border-cream-100/15 text-cream-50",
        className
      )}
    >
      <ArrowUpRight size={16} weight="bold" />
    </span>
  );
}
