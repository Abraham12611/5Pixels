"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { PublicProductAsset } from "@/types/catalog";
import { isVideoMimeType } from "@/lib/catalog/media";

function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function subscribeToCoarsePointer(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(hover: none), (pointer: coarse)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function publicUrl(asset: PublicProductAsset): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${asset.bucket}/${asset.storage_key}`;
}

interface HoverPreviewMediaProps {
  /** Static image shown at rest (poster/hero role). */
  still: PublicProductAsset | null;
  /** Short muted preview clip played on intent (preview_video role). */
  video: PublicProductAsset | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Card media per the design bible: static poster at rest; on deliberate
 * hover/focus a short muted preview fades in and plays. On touch devices the
 * preview plays while the card is mostly in the viewport instead. Reduced
 * motion always shows the still frame.
 */
export function HoverPreviewMedia({
  still,
  video,
  alt,
  sizes,
  priority,
  className,
}: HoverPreviewMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    () => false
  );
  const coarsePointer = useSyncExternalStore(
    subscribeToCoarsePointer,
    getCoarsePointer,
    () => false
  );

  const hasVideo = Boolean(video && isVideoMimeType(video.mime_type));
  const showVideo = hasVideo && !reducedMotion;

  const play = useCallback(() => {
    const v = videoRef.current;
    if (v && v.paused) void v.play().catch(() => undefined);
  }, []);

  const stop = useCallback(() => {
    const v = videoRef.current;
    if (v && !v.paused) {
      v.pause();
      v.currentTime = 0;
    }
  }, []);

  // Touch devices: viewport-controlled playback instead of hover.
  useEffect(() => {
    if (!showVideo || !coarsePointer) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            play();
          } else {
            stop();
          }
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showVideo, coarsePointer, play, stop]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full overflow-hidden", className)}
      onPointerEnter={() => {
        if (!coarsePointer) play();
      }}
      onPointerLeave={() => {
        if (!coarsePointer) stop();
      }}
      onFocusCapture={play}
      onBlurCapture={stop}
    >
      {still ? (
        <Image
          src={publicUrl(still)}
          alt={alt}
          fill
          className="media-frame object-cover"
          priority={priority}
          sizes={sizes}
          unoptimized={still.mime_type === "image/gif"}
        />
      ) : (
        <div
          className="bg-charcoal-800 media-frame h-full w-full"
          aria-label={alt}
        />
      )}

      {showVideo && (
        <video
          ref={videoRef}
          src={publicUrl(video!)}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 data-[playing=true]:opacity-100"
          onPlaying={(e) =>
            e.currentTarget.setAttribute("data-playing", "true")
          }
          onPause={(e) =>
            e.currentTarget.removeAttribute("data-playing")
          }
        />
      )}
    </div>
  );
}
