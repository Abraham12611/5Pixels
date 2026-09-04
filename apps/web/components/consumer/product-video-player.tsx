"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Play, Pause, VolumeX } from "lucide-react";

interface ProductVideoPlayerProps {
  publicUrl: string;
  posterUrl?: string;
  label: string;
}

function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToReducedMotion(
  callback: (matches: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

export function ProductVideoPlayer({
  publicUrl,
  posterUrl,
  label,
}: ProductVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    (callback) => subscribeToReducedMotion(callback),
    getReducedMotion,
    () => false
  );

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);

  return (
    <div className="border-cream-100/10 bg-charcoal-850 relative overflow-hidden rounded-2xl border">
      <video
        ref={videoRef}
        src={publicUrl}
        poster={posterUrl}
        loop
        muted
        playsInline
        preload="metadata"
        onPlay={onPlay}
        onPause={onPause}
        aria-label={label}
        className="aspect-video w-full object-cover"
      />

      {(!isPlaying || prefersReducedMotion) && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40">
          <button
            type="button"
            onClick={toggle}
            disabled={prefersReducedMotion}
            className="bg-lime-500 text-ink-950 hover:bg-lime-400 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition disabled:opacity-50"
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-1 h-6 w-6" />
            )}
          </button>
        </div>
      )}

      <div className="absolute right-3 top-3 rounded-full bg-ink-950/70 px-2 py-1 text-xs text-cream-50 backdrop-blur-sm">
        <VolumeX className="mr-1 inline h-3 w-3" aria-hidden />
        Preview
      </div>
    </div>
  );
}
