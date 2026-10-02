"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * First-visit cookie notice — a calm bottom bar, not a blocking wall.
 * Disappears permanently once any choice is stored.
 */
export function CookieBanner({
  onAcceptAll,
  onReject,
  onCustomize,
}: {
  onAcceptAll: () => void;
  onReject: () => void;
  onCustomize: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-40 p-4 sm:p-6"
    >
      <div className="border-cream-100/10 bg-charcoal-850 mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border p-4 shadow-2xl sm:flex-row sm:items-center sm:gap-6">
        <p className="text-text-secondary flex-1 text-sm leading-relaxed">
          We use essential cookies to keep you signed in, plus optional ones
          that remember your preferences.{" "}
          <Link
            href="/cookies"
            className="text-lime-400 underline-offset-2 hover:underline"
          >
            Cookie Notice
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReject}
            className="text-text-secondary"
          >
            Reject non-essential
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCustomize}
          >
            Customize
          </Button>
          <Button type="button" variant="brand" size="sm" onClick={onAcceptAll}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
