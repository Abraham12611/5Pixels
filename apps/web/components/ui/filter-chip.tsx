"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  /** sm = compact palette/toolbar rows; md = default tap target. */
  size?: "sm" | "md";
  /**
   * "tab" renders `role="tab"`/`aria-selected` for chips inside a `tablist`
   * (explore + landing feed). "toggle" renders `aria-pressed` for standalone
   * filter buttons (category wall).
   */
  semantics?: "tab" | "toggle";
  disabled?: boolean;
  className?: string;
}

/**
 * The one filter-chip visual for discovery surfaces — landing feed, explore
 * chips row and category wall all share this (25_MOBILE_WEB_POLISH/06 §6.5).
 * Solid lime when active, charcoal pill otherwise.
 */
export function FilterChip({
  label,
  active,
  onClick,
  icon,
  size = "md",
  semantics = "tab",
  disabled,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      {...(semantics === "tab"
        ? { role: "tab", "aria-selected": active }
        : { "aria-pressed": active })}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "focus-visible:ring-lime-500/70 inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50",
        size === "md" ? "min-h-11 px-4 text-[13px]" : "px-3 py-1.5 text-xs",
        active
          ? "bg-lime-400 text-ink-950"
          : "bg-charcoal-800 text-text-secondary hover:text-cream-50",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
