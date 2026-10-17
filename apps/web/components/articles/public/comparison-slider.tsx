"use client";

import { ArrowsLeftRight } from "@phosphor-icons/react";
import { useRef, useState } from "react";

/**
 * Before/after comparison block (#131).
 *   side-by-side — static two-up grid
 *   slider       — draggable clip slider; the same value is also exposed as
 *                  input[type=range] so it works with keyboard and SRs.
 */
export function ComparisonSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  mode,
  caption,
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  mode: "side-by-side" | "slider";
  caption?: string;
}) {
  const [position, setPosition] = useState(50);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function updateFromPointer(clientX: number) {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, Math.round(pct * 10) / 10)));
  }

  if (mode === "side-by-side") {
    return (
      <figure className="my-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { src: beforeSrc, alt: beforeAlt, label: "Before" },
            { src: afterSrc, alt: afterAlt, label: "After" },
          ].map((img) => (
            <div key={img.label} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL */}
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="bg-charcoal-850 h-auto w-full rounded-xl object-cover"
              />
              <span className="bg-ink-950/70 text-cream-50 absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-medium">
                {img.label}
              </span>
            </div>
          ))}
        </div>
        {caption ? (
          <figcaption className="text-text-muted mt-2 text-center text-sm">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure className="my-6">
      <div
        ref={trackRef}
        role="group"
        aria-label="Before and after image comparison"
        className="bg-charcoal-850 relative touch-none overflow-hidden rounded-xl select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) updateFromPointer(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL */}
        <img
          src={afterSrc}
          alt={afterAlt}
          draggable={false}
          className="block h-auto w-full"
        />
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL */}
          <img
            src={beforeSrc}
            alt={beforeAlt}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div
          aria-hidden="true"
          className="bg-cream-50/90 absolute top-0 bottom-0 w-0.5"
          style={{ left: `${position}%` }}
        >
          <span className="bg-ink-950 text-cream-50 absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg">
            <ArrowsLeftRight size={16} weight="bold" />
          </span>
        </div>
        <span className="bg-ink-950/70 text-cream-50 absolute top-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-medium">
          Before
        </span>
        <span className="bg-ink-950/70 text-cream-50 absolute top-2 right-2 rounded-md px-2 py-0.5 text-[11px] font-medium">
          After
        </span>
      </div>
      <label className="mt-3 flex items-center gap-3">
        <span className="text-text-muted text-xs">Before</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={position}
          aria-label="Comparison position"
          onChange={(e) => setPosition(Number(e.target.value))}
          className="accent-lime-500 h-1.5 flex-1 cursor-pointer"
        />
        <span className="text-text-muted text-xs">After</span>
      </label>
      {caption ? (
        <figcaption className="text-text-muted mt-2 text-center text-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
