"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretDown, Check, Columns } from "@phosphor-icons/react";
import type { OutputSizeOption } from "@/types/catalog";
import { cn } from "@/lib/utils";

export function outputSizeKey(size: OutputSizeOption): string {
  return `${size.name}:${size.width}:${size.height}`;
}

function aspectLabel(size: OutputSizeOption): string {
  const w = size.width as number | undefined;
  const h = size.height as number | undefined;
  if (w && h) {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(Math.round(w), Math.round(h));
    return `${Math.round(w / g)}:${Math.round(h / g)}`;
  }
  return size.name;
}

function MiniFrame({
  width,
  height,
  active,
}: {
  width?: number;
  height?: number;
  active: boolean;
}) {
  const w = Math.max(1, Number(width ?? 1));
  const h = Math.max(1, Number(height ?? 1));
  const ratio = w / h;
  const maxDim = 18;
  const vw = ratio >= 1 ? maxDim : Math.max(10, Math.round(maxDim * ratio));
  const vh = ratio >= 1 ? Math.max(10, Math.round(maxDim / ratio)) : maxDim;

  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-6 shrink-0 items-center justify-center rounded-[3px] transition",
        active ? "text-lime-400" : "text-text-muted"
      )}
    >
      <span
        className={cn(
          "rounded-[2px] border transition",
          active ? "border-lime-400" : "border-current"
        )}
        style={{ width: vw, height: vh }}
      />
    </span>
  );
}

interface AspectRatioMenuProps {
  sizes: OutputSizeOption[];
  selected: OutputSizeOption;
  disabled?: boolean;
  onChange: (size: OutputSizeOption) => void;
}

export function AspectRatioMenu({
  sizes,
  selected,
  disabled,
  onChange,
}: AspectRatioMenuProps) {
  const selectedKey = outputSizeKey(selected);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[13px] transition-colors",
            "text-text-secondary hover:text-cream-100",
            "focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:outline-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Columns size={13} weight="bold" className="text-lime-400" />
          <span className="truncate">{aspectLabel(selected)}</span>
          <span className="text-text-muted hidden sm:inline">
            {selected.width} × {selected.height}
          </span>
          <CaretDown
            size={12}
            weight="bold"
            className="text-text-muted shrink-0"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-64 border-cream-100/10 bg-charcoal-850 p-1.5 text-cream-50"
      >
        <DropdownMenuLabel className="text-text-muted px-2 py-1 text-[11px] font-semibold tracking-wide uppercase">
          Aspect ratio
        </DropdownMenuLabel>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {sizes.map((size) => {
            const isSelected = outputSizeKey(size) === selectedKey;
            return (
              <button
                key={outputSizeKey(size)}
                type="button"
                disabled={disabled}
                onClick={() => onChange(size)}
                className={cn(
                  "group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition",
                  isSelected
                    ? "bg-charcoal-800 text-cream-50"
                    : "text-text-secondary hover:bg-charcoal-800/70 hover:text-cream-50"
                )}
              >
                <Check
                  size={14}
                  weight="bold"
                  className={cn(
                    "shrink-0 transition",
                    isSelected ? "text-lime-400 opacity-100" : "opacity-0"
                  )}
                />
                <MiniFrame
                  width={size.width}
                  height={size.height}
                  active={isSelected}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{size.name}</span>
                  <span className="text-text-muted block text-xs">
                    {aspectLabel(size)} · {size.width} × {size.height}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
