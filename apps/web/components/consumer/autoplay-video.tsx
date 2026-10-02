"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * In-view autoplay controller (17 §3–§4): plays only when ≥50% visible,
 * pauses off-screen, and at most one AutoplayVideo is playing at a time —
 * claiming playback pauses whoever held it. Autoplay is skipped entirely
 * under Save-Data, a ≤2g connection, or prefers-reduced-motion, leaving a
 * tap-to-play affordance instead.
 */

let current: HTMLVideoElement | null = null;

function claim(video: HTMLVideoElement) {
  if (current && current !== video && !current.paused) current.pause();
  current = video;
}

function release(video: HTMLVideoElement) {
  if (current === video) current = null;
}

function autoplayBlocked(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const conn = (
    navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (conn?.saveData) return true;
  const type = conn?.effectiveType;
  return type === "slow-2g" || type === "2g";
}

export function AutoplayVideo({
  src,
  poster,
  ariaLabel,
  className,
  videoClassName = "media-frame h-full w-full object-cover",
  playLabel = "Play preview",
}: {
  src: string;
  poster?: string;
  ariaLabel?: string;
  className?: string;
  videoClassName?: string;
  playLabel?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [blocked] = useState(autoplayBlocked);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (blocked || manual) return;
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            claim(el);
            void el.play().catch(() => undefined);
          } else if (!el.paused) {
            el.pause();
            release(el);
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      release(el);
    };
  }, [blocked, manual]);

  return (
    <span className={cn("relative block h-full w-full", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload={blocked ? "none" : "metadata"}
        aria-hidden="true"
        className={videoClassName}
      />
      {blocked && !manual && (
        <button
          type="button"
          aria-label={playLabel}
          onClick={() => {
            setManual(true);
            const el = videoRef.current;
            if (el) {
              claim(el);
              void el.play().catch(() => undefined);
            }
          }}
          className="bg-ink-950/70 hover:bg-ink-950/90 absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur transition"
        >
          <Play size={20} weight="fill" className="text-cream-50" />
        </button>
      )}
      {ariaLabel && <span className="sr-only">{ariaLabel}</span>}
    </span>
  );
}
