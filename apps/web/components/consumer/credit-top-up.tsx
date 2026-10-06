"use client";

import { Button } from "@/components/ui/button";
import { Coins } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { CreditPack } from "@/lib/billing/credit-packs";

export type { CreditPack } from "@/lib/billing/credit-packs";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function translation(credits: number, perTransformation: number): string {
  const n = Math.floor(credits / Math.max(1, perTransformation));
  return `≈ up to ${n.toLocaleString()} transformation${n === 1 ? "" : "s"}`;
}

/**
 * Fixed-pack credit top-up: each pack is a plans row mapped to a Whop
 * variant server-side — the form posts only `plan_id`, never an amount.
 * Every option carries the plain-English "what it buys" line (06 §3.2).
 */
export function CreditTopUp({
  packs,
  creditsPerTransformation,
}: {
  packs: CreditPack[];
  /** Cheapest active transformation cost — basis for the "≈ N" line. */
  creditsPerTransformation: number;
}) {
  if (packs.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {packs.map((pack) => {
        const popular = pack.priceCents === 5000;
        return (
          <div
            key={pack.planId}
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
                {pack.credits.toLocaleString()} credits
              </p>
              <p className="text-text-muted mt-1 text-xs">
                {translation(pack.credits, creditsPerTransformation)}
              </p>
            </div>
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="plan_id" value={pack.planId} />
              <Button
                type="submit"
                size="sm"
                variant={popular ? "brand" : "secondary"}
                className="w-full"
                disabled={!pack.checkoutReady}
              >
                {pack.checkoutReady
                  ? `Buy for ${formatUsd(pack.priceCents)}`
                  : "Coming soon"}
              </Button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
