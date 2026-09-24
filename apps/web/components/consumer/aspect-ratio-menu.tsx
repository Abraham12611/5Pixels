"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet } from "@/components/ui/sheet";
import { CaretDown, Check, Columns } from "@phosphor-icons/react";
import { useIsNarrow } from "@/lib/ui/use-media-query";
import type { OutputSizeOption } from "@/types/catalog";
import { cn } from "@/lib/utils";

export function outputSizeKey(size: OutputSizeOption): string {
  const kind = size.match_source
    ? "src"
    : size.match_reference
      ? "ref"
      : "fix";
  return `${size.name}:${size.width}:${size.height}:${kind}`;
}

export function isMatchSource(size: OutputSizeOption): boolean {
  return size.match_source === true;
}

function isMatchReference(size: OutputSizeOption): boolean {
  return size.match_reference === true;
}

function isMatchSize(size: OutputSizeOption): boolean {
  return isMatchSource(size) || isMatchReference(size);
}

function matchHint(size: OutputSizeOption): string {
  return isMatchSource(size)
    ? "Same shape as your photo"
    : "Same shape as the preset artwork";
}

function aspectLabel(size: OutputSizeOption): string {
  if (size.match_source) return "Match photo";
  if (size.match_reference) return "Match reference";
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
  match,
}: {
  width?: number;
  height?: number;
  active: boolean;
  match?: boolean;
}) {
  if (match) {
    // Dashed frame — the shape adapts to an attached image.
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
            "h-[18px] w-[18px] rounded-[2px] border border-dashed transition",
            active ? "border-lime-400" : "border-current"
          )}
        />
      </span>
    );
  }
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
  /** Real dims of the loaded photo — shown on "Match photo" when known. */
  sourceDims?: { width: number; height: number } | null;
}

export function AspectRatioMenu({
  sizes,
  selected,
  disabled,
  onChange,
  sourceDims,
}: AspectRatioMenuProps) {
  const isNarrow = useIsNarrow();
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectedKey = outputSizeKey(selected);
  const selectedMatch = isMatchSize(selected);

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      onClick={isNarrow ? () => setSheetOpen(true) : undefined}
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[13px] transition-colors",
        "text-text-secondary hover:text-cream-100",
        "focus-visible:ring-2 focus-visible:ring-lime-500/50 focus-visible:outline-none",
        isNarrow && "min-h-11",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <Columns size={13} weight="bold" className="text-lime-400" />
      <span className="truncate">{aspectLabel(selected)}</span>
      <span className="text-text-muted hidden sm:inline">
        {selectedMatch
          ? isMatchSource(selected) && sourceDims
            ? `${sourceDims.width} × ${sourceDims.height}`
            : matchHint(selected)
          : `${selected.width} × ${selected.height}`}
      </span>
      <CaretDown size={12} weight="bold" className="text-text-muted shrink-0" />
    </button>
  );

  const sizeRows = sizes.map((size) => {
    const isSelected = outputSizeKey(size) === selectedKey;
    return (
      <button
        key={outputSizeKey(size)}
        type="button"
        disabled={disabled}
        onClick={() => {
          onChange(size);
          setSheetOpen(false);
        }}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left text-sm transition",
          isNarrow ? "min-h-14" : "py-2",
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
          match={isMatchSize(size)}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{size.name}</span>
          <span className="text-text-muted block text-xs">
            {isMatchSize(size)
              ? isMatchSource(size) && sourceDims
                ? `${matchHint(size)} · ${sourceDims.width} × ${sourceDims.height}`
                : matchHint(size)
              : `${aspectLabel(size)} · ${size.width} × ${size.height}`}
          </span>
        </span>
      </button>
    );
  });

  // Mobile: the size picker is a T1 action sheet (25_MOBILE_WEB_POLISH/15 §3).
  if (isNarrow) {
    return (
      <>
        {trigger}
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          tier="action"
          title="Output size"
        >
          <div className="space-y-0.5 pb-1">{sizeRows}</div>
        </Sheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-64 border-cream-100/10 bg-charcoal-850 p-1.5 text-cream-50"
      >
        <DropdownMenuLabel className="text-text-muted px-2 py-1 text-[11px] font-semibold tracking-wide uppercase">
          Aspect ratio
        </DropdownMenuLabel>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">{sizeRows}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
