"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "5px_promo_dismissed";
const END_KEY = "5px_promo_ends_at";
const WINDOW_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function readPromoEnd(): number {
  let end = Number(sessionStorage.getItem(END_KEY) ?? 0);
  if (Number.isNaN(end) || end - Date.now() <= 0 || end - Date.now() > WINDOW_MS) {
    end = Date.now() + WINDOW_MS;
    sessionStorage.setItem(END_KEY, String(end));
  }
  return end;
}

export function PromoCountdownBar() {
  const [visible, setVisible] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    const revealId = requestAnimationFrame(() => setVisible(true));

    const end = readPromoEnd();
    const intervalId = setInterval(() => {
      setRemainingMs(Math.max(0, end - Date.now()));
    }, 1000);

    return () => {
      cancelAnimationFrame(revealId);
      clearInterval(intervalId);
    };
  }, []);

  if (!visible) return null;

  const ms = remainingMs ?? WINDOW_MS;
  const h = pad(Math.floor(ms / 3_600_000));
  const m = pad(Math.floor((ms % 3_600_000) / 60_000));
  const s = pad(Math.floor((ms % 60_000) / 1000));

  return (
    <div className="bg-lime-400 text-ink-950 relative z-50 px-4 py-2 text-center text-xs font-medium sm:text-sm">
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
        <span className="hidden sm:inline">Offer expires in</span>
        <span className="font-mono font-bold tabular-nums">
          {h}h {m}m {s}s
        </span>
        <span className="bg-ink-950/10 hidden rounded-full px-2 py-0.5 font-semibold sm:inline">
          54% OFF premium plans
        </span>
        <a
          href="/signup"
          className="bg-ink-950 text-lime-400 hover:bg-ink-900 rounded-full px-3 py-1 text-xs font-semibold transition"
        >
          Get your discount
        </a>
      </div>
      <button
        type="button"
        aria-label="Dismiss offer"
        className="hover:bg-ink-950/10 absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
