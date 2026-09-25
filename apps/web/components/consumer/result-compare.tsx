"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { ImageViewer } from "@/components/consumer/mobile/image-viewer";
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

const HOLD_HINT_KEY = "sp_hold_hint_seen";
const HOLD_DELAY_MS = 220;

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

function markHintSeen() {
  try {
    window.localStorage.setItem(HOLD_HINT_KEY, "1");
  } catch {
    // Private mode — the hint simply shows again next visit.
  }
}

/**
 * Full-bleed result stage. The media fills the stage — single views use
 * `object-contain` over a blurred copy of the same image so every aspect
 * ratio looks cinematic without cropping.
 *
 * Compare mechanics differ by pointer (10 §4): fine pointers get the
 * draggable divider; coarse pointers get a static 50/50 split (no `touch-none`
 * on a full-width element), a press-and-hold "see before" shortcut and a tap
 * that opens the T3 ImageViewer.
 */
export function ResultCompare({
  resultUrl,
  originalUrl,
  resultAlt,
  mode,
  className,
}: ResultCompareProps) {
  const [position, setPosition] = useState(50);
  const [held, setHeld] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coarse = useCoarsePointer();

  // "Hold to see before" — the hint shows once per device (10 §4).
  const hintEligible = coarse && Boolean(originalUrl) && mode === "result";
  useEffect(() => {
    if (!hintEligible) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(HOLD_HINT_KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;
    const show = setTimeout(() => setHintVisible(true), 0);
    const dismiss = setTimeout(() => {
      setHintVisible(false);
      markHintSeen();
    }, 4500);
    return () => {
      clearTimeout(show);
      clearTimeout(dismiss);
    };
  }, [hintEligible]);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Drag handlers — compare mode on fine pointers only.
  const onDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) updatePosition(e.clientX);
  };
  const onDragPointerEnd = () => {
    draggingRef.current = false;
  };

  // Coarse-pointer gestures on the single view (10 §4): press-and-hold
  // reveals the original while held; a tap opens the ImageViewer. A scroll
  // gesture surfaces as pointercancel, so it never opens the viewer.
  const onSinglePointerDown = () => {
    if (!coarse || mode !== "result" || !originalUrl) return;
    holdTimerRef.current = setTimeout(() => {
      setHeld(true);
      setHintVisible(false);
      markHintSeen();
    }, HOLD_DELAY_MS);
  };
  const onSinglePointerUp = () => {
    if (!coarse) return;
    const wasHeld = held;
    clearHoldTimer();
    setHeld(false);
    if (!wasHeld) setViewerOpen(true);
  };
  const onSinglePointerCancel = () => {
    clearHoldTimer();
    setHeld(false);
  };

  const updatePosition = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(98, Math.max(2, pct)));
  }, []);

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
  const singleSrc =
    held && originalUrl
      ? originalUrl
      : mode === "original" && originalUrl
        ? originalUrl
        : resultUrl;
  const showingOriginal = singleSrc === originalUrl && Boolean(originalUrl);
  const singleAlt = showingOriginal ? "Original photo" : resultAlt;

  return (
    <div
      className={cn(
        "media-frame bg-charcoal-900 relative overflow-hidden",
        className
      )}
    >
      {comparing && !coarse ? (
        /* Fine pointer: draggable divider with keyboard support. */
        <div
          ref={frameRef}
          onPointerDown={onDragPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onDragPointerEnd}
          onPointerCancel={onDragPointerEnd}
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

          <CompareTag className="left-3 top-3">Original</CompareTag>
          <CompareTag className="right-3 top-3">Result</CompareTag>

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
      ) : comparing ? (
        /* Coarse pointer: static 50/50 split — no dragging, the page keeps
           its scroll gesture (10 §4). */
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-[200%]">
              <Image
                src={originalUrl}
                alt="Original photo"
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-[200%]">
              <Image
                src={resultUrl}
                alt={resultAlt}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-cream-50/80"
          />
          <CompareTag className="left-3 top-3">Original</CompareTag>
          <CompareTag className="right-3 top-3">Result</CompareTag>
        </div>
      ) : (
        /* Single view: result or original. On coarse pointers a hold swaps
           to the original while held; a tap opens the ImageViewer. */
        <div
          className="absolute inset-0"
          onPointerDown={onSinglePointerDown}
          onPointerUp={onSinglePointerUp}
          onPointerCancel={onSinglePointerCancel}
          onPointerLeave={onSinglePointerCancel}
        >
          {/* Blurred backdrop fills the letterbox so any aspect ratio reads
              as a full-bleed stage without cropping the result. */}
          <Image
            src={singleSrc}
            alt=""
            aria-hidden
            fill
            className="scale-125 object-cover opacity-40 blur-2xl saturate-150"
            unoptimized
          />
          <div className="bg-ink-950/40 absolute inset-0" />
          <Image
            src={singleSrc}
            alt={singleAlt}
            fill
            className="object-contain motion-safe:transition-opacity motion-safe:duration-100"
            unoptimized
            priority
          />
          {showingOriginal && <CompareTag className="left-3 top-3">Original</CompareTag>}
          {hintVisible && hintEligible && (
            <p
              role="status"
              className="bg-ink-950/80 text-cream-100 absolute bottom-14 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1.5 text-xs whitespace-nowrap backdrop-blur"
            >
              Hold to see before
            </p>
          )}
        </div>
      )}

      <ImageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        src={singleSrc}
        alt={singleAlt}
        caption={showingOriginal ? "Original photo" : resultAlt}
      />
    </div>
  );
}

function CompareTag({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "shadow-elevated absolute rounded-md bg-ink-950/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cream-100 backdrop-blur",
        className
      )}
    >
      {children}
    </span>
  );
}
