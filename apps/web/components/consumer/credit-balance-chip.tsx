"use client";

import { Coins } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CreditBalanceChipProps {
  credits: number;
  /** Balance at or below this renders the "low" warning state. */
  lowCreditAt?: number;
  variant?: "default" | "compact";
}

export function CreditBalanceChip({
  credits,
  lowCreditAt = 5,
  variant = "default",
}: CreditBalanceChipProps) {
  const isOut = credits <= 0;
  const isLow = !isOut && credits <= lowCreditAt;

  return (
    <Link
      href="/app/billing"
      aria-label={
        isOut
          ? "No credits remaining — buy credits"
          : `${credits} credits — open billing`
      }
      className={cn(
        "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        isOut
          ? "border-error/40 bg-error/10 text-error hover:bg-error/15"
          : isLow
            ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15"
            : "border-cream-100/10 bg-charcoal-850 text-cream-100 hover:border-cream-100/20"
      )}
    >
      <Coins
        size={variant === "compact" ? 16 : 18}
        weight="fill"
        className={cn(
          isOut
            ? "text-error"
            : isLow
              ? "text-warning"
              : "text-lime-400"
        )}
      />
      <span className="font-mono">{credits}</span>
      <span className="hidden sm:inline">
        {isOut ? "Top up" : "credits"}
      </span>
    </Link>
  );
}
