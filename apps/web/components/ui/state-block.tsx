import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StateBlockVariant = "empty" | "error" | "offline" | "notfound";

const variantRole: Record<StateBlockVariant, "status" | "alert"> = {
  empty: "status",
  error: "alert",
  offline: "status",
  notfound: "status",
};

/**
 * The single composition for empty, error, offline and not-found states:
 * motif, short title, one plain-language line, one primary action and an
 * optional escape route. Sits inside the content region so page chrome and
 * navigation stay available.
 */
export function StateBlock({
  variant = "empty",
  icon,
  title,
  body,
  primary,
  secondary,
  className,
}: {
  variant?: StateBlockVariant;
  icon?: ReactNode;
  title: string;
  body?: string;
  primary?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variantRole[variant]}
      className={cn(
        "border-cream-100/10 bg-charcoal-850/40 flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center",
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center",
            variant === "error" ? "text-error" : "text-text-muted"
          )}
        >
          {icon}
        </span>
      ) : null}
      <h2 className="text-cream-50 text-[17px] font-semibold">{title}</h2>
      {body ? (
        <p className="text-text-secondary mt-2 max-w-xs text-sm">{body}</p>
      ) : null}
      {primary ? <div className="mt-6 w-full max-w-xs">{primary}</div> : null}
      {secondary ? <div className="mt-3">{secondary}</div> : null}
    </div>
  );
}
