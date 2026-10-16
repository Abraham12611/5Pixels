"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "failed";

/**
 * Clipboard copy with an execCommand fallback for browsers without the async
 * Clipboard API (older Safari, non-secure contexts). Status is announced via
 * aria-live and auto-resets.
 */
export function CopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function legacyCopy(): boolean {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-9999px";
    document.body.appendChild(el);
    el.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(el);
    return ok;
  }

  async function handleCopy() {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = legacyCopy();
      }
    } catch {
      ok = legacyCopy();
    }
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  const label =
    state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "text-text-secondary hover:text-cream-50 focus-visible:ring-lime-500/70 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
        state === "copied" && "text-lime-400 hover:text-lime-400",
        state === "failed" && "text-red-400 hover:text-red-400",
        className
      )}
    >
      {state === "copied" ? (
        <Check size={14} weight="bold" aria-hidden />
      ) : (
        <Copy size={14} aria-hidden />
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
