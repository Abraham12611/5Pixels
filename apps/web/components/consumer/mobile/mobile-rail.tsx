import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal snap rail. Items snap to the start, the next card peeks at the
 * right edge as the only scroll affordance, and the rail is an accessible,
 * keyboard-scrollable list.
 */
export function MobileRail({
  label,
  itemClassName,
  className,
  children,
}: {
  /** Accessible name for the rail, e.g. "Trending looks". */
  label: string;
  /** Width class for each item — keep a peek of the next card, e.g. "w-[72%]". */
  itemClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children);

  return (
    <ul
      aria-label={label}
      tabIndex={0}
      className={cn(
        "scrollbar-none flex snap-x snap-mandatory gap-[10px] overflow-x-auto overscroll-x-contain px-5 pb-1",
        "focus-visible:ring-lime-500/70 focus-visible:ring-offset-ink-950 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        className
      )}
    >
      {items.map((child, index) => (
        <li
          // Rail children are positional and have no stable identity here.
          key={index}
          className={cn("shrink-0 snap-start", itemClassName ?? "w-[72%]")}
        >
          {child}
        </li>
      ))}
    </ul>
  );
}
