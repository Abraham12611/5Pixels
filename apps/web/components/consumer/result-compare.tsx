"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowsLeftRight,
  Camera,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type CompareMode = "result" | "original" | "compare";

interface ResultCompareProps {
  resultUrl: string;
  originalUrl: string | null;
  resultAlt: string;
  className?: string;
}

const VIEWS = [
  { id: "result", label: "Result", icon: ImageIcon },
  { id: "original", label: "Original", icon: Camera },
  { id: "compare", label: "Compare", icon: ArrowsLeftRight },
] as const;

/**
 * Full-bleed result stage. The media fills the stage — single views use
 * `object-contain` over a blurred copy of the same image so every aspect
 * ratio looks cinematic without cropping; Compare runs edge-to-edge with a
 * draggable divider. The view switcher floats as a vertical rail (horizontal
 * pill on small screens).
 */
export function ResultCompare({
  resultUrl,
  originalUrl,
  resultAlt,
  className,
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

  const comparing = mode === "compare" && originalUrl;
  const shownUrl = mode === "original" && originalUrl ? originalUrl : resultUrl;
  const shownAlt = mode === "original" ? "Original photo" : resultAlt;

  const switcher = (vertical: boolean, className: string) =>
    originalUrl && (
      <div
        role="tablist"
        aria-label="View"
        aria-orientation={vertical ? "vertical" : "horizontal"}
        className={cn(
          "border-cream-100/10 bg-ink-950/70 shadow-elevated absolute z-10 flex gap-1 rounded-2xl border p-1.5 backdrop-blur-md",
          vertical ? "flex-col" : "flex-row",
          className
        )}
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={mode === v.id}
            onClick={() => setMode(v.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl text-[11px] font-medium transition-colors",
              vertical ? "w-16 flex-col py-2.5" : "px-3 py-1.5",
              mode === v.id
                ? "bg-cream-100/15 text-cream-50"
                : "text-text-secondary hover:text-cream-100"
            )}
          >
            <v.icon size={15} weight={mode === v.id ? "fill" : "bold"} />
            {v.label}
          </button>
        ))}
      </div>
    );

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

      {/* View switcher — horizontal pill on small screens, vertical rail on sm+ */}
      {switcher(false, "left-1/2 top-3 -translate-x-1/2 sm:hidden")}
      {switcher(true, "left-4 top-1/2 hidden -translate-y-1/2 sm:flex")}
    </div>
  );
}
