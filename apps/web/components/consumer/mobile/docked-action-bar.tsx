import type { ReactNode } from "react";
import { LAYER_CLASS } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";

/**
 * Fixed commit bar for surfaces with a single decision (generate, upgrade,
 * checkout). Carries at most one primary action, an optional cost/context line
 * and, when the action is disabled, the reason it is.
 *
 * Pair with `MobilePageBottomSpacer` so the bar never covers page content.
 */
export function DockedActionBar({
  info,
  reason,
  children,
  className,
}: {
  /** Cost or context line above the action, e.g. "5 credits · 12 left". */
  info?: ReactNode;
  /** Why the action is unavailable, e.g. "Add a photo to generate". */
  reason?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-cream-100/10 bg-ink-950/90 supports-[backdrop-filter]:bg-ink-950/75 fixed inset-x-0 bottom-0 border-t px-5 pt-[15px] pb-[max(15px,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden",
        LAYER_CLASS.dockedBar,
        className
      )}
    >
      {info ? (
        <p className="text-text-secondary mb-2 text-[13px]">{info}</p>
      ) : null}
      {children}
      {reason ? (
        <p className="text-text-muted mt-2 text-[13px]">{reason}</p>
      ) : null}
    </div>
  );
}

/**
 * Bottom clearance for mobile pages: enough room for the tab bar, an optional
 * docked action bar and the safe area. Replaces hard-coded `pb-24`.
 */
export function MobilePageBottomSpacer({
  withDockedBar = false,
}: {
  withDockedBar?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "md:hidden",
        withDockedBar
          ? "h-[calc(64px+96px+env(safe-area-inset-bottom))]"
          : "h-[calc(64px+32px+env(safe-area-inset-bottom))]"
      )}
    />
  );
}
