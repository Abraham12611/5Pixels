"use client";

import {
  ArrowsLeftRight,
  Camera,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import type { CompareMode } from "./result-compare";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "result", label: "Result", icon: ImageIcon },
  { id: "original", label: "Original", icon: Camera },
  { id: "compare", label: "Compare", icon: ArrowsLeftRight },
] as const;

interface ResultViewSwitchProps {
  mode: CompareMode;
  onChange: (mode: CompareMode) => void;
  className?: string;
}

/**
 * Horizontal segmented pill for switching between Result, Original, and
 * Compare. Lives at the bottom of the action rail so the stage stays clean.
 */
export function ResultViewSwitch({
  mode,
  onChange,
  className,
}: ResultViewSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label="View"
      aria-orientation="horizontal"
      className={cn(
        "border-cream-100/10 bg-charcoal-850 shadow-border flex gap-1 rounded-xl border p-1.5",
        className
      )}
    >
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={mode === v.id}
          onClick={() => onChange(v.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
            mode === v.id
              ? "bg-cream-100/15 text-cream-50"
              : "text-text-secondary hover:text-cream-100"
          )}
        >
          <v.icon size={14} weight={mode === v.id ? "fill" : "bold"} />
          {v.label}
        </button>
      ))}
    </div>
  );
}
