"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type CompareMode = "result" | "original" | "compare";

interface ResultCompareProps {
  resultUrl: string;
  originalUrl: string | null;
  resultAlt: string;
  /** Controlled view mode — the switcher lives in the action rail. */
  mode: CompareMode;
  className?: string;
}

/**
 * Full-bleed result stage. The media fills the stage — single views use
 * `object-contain` over a blurred copy of the same image so every aspect
 * ratio looks cinematic without cropping; Compare runs edge-to-edge with a
 * draggable divider. The view mode is controlled by ResultViewSwitch in the
 * action rail.
 */
export function ResultCompare({
  resultUrl,
  originalUrl,
  resultAlt,
  mode,
  className,
}: ResultCompareProps) {
  const [position, setPosition] = useState(50);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(98, Math.max(2, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) updatePosition(e.clientX);
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const onHandleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPosition((p) => Math.max(2, p - 4));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPosition((p) => Math.min(98, p + 4));
    }
  };

  const comparing = mode === "compare" && originalUrl;
  const shownUrl = mode === "original" && originalUrl ? originalUrl : resultUrl;
  const shownAlt = mode === "original" ? "Original photo" : resultAlt;

  return (
    <div
      className={cn(
        "media-frame bg-charcoal-900 relative overflow-hidden",
        className
      )}
    >
      {comparing ? (
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 cursor-ew-resize touch-none select-none"
        >
          <Image
            src={originalUrl}
            alt="Original photo"
            fill
            className="object-cover"
            unoptimized
            priority
          />
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          >
            <Image
              src={resultUrl}
              alt={resultAlt}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>

          <span className="shadow-elevated absolute left-3 top-3 rounded-md bg-ink-950/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cream-100 backdrop-blur">
            Original
          </span>
          <span className="shadow-elevated absolute right-3 top-3 rounded-md bg-ink-950/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cream-100 backdrop-blur">
            Result
          </span>

          <div
            role="slider"
            tabIndex={0}
            aria-label="Comparison position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            onKeyDown={onHandleKeyDown}
            className="focus-visible:ring-lime-500/50 absolute inset-y-0 w-8 -translate-x-1/2 cursor-ew-resize outline-none focus-visible:ring-2"
            style={{ left: `${position}%` }}
          >
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-cream-50/80" />
            <span className="shadow-elevated absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50 text-ink-950">
              <ArrowsLeftRight size={14} weight="bold" />
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Blurred backdrop fills the letterbox so any aspect ratio reads
              as a full-bleed stage without cropping the result. */}
          <Image
            src={shownUrl}
            alt=""
            aria-hidden
            fill
            className="scale-125 object-cover opacity-40 blur-2xl saturate-150"
            unoptimized
          />
          <div className="bg-ink-950/40 absolute inset-0" />
          <Image
            src={shownUrl}
            alt={shownAlt}
            fill
            className="object-contain"
            unoptimized
            priority
          />
        </>
      )}
    </div>
  );
}
