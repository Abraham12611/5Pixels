"use client";

import {
  ArrowsOut,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "@/components/ui/dialog";
import { LAYER_CLASS } from "@/lib/ui/layers";
import { useOverlayHistory } from "@/lib/ui/use-overlay-history";
import { cn } from "@/lib/utils";

const ZOOM_STEPS = [1, 1.5, 2, 3] as const;

/**
 * Full-screen media viewer (T3). Images are rendered with a plain `img` so
 * signed, private Storage URLs work — `next/image` only accepts the public
 * object host. Zoom is exposed as explicit controls (not gesture-only) and
 * panning uses drag, so the viewer stays usable with a keyboard.
 */
export function ImageViewer({
  open,
  onOpenChange,
  src,
  alt,
  caption,
  actions,
  nested = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  caption?: string;
  /** Optional trailing controls (download, share) in the top bar. */
  actions?: ReactNode;
  /** Renders above a parent overlay (e.g. the preset quick sheet). */
  nested?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  const close = () => onOpenChange(false);

  useDialogA11y(open, panelRef);
  useOverlayHistory(open, close);

  // Each open (and each new source) starts fitted and loading again.
  const session = open ? src : null;
  const [renderedSession, setRenderedSession] = useState<string | null>(
    session
  );
  if (session !== renderedSession) {
    setRenderedSession(session);
    setZoomIndex(0);
    setStatus("loading");
  }

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const zoom = ZOOM_STEPS[zoomIndex];
  const canZoomIn = zoomIndex < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIndex > 0;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      tabIndex={-1}
      className={cn(
        "bg-ink-950 animate-overlay-in fixed inset-0 flex h-[100dvh] flex-col outline-none",
        nested ? LAYER_CLASS.nestedOverlay : LAYER_CLASS.overlay
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <ViewerControl label="Close viewer" onClick={close}>
          <X size={20} weight="bold" />
        </ViewerControl>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        {status === "loading" ? (
          <div
            role="status"
            aria-label="Loading image"
            className="bg-charcoal-800/60 absolute inset-6 animate-pulse rounded-2xl"
          />
        ) : null}

        {status === "error" ? (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <p className="text-cream-50 text-[15px] font-semibold">
              This image could not be loaded
            </p>
            <p className="text-text-secondary text-sm">
              The link may have expired. Close the viewer and open it again.
            </p>
          </div>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs are outside next/image's allowed patterns */}
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          draggable={false}
          style={{ transform: `scale(${zoom})` }}
          className={cn(
            "mx-auto h-full w-full object-contain transition-transform duration-200 ease-out motion-reduce:transition-none",
            status === "ready" ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
        {caption ? (
          <p className="text-text-secondary min-w-0 truncate text-[13px]">
            {caption}
          </p>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <ViewerControl
            label="Zoom out"
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            disabled={!canZoomOut}
          >
            <MagnifyingGlassMinus size={20} />
          </ViewerControl>
          <ViewerControl
            label="Zoom in"
            onClick={() =>
              setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
            }
            disabled={!canZoomIn}
          >
            <MagnifyingGlassPlus size={20} />
          </ViewerControl>
          <ViewerControl
            label="Fit to screen"
            onClick={() => setZoomIndex(0)}
            disabled={!canZoomOut}
          >
            <ArrowsOut size={20} />
          </ViewerControl>
        </div>
      </div>
    </div>
  );
}

function ViewerControl({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 focus-visible:ring-offset-ink-950 flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-lime-500/70 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
