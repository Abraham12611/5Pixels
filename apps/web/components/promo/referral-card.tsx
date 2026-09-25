"use client";

import { useState } from "react";
import { Check, Copy, ShareNetwork } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Give/get referral block — reused inside offer ladders and /app/billing.
 * Presentational: the link and counts come from props; GrowSurf wiring lives
 * in the caller (03).
 */
export function ReferralCard({
  referralUrl,
  refereeReward,
  referrerReward,
  pendingCount = 0,
  className,
}: {
  referralUrl: string | null;
  /** e.g. "their first generation, free" */
  refereeReward: string;
  /** e.g. "300 credits when they subscribe" */
  referrerReward: string;
  pendingCount?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can select the text */
    }
  }

  return (
    <div
      className={cn(
        "border-cream-100/10 bg-charcoal-850 rounded-2xl border p-5",
        className
      )}
    >
      <h3 className="font-display text-cream-50 text-lg font-bold">
        Refer a friend
      </h3>
      <ul className="text-text-secondary mt-2 space-y-1.5 text-sm">
        <li className="flex gap-2">
          <span className="text-lime-400">→</span>
          They get {refereeReward}
        </li>
        <li className="flex gap-2">
          <span className="text-lime-400">→</span>
          You get {referrerReward}
        </li>
      </ul>
      <p className="text-text-muted mt-2 text-xs">
        Their credits are untouched — this one&rsquo;s on us.
      </p>

      {referralUrl ? (
        <div className="mt-4 flex items-center gap-2">
          <code className="border-cream-100/10 bg-charcoal-800 text-cream-100 min-w-0 flex-1 truncate rounded-lg border px-3 py-2 text-xs">
            {referralUrl}
          </code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copy}
            aria-label="Copy referral link"
          >
            {copied ? (
              <Check size={14} weight="bold" className="text-lime-400" />
            ) : (
              <Copy size={14} weight="bold" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="Share referral link"
              onClick={() =>
                navigator
                  .share({ url: referralUrl, title: "Try 5Pixels" })
                  .catch(() => {})
              }
            >
              <ShareNetwork size={14} weight="bold" />
            </Button>
          )}
        </div>
      ) : (
        <p className="text-text-muted mt-4 text-xs">
          Your referral link is being prepared.
        </p>
      )}

      {pendingCount > 0 && (
        <p className="text-text-secondary mt-3 text-xs">
          {pendingCount} {pendingCount === 1 ? "friend" : "friends"} joined —
          reward pending until their first purchase.
        </p>
      )}
    </div>
  );
}
