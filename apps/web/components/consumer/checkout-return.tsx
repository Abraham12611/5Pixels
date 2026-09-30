"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Coins } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 3000;
const POLL_LIMIT = 8;

/**
 * Checkout return card (13 §7). Shows the credit balance, tolerates webhook
 * lag by polling `router.refresh()` until the ledger shows a recent credit
 * (or ~24s elapse, then offers a manual refresh), and presents the single
 * most useful next action — `Continue your look` when checkout carried an
 * origin path, otherwise `Browse looks` / `Try again`.
 */
export function CheckoutReturn({
  mode,
  balance,
  settled,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  purchaseLabel,
}: {
  mode: "success" | "cancel";
  balance: number;
  /** Server set this when a fresh ledger entry proves the webhook landed. */
  settled?: boolean;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** e.g. "Creator · monthly" — what was purchased, when known. */
  purchaseLabel?: string | null;
}) {
  const router = useRouter();
  const [settledNow, setSettledNow] = useState(
    mode === "cancel" || settled === true
  );
  const [polls, setPolls] = useState(0);

  // When `router.refresh()` re-renders with a settled server prop, adopt it
  // (render-phase adjust — the allowed pattern, not setState-in-effect).
  const [sawSettled, setSawSettled] = useState(settled === true);
  if ((settled === true) !== sawSettled) {
    setSawSettled(settled === true);
    if (settled === true) setSettledNow(true);
  }

  // Poll while the webhook may still be landing (success only). setState
  // inside a setTimeout callback is async — the lint rule only bans
  // synchronous setState in the effect body.
  useEffect(() => {
    if (mode !== "success" || settledNow || polls >= POLL_LIMIT) return;
    const t = setTimeout(() => {
      setPolls((p) => p + 1);
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [mode, settledNow, polls, router]);

  const pending = mode === "success" && !settledNow && polls < POLL_LIMIT;

  return (
    <div className="border-cream-100/10 bg-charcoal-850 w-full max-w-md rounded-2xl border p-8 text-center">
      <span
        className={
          mode === "success"
            ? "bg-lime-400/15 text-lime-400 mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            : "bg-charcoal-800 text-text-secondary mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        }
      >
        {mode === "success" ? (
          <Check size={26} weight="bold" />
        ) : (
          <Coins size={24} weight="regular" />
        )}
      </span>

      <h1 className="text-cream-50 mt-5 text-2xl font-semibold">
        {mode === "success" ? "You're all set" : "Nothing was charged"}
      </h1>
      <p className="text-text-secondary mt-2 text-sm">
        {mode === "success"
          ? (purchaseLabel ?? "Your purchase completed.")
          : "Checkout was cancelled — your plan and credits are unchanged."}
      </p>

      {/* Balance — lag-tolerant */}
      <div className="border-cream-100/10 bg-charcoal-800/60 mt-6 rounded-xl border p-4">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wide">
          {mode === "success" ? "New balance" : "Balance"}
        </p>
        {pending ? (
          <p
            className="text-text-secondary mt-1.5 text-sm"
            role="status"
            aria-live="polite"
          >
            Updating your balance…
          </p>
        ) : (
          <p className="text-cream-50 mt-1.5 text-3xl font-semibold tabular-nums">
            {balance.toLocaleString()}{" "}
            <span className="text-text-secondary text-sm font-normal">
              credits
            </span>
          </p>
        )}
        {mode === "success" && !settledNow && polls >= POLL_LIMIT && (
          <p className="text-text-muted mt-2 text-xs">
            Taking longer than usual — your balance updates as soon as the
            payment confirms.
          </p>
        )}
      </div>

      {/* Docked primary + secondary */}
      <div className="mt-6 space-y-2">
        <Button asChild variant="brand" size="lg" className="w-full">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {secondaryHref && (
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
