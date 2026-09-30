import Link from "next/link";
import { Children, type ReactNode } from "react";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
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

/**
 * Terminal "See all" card for rails (05 §4): max 6 content cards plus this
 * tile so the rail always ends with an escape into the full surface.
 */
export function MobileRailMoreCard({
  href,
  label = "See all",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="border-cream-100/10 bg-charcoal-850 text-text-secondary hover:text-cream-50 focus-visible:ring-lime-500/70 flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {label}
      <ArrowUpRight size={16} weight="bold" />
    </Link>
  );
}
