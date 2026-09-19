"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface RichSelectOption {
  value: string;
  label: string;
  description?: string;
  /** Right-aligned meta text (e.g. unit price). */
  hint?: string;
  /** Small pill before the check (e.g. "New", "Preset"). */
  badge?: string;
  badgeTone?: "lime" | "neutral";
  icon?: React.ReactNode;
  /** Extra search terms (e.g. an endpoint id). */
  keywords?: string;
}

export interface RichSelectGroup {
  label: string;
  options: RichSelectOption[];
}

interface RichSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options?: RichSelectOption[];
  groups?: RichSelectGroup[];
  placeholder?: string;
  /** Renders an explicit "empty" option at the top (value ""). */
  noneLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Escape-hatch row pinned below the list (e.g. "Custom value…"). */
  footerOption?: RichSelectOption;
  disabled?: boolean;
  className?: string;
  /** Widen panel beyond trigger width for long descriptions. */
  panelClassName?: string;
  "aria-label"?: string;
}

function flatten(
  options: RichSelectOption[],
  groups: RichSelectGroup[]
): RichSelectOption[] {
  return [...options, ...groups.flatMap((g) => g.options)];
}

/**
 * A custom dropdown in the design-system grammar — dark rounded panel,
 * in-panel search, icon/description/badge option rows, and a check mark on
 * the selected value. Built on Radix Popover for positioning, focus
 * containment, and Escape/outside-click handling; arrow keys move a roving
 * focus between options.
 */
export function RichSelect({
  id,
  value,
  onValueChange,
  options = [],
  groups = [],
  placeholder = "Select…",
  noneLabel,
  searchable = false,
  searchPlaceholder = "Search…",
  footerOption,
  disabled,
  className,
  panelClassName,
  "aria-label": ariaLabel,
}: RichSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  const all = React.useMemo(
    () => flatten(options, groups),
    [options, groups]
  );
  const selected = all.find((o) => o.value === value);
  const showEmpty = noneLabel !== undefined;

  const q = query.trim().toLowerCase();
  const matches = (o: RichSelectOption) =>
    !q ||
    o.label.toLowerCase().includes(q) ||
    o.description?.toLowerCase().includes(q) ||
    o.keywords?.toLowerCase().includes(q);

  const filteredOptions = options.filter(matches);
  const filteredGroups = groups
    .map((g) => ({ ...g, options: g.options.filter(matches) }))
    .filter((g) => g.options.length > 0);
  const totalVisible =
    filteredOptions.length +
    filteredGroups.reduce((n, g) => n + g.options.length, 0);

  const choose = (next: string) => {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  };

  const moveFocus = (dir: 1 | -1 | "first" | "last") => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
    );
    if (items.length === 0) return;
    const index = items.indexOf(
      document.activeElement as HTMLElement
    );
    const next =
      dir === "first"
        ? items[0]
        : dir === "last"
          ? items[items.length - 1]
          : items[(index + dir + items.length) % items.length];
    next?.focus();
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus("first");
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus("last");
    }
  };

  const renderOption = (o: RichSelectOption) => {
    const isSelected = o.value === value && value !== "";
    return (
      <button
        key={o.value}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => choose(o.value)}
        className={cn(
          "hover:bg-cream-100/5 focus:bg-cream-100/5 group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors",
          isSelected && "bg-lime-500/[0.07]"
        )}
      >
        {o.icon !== undefined && (
          <span className="bg-charcoal-800 text-text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]">
            {o.icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="text-cream-50 flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{o.label}</span>
            {o.badge && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold tracking-wide uppercase",
                  o.badgeTone === "lime"
                    ? "bg-lime-500 text-ink-950"
                    : "bg-charcoal-700 text-cream-100"
                )}
              >
                {o.badge}
              </span>
            )}
          </span>
          {o.description && (
            <span className="text-text-muted mt-0.5 block truncate text-xs">
              {o.description}
            </span>
          )}
        </span>
        {o.hint && (
          <span className="text-text-muted shrink-0 font-mono text-[11px]">
            {o.hint}
          </span>
        )}
        <Check
          size={15}
          weight="bold"
          className={cn(
            "shrink-0 transition-opacity",
            isSelected ? "text-lime-400 opacity-100" : "opacity-0"
          )}
        />
      </button>
    );
  };

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "border-cream-100/10 bg-charcoal-800 text-cream-50 focus:border-lime-500 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-lime-500 disabled:opacity-60",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {selected?.icon !== undefined && (
              <span className="bg-charcoal-700 text-text-secondary flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                {selected.icon}
              </span>
            )}
            <span
              className={cn(
                "truncate",
                !selected && !showEmpty && "text-text-muted"
              )}
            >
              {selected
                ? selected.label
                : value === "" && showEmpty
                  ? noneLabel
                  : value
                    ? value
                    : placeholder}
            </span>
          </span>
          <CaretDown
            size={14}
            className={cn(
              "text-text-muted shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onKeyDown={onPanelKeyDown}
          className={cn(
            "border-cream-100/10 bg-charcoal-850 z-50 w-[var(--radix-popover-trigger-width)] min-w-56 overflow-hidden rounded-2xl border shadow-[0_16px_48px_rgba(0,0,0,0.55)] outline-none",
            "origin-(--radix-popover-content-transform-origin) data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            panelClassName
          )}
        >
          {searchable && (
            <div className="border-cream-100/10 flex items-center gap-2.5 border-b px-3.5 py-2.5">
              <MagnifyingGlass size={14} className="text-text-muted shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="text-cream-50 placeholder:text-text-muted w-full bg-transparent text-sm outline-none"
              />
            </div>
          )}

          <div
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-72 overflow-y-auto p-1.5"
          >
            {showEmpty && (
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => choose("")}
                className="hover:bg-cream-100/5 focus:bg-cream-100/5 flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors"
              >
                <span className="text-text-secondary text-sm">{noneLabel}</span>
                <Check
                  size={15}
                  weight="bold"
                  className={cn(
                    value === ""
                      ? "text-lime-400 opacity-100"
                      : "opacity-0"
                  )}
                />
              </button>
            )}

            {filteredOptions.map(renderOption)}

            {filteredGroups.map((group) => (
              <div key={group.label}>
                <p className="text-text-muted px-3 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide">
                  {group.label}
                </p>
                {group.options.map(renderOption)}
              </div>
            ))}

            {totalVisible === 0 && (
              <p className="text-text-secondary px-3 py-6 text-center text-sm">
                No matches for &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>

          {footerOption && (
            <div className="border-cream-100/10 border-t p-1.5">
              <button
                type="button"
                onClick={() => {
                  onValueChange(footerOption.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="hover:bg-cream-100/5 focus:bg-cream-100/5 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-cream-50 block text-sm font-medium">
                    {footerOption.label}
                  </span>
                  {footerOption.description && (
                    <span className="text-text-muted mt-0.5 block text-xs">
                      {footerOption.description}
                    </span>
                  )}
                </span>
              </button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
