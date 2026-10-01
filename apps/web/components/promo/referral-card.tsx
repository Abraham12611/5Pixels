"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  EnvelopeSimple,
  ShareNetwork,
  XLogo,
} from "@phosphor-icons/react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatReferralCode } from "@/lib/referrals/codes";

/**
 * Give/get referral block — Blackbird anatomy (07 §1A): the human code is
 * the hero artifact, with Copy Code / Copy Link / share actions. Reused on
 * /app/referrals, inside offer ladders, and on the blocked-credit surface.
 * Presentational: the link, code, and counts come from props.
 */
export function ReferralCard({
  referralUrl,
  referralCode,
  refereeReward,
  referrerReward,
  pendingCount = 0,
  className,
}: {
  referralUrl: string | null;
  /** Human share code, e.g. "K7M2QX" — displayed grouped as K7M-2QX. */
  referralCode?: string | null;
  /** e.g. "their first generation, free" */
  refereeReward: string;
  /** e.g. "300 credits when they subscribe" */
  referrerReward: string;
  pendingCount?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(what: "code" | "link") {
    const text = what === "code" ? referralCode : referralUrl;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable — user can select the text */
    }
  }

  const shareText = `Try 5Pixels — my code ${referralCode ? formatReferralCode(referralCode) : ""} gets your first transformation free`;
  const shareTargets = [
    {
      label: "WhatsApp",
      icon: WhatsappLogo,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralUrl ?? ""}`)}`,
    },
    {
      label: "X",
      icon: XLogo,
      href: `https://x.com/intent/post?text=${encodeURIComponent(`${shareText} ${referralUrl ?? ""}`)}`,
    },
    {
      label: "Email",
      icon: EnvelopeSimple,
      href: `mailto:?subject=${encodeURIComponent("Try 5Pixels")}&body=${encodeURIComponent(`${shareText} ${referralUrl ?? ""}`)}`,
    },
  ];

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

      {referralCode && (
        <div className="border-cream-100/10 bg-charcoal-800 mt-4 flex items-center justify-between rounded-xl border px-4 py-3">
          <span className="text-text-muted text-[10px] font-semibold uppercase tracking-[0.16em]">
            Your code
          </span>
          <span className="font-mono text-cream-50 text-base font-bold tracking-[0.12em]">
            {formatReferralCode(referralCode)}
          </span>
        </div>
      )}

      {referralUrl ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <code className="border-cream-100/10 bg-charcoal-800 text-cream-100 min-w-0 flex-1 truncate rounded-lg border px-3 py-2 text-xs">
              {referralUrl}
            </code>
            {referralCode && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => copy("code")}
                aria-label="Copy referral code"
              >
                {copied === "code" ? (
                  <Check size={14} weight="bold" className="text-lime-400" />
                ) : (
                  <Copy size={14} weight="bold" />
                )}
                {copied === "code" ? "Copied" : "Code"}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copy("link")}
              aria-label="Copy referral link"
            >
              {copied === "link" ? (
                <Check size={14} weight="bold" className="text-lime-400" />
              ) : (
                <Copy size={14} weight="bold" />
              )}
              {copied === "link" ? "Copied" : "Link"}
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
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-[11px]">Share:</span>
            {shareTargets.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Share via ${label}`}
                className="text-text-muted hover:text-cream-100 border-cream-100/10 bg-charcoal-800 hover:border-cream-100/20 inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors"
              >
                <Icon size={14} weight="fill" />
              </a>
            ))}
          </div>
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
