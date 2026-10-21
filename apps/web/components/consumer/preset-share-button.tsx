"use client";

import { useState } from "react";
import { Check, ShareNetwork } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PresetShareButtonProps {
  /** Preset path, e.g. `/presets/neon-noir` — resolved against origin at click. */
  path: string;
  name: string;
  className?: string;
}

/**
 * Share affordance for the preset console — native share sheet where
 * available, clipboard copy otherwise. Shares the public preset URL; the
 * generation ShareDialog stays scoped to results.
 */
export function PresetShareButton({
  path,
  name,
  className,
}: PresetShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} — 5Pixels`, url });
      } catch {
        // User dismissed the sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — leave it silent.
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      className={cn(
        "border-cream-100/10 text-text-secondary hover:text-cream-50 hover:border-cream-100/25 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
        className
      )}
      aria-label={copied ? "Link copied" : `Share ${name}`}
    >
      {copied ? (
        <Check size={16} weight="bold" className="text-lime-400" />
      ) : (
        <ShareNetwork size={16} />
      )}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
