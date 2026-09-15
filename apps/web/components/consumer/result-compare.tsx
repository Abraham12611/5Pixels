"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type CompareMode = "result" | "original" | "compare";

interface ResultCompareProps {
  resultUrl: string;
  originalUrl: string | null;
  resultAlt: string;
  width: number;
  height: number;
}

/**
 * Result-first media viewer. Comparison is opt-in — "Result" is the default
 * mode; "Original" and the drag handle only appear when a source exists.
 */
export function ResultCompare({
  resultUrl,
  originalUrl,
  resultAlt,
  width,
  height,
}: ResultCompareProps) {
  const [mode, setMode] = useState<CompareMode>("result");
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

  const shownUrl = mode === "original" && originalUrl ? originalUrl : resultUrl;
  const shownAlt = mode === "original" ? "Original photo" : resultAlt;

  return (
    <div>
      {originalUrl && (
        <div className="mb-3 flex justify-center">
          <div
            role="tablist"
            aria-label="View"
            className="shadow-border inline-flex rounded-lg bg-charcoal-800/80 p-1"
          >
            {(["result", "original", "compare"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-[13px] font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-cream-100/10 text-cream-50"
                    : "text-text-secondary hover:text-cream-100"
                )}
              >
                {m === "compare" ? "Compare" : m}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "compare" && originalUrl ? (
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="media-frame relative w-full cursor-ew-resize touch-none overflow-hidden rounded-xl select-none"
          style={{ aspectRatio: `${width} / ${height}` }}
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
        <div
          className="media-frame relative w-full overflow-hidden rounded-xl"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <Image
            src={shownUrl}
            alt={shownAlt}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        </div>
      )}
    </div>
  );
}
