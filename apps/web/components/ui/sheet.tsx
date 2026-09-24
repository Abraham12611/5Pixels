"use client";

import { X } from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDialogA11y } from "@/components/ui/dialog";
import { LAYER_CLASS } from "@/lib/ui/layers";
import { useOverlayHistory } from "@/lib/ui/use-overlay-history";
import { cn } from "@/lib/utils";

export type SheetTier = "action" | "content" | "full";

/** Fraction of the panel height a downward drag must pass to dismiss. */
const DISMISS_RATIO = 0.25;
/** Flick velocity (px/ms) that dismisses regardless of distance. */
const DISMISS_VELOCITY = 0.5;

const panelByTier: Record<SheetTier, string> = {
  action:
    "w-full max-h-[50dvh] rounded-t-2xl sm:max-w-sm sm:rounded-2xl sm:mb-6",
  content:
    "w-full max-h-[92dvh] rounded-t-2xl sm:max-w-lg sm:rounded-2xl sm:mb-6 sm:max-h-[85dvh]",
  full: "w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] sm:max-w-4xl sm:rounded-2xl sm:mb-0",
};

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Visual tier — see 25_MOBILE_WEB_POLISH/15. */
  tier?: SheetTier;
  /** Visible title; also names the dialog unless `ariaLabel` is given. */
  title?: ReactNode;
  description?: ReactNode;
  /** Accessible name when there is no visible title. */
  ariaLabel?: string;
  /** Pinned, safe-area-aware action area. */
  footer?: ReactNode;
  /** Renders above the parent overlay in a two-layer stack. */
  nested?: boolean;
  /** Hides the drag handle and disables swipe dismissal. */
  disableSwipe?: boolean;
  showClose?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * The single overlay implementation for mobile web. Every tier closes on scrim
 * tap, an explicit control, Escape, browser Back and (T1/T2) a downward swipe,
 * traps focus, returns it to the trigger, and locks body scroll exactly once
 * across nested overlays.
 */
export function Sheet({
  open,
  onOpenChange,
  tier = "content",
  title,
  description,
  ariaLabel,
  footer,
  nested = false,
  disableSwipe = false,
  showClose = true,
  className,
  bodyClassName,
  children,
}: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useDialogA11y(open, panelRef);
  useOverlayHistory(open, close);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, close]);

  const swipeable = !disableSwipe && tier !== "full";
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<{ y: number; t: number } | null>(null);

  // Reset the drag offset while closed so the next open starts flat.
  if (!open && dragY !== 0) setDragY(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!swipeable) return;
    dragStart.current = { y: e.clientY, t: e.timeStamp };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    setDragY(Math.max(0, e.clientY - start.y));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;

    const distance = Math.max(0, e.clientY - start.y);
    const elapsed = Math.max(1, e.timeStamp - start.t);
    const height = panelRef.current?.offsetHeight ?? 0;
    const passedThreshold = height > 0 && distance > height * DISMISS_RATIO;
    const flicked = distance / elapsed > DISMISS_VELOCITY && distance > 40;

    setDragY(0);
    if (passedThreshold || flicked) close();
  };

  if (!open) return null;

  const labelledBy = ariaLabel ? undefined : title ? headingId : undefined;

  return (
    <div
      ref={overlayRef}
      role="presentation"
      onClick={(e) => {
        if (e.target === overlayRef.current) close();
      }}
      className={cn(
        "animate-overlay-in fixed inset-0 flex justify-center",
        tier === "full" ? "items-stretch sm:items-center" : "items-end",
        tier !== "full" && "bg-ink-950/80",
        tier === "full" && "bg-ink-950 sm:bg-ink-950/80",
        nested ? LAYER_CLASS.nestedOverlay : LAYER_CLASS.overlay
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        className={cn(
          "border-cream-100/10 bg-charcoal-850 animate-sheet-in flex flex-col overflow-hidden border-t outline-none sm:border",
          panelByTier[tier],
          className
        )}
      >
        {swipeable ? (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden"
            data-testid="sheet-handle"
          >
            <span
              aria-hidden="true"
              className="bg-cream-100/20 h-1 w-10 rounded-full"
            />
          </div>
        ) : null}

        {title || showClose ? (
          <div
            className={cn(
              "flex shrink-0 items-start justify-between gap-4 px-5",
              swipeable ? "pt-2" : "pt-5",
              description ? "pb-2" : "pb-3"
            )}
          >
            <div className="min-w-0">
              {title ? (
                <h2
                  id={headingId}
                  className="text-cream-50 truncate text-base font-semibold"
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  id={descriptionId}
                  className="text-text-secondary mt-1 text-sm"
                >
                  {description}
                </p>
              ) : null}
            </div>
            {showClose ? (
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-text-secondary hover:text-cream-50 focus-visible:ring-lime-500/70 focus-visible:ring-offset-ink-950 -mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <X size={20} weight="bold" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5",
            !footer && "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="border-cream-100/10 bg-charcoal-850 shrink-0 border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Row inside a T1 action sheet. */
export function SheetActionRow({
  onClick,
  icon,
  label,
  description,
  destructive = false,
}: {
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  description?: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-cream-100/5 focus-visible:ring-lime-500/70 focus-visible:ring-offset-ink-950 flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        destructive ? "text-error" : "text-cream-50"
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="text-text-secondary block text-xs">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
