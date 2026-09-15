"use client";

import { Coins } from "@phosphor-icons/react";
import Link from "next/link";

interface CreditBalanceChipProps {
  credits: number;
  variant?: "default" | "compact";
}

export function CreditBalanceChip({
  credits,
  variant = "default",
}: CreditBalanceChipProps) {
  const isLow = credits <= 0;

  return (
    <Link
      href="/app/billing"
      className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        isLow
          ? "border-error/40 bg-error/10 text-error hover:bg-error/15"
          : "border-lime-500/40 bg-lime-950/30 text-lime-300 hover:bg-lime-950/50"
      }`}
    >
      <Coins
        size={variant === "compact" ? 16 : 18}
        weight="fill"
        className={isLow ? "text-error" : "text-lime-400"}
      />
      <span className="font-mono">{credits}</span>
      <span className="hidden sm:inline">credits</span>
    </Link>
  );
}
