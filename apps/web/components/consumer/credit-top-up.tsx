"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const PACKS_USD = [10, 25, 50, 100];

function formatUsd(usd: number): string {
  return `$${usd.toFixed(0)}`;
}

function translation(credits: number, perTransformation: number): string {
  const n = Math.floor(credits / Math.max(1, perTransformation));
  return `≈ up to ${n.toLocaleString()} transformation${n === 1 ? "" : "s"}`;
}

/**
 * Free-range credit top-up — Ballpark-style surface (06 §3.2): choose any
 * amount or a pack, every option carries the plain-English "what it buys"
 * line. Credits per dollar come from the active pricing policy (a share of
 * the payment becomes provider-cost budget); the amount and grant are priced
 * server-side via Creem `custom_price`, never trusted from the client.
 */
export function CreditTopUp({
  planId,
  checkoutReady,
  creditsPerTransformation,
  creditsPerDollar,
  minimumUsd = 10,
}: {
  planId: string;
  checkoutReady: boolean;
  /** Cheapest active transformation cost — basis for the "≈ N" line. */
  creditsPerTransformation: number;
  /** Fixed-credit grant rate from the active pricing policy (≈606). */
  creditsPerDollar: number;
  minimumUsd?: number;
}) {
  const [amount, setAmount] = useState(minimumUsd);
  const credits = Math.floor(amount * creditsPerDollar);
  const valid = amount >= minimumUsd;

  return (
    <div className="space-y-4">
      {/* Custom amount */}
      <form
        action="/api/billing/checkout"
        method="post"
        className="border-cream-100/10 bg-charcoal-800/60 rounded-[12px] border p-5"
      >
        <input type="hidden" name="plan_id" value={planId} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1 sm:flex-none">
            <label
              htmlFor="topup-amount"
              className="text-text-secondary mb-1.5 block text-xs font-medium"
            >
              Any amount (USD)
            </label>
            <input
              id="topup-amount"
              name="amount"
              type="number"
              min={minimumUsd}
              step="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="border-cream-100/10 bg-charcoal-800 text-cream-50 focus:border-lime-500/50 w-full rounded-[10px] border px-3.5 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-cream-50 text-sm font-medium tabular-nums">
              {valid ? `${credits.toLocaleString()} credits` : "—"}
            </p>
            <p className="text-text-muted mt-0.5 text-xs">
              {valid
                ? translation(credits, creditsPerTransformation)
                : `Minimum ${formatUsd(minimumUsd)}`}
            </p>
          </div>
          <Button
            type="submit"
            size="sm"
            variant="brand"
            disabled={!checkoutReady || !valid}
          >
            {checkoutReady ? "Buy credits" : "Coming soon"}
          </Button>
        </div>
      </form>

      {/* Pack shortcuts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PACKS_USD.map((usd) => {
          const packCredits = usd * creditsPerDollar;
          const popular = usd === 50;
          return (
            <div
              key={usd}
              className={cn(
                "relative flex flex-col gap-3 rounded-[12px] border p-4",
                popular
                  ? "border-lime-500/40 bg-lime-500/[0.05]"
                  : "border-cream-100/10 bg-charcoal-800/60"
              )}
            >
              {popular && (
                <span className="bg-lime-500 text-ink-950 absolute -top-px right-4 rounded-b-lg px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
                  Popular
                </span>
              )}
              <div>
                <p className="text-cream-50 flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                  <Coins size={14} weight="fill" className="text-lime-400" />
                  {packCredits.toLocaleString()} credits
                </p>
                <p className="text-text-muted mt-1 text-xs">
                  {translation(packCredits, creditsPerTransformation)}
                </p>
              </div>
              <form action="/api/billing/checkout" method="post">
                <input type="hidden" name="plan_id" value={planId} />
                <input type="hidden" name="amount" value={usd} />
                <Button
                  type="submit"
                  size="sm"
                  variant={popular ? "brand" : "secondary"}
                  className="w-full"
                  disabled={!checkoutReady}
                >
                  Buy for {formatUsd(usd)}
                </Button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
