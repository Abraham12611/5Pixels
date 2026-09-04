"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AnnouncementBannerProps {
  message?: string;
  cta?: { label: string; href: string };
}

export function AnnouncementBanner({
  message = "Get started free — every new account gets credits to try premium presets.",
  cta = { label: "Claim your credits", href: "/signup" },
}: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative z-50 bg-lime-500 px-4 py-2.5 text-center text-sm font-medium text-ink-950">
      <div className="flex items-center justify-center gap-2">
        <span role="img" aria-label="sparkles">
          ✦
        </span>
        <span>{message}</span>
        <a
          href={cta.href}
          className="rounded-full bg-ink-950 px-3 py-1 text-xs font-semibold text-lime-400 hover:bg-ink-900"
        >
          {cta.label}
        </a>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-ink-900"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
