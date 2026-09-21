"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SettingTileProps {
  label: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  /** Stack the control under the label instead of trailing right. */
  stacked?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Card-style container for a single studio control. Tiles are the rail's
 * visual grammar: charcoal surface, ring elevation, calm typography.
 */
export function SettingTile({
  label,
  hint,
  required,
  disabled,
  stacked,
  className,
  children,
}: SettingTileProps) {
  return (
    <div
      className={cn(
        "shadow-border rounded-lg bg-charcoal-800/80 p-3.5 transition-opacity",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          stacked ? "flex-col" : "items-center justify-between"
        )}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-cream-100 text-[13px] font-medium">
            {label}
          </span>
          {required && (
            <span className="text-text-muted text-[11px]">Required</span>
          )}
        </div>
        {children}
      </div>
      {hint && <p className="text-text-muted mt-1.5 text-[11px]">{hint}</p>}
    </div>
  );
}

interface ChoiceSettingTileProps {
  id?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  /** Display label for the current value. */
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

/**
 * Tile that opens an anchored option list. Selected row gets the tonal
 * treatment + check — neutral rows stay quiet.
 */
export function ChoiceSettingTile({
  id,
  label,
  required,
  disabled,
  value,
  options,
  onChange,
}: ChoiceSettingTileProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "shadow-border hover:shadow-border-hover group flex w-full items-center justify-between gap-3 rounded-lg bg-charcoal-800/80 p-3.5 text-left transition",
            "focus-visible:ring-lime-500/50 focus-visible:ring-2 focus-visible:outline-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="text-cream-100 text-[13px] font-medium">
              {label}
            </span>
            {required && (
              <span className="text-text-muted text-[11px]">Required</span>
            )}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-text-secondary group-hover:text-cream-100 truncate text-[13px] transition-colors">
              {value || "Choose"}
            </span>
            <CaretDown
              size={13}
              weight="bold"
              className={cn(
                "text-text-muted shrink-0 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="shadow-elevated w-64 rounded-lg border-none bg-charcoal-800 p-1.5"
      >
        <div role="listbox" aria-label={label} className="max-h-72 space-y-0.5 overflow-y-auto">
          {options.length === 0 && (
            <p className="text-text-muted px-2.5 py-2 text-xs">
              No options configured.
            </p>
          )}
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                  selected
                    ? "bg-cream-100/10 text-cream-50"
                    : "text-text-secondary hover:bg-cream-100/5 hover:text-cream-100"
                )}
              >
                <Check
                  size={13}
                  weight="bold"
                  className={cn(
                    "shrink-0 transition-opacity",
                    selected ? "text-lime-400 opacity-100" : "opacity-0"
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
