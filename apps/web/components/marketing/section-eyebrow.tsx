import { cn } from "@/lib/utils";

/** Five-pixel motif + small-caps label used across the landing sections. */
export function SectionEyebrow({
  children,
  light = false,
  className,
}: {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]",
        light ? "text-ink-950/60" : "text-text-secondary",
        className
      )}
    >
      <span aria-hidden="true" className="flex gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-[7px] w-[7px] rounded-[1.5px]",
              light ? "bg-ink-950/70" : "bg-charcoal-700"
            )}
          />
        ))}
        <span className="bg-lime-500 h-[7px] w-[7px] rounded-[1.5px]" />
      </span>
      {children}
    </p>
  );
}
