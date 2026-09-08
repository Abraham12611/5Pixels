"use client";

import Link from "next/link";
import { AspectRatioMenu, outputSizeKey } from "@/components/consumer/aspect-ratio-menu";
import { Coins, Faders, FrameCorners, Lightning, Warning } from "@phosphor-icons/react";
import type { OutputSizeOption } from "@/types/catalog";

interface StudioToolbarProps {
  productName: string;
  productType: "filter" | "poster" | string;
  sizes: OutputSizeOption[];
  selectedSize: OutputSizeOption;
  onSizeChange: (size: OutputSizeOption) => void;
  estimatedCost: number;
  balance: number;
  canAfford: boolean;
  loading: boolean;
  progress: string;
  idleLabel?: string;
  disabled?: boolean;
}

export function StudioToolbar({
  productName,
  productType,
  sizes,
  selectedSize,
  onSizeChange,
  estimatedCost,
  balance,
  canAfford,
  loading,
  progress,
  idleLabel,
  disabled,
}: StudioToolbarProps) {
  const cost = estimatedCost > 0 ? estimatedCost : 0;

  return (
    <div className="sticky bottom-4 z-30 mt-4">
      <div className="border-cream-100/15 bg-charcoal-900/85 supports-[backdrop-filter]:bg-charcoal-900/75 flex w-full flex-wrap items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-xl backdrop-blur-md">
        <span className="text-cream-50 flex items-center gap-2 pl-1 text-sm font-semibold">
          {productType === "poster" ? (
            <FrameCorners size={16} weight="fill" className="text-lime-400" />
          ) : (
            <Faders size={16} weight="fill" className="text-lime-400" />
          )}
          <span className="max-w-[180px] truncate">{productName}</span>
        </span>

        <span className="bg-cream-100/10 hidden h-5 w-px sm:block" />

        <AspectRatioMenu
          sizes={sizes}
          selected={selectedSize}
          disabled={disabled}
          onChange={onSizeChange}
        />

        <span className="bg-cream-100/10 hidden h-5 w-px sm:block" />

        <span
          className="flex items-center gap-1.5 rounded-full px-2 text-sm"
          title={`Balance: ${balance} credits`}
        >
          <Coins
            size={15}
            weight="fill"
            className={cost > balance ? "text-rose-400" : "text-lime-400"}
          />
          <span className="text-cream-50 font-mono font-semibold">{cost}</span>
          <span className="text-text-muted text-xs">credits</span>
        </span>

        <button
          type="submit"
          disabled={disabled || loading || !canAfford}
          className="bg-lime-400 text-ink-950 hover:bg-lime-300 active:scale-[0.98] disabled:bg-charcoal-700 disabled:text-text-muted ml-auto flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed"
        >
          <Lightning size={16} weight="fill" />
          {loading ? progress || "Generating…" : idleLabel ?? "Generate"}
        </button>
      </div>

      {!canAfford && !loading && (
        <div className="mx-auto mt-2 flex max-w-max items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/60 px-4 py-1.5 text-xs text-rose-200 backdrop-blur">
          <Warning size={13} weight="bold" />
          <span>
            Insufficient credits (balance {balance}).{" "}
            <Link href="/app/billing" className="text-lime-300 underline">
              Buy credits
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}

export { outputSizeKey };
