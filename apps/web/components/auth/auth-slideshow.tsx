"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5000;

const SLIDES = [
  {
    src: "/landing/pro-hero-after.jpg",
    title: "Studio-grade portraits",
    tagline: "Professional headshots from a single photo",
    chips: ["Portraits", "Studio Standard"],
  },
  {
    src: "/landing/cover-modern.jpg",
    title: "Magazine covers",
    tagline: "Put yourself on the cover in seconds",
    chips: ["Posters", "Editorial"],
  },
  {
    src: "/landing/gal-analog.jpg",
    title: "Film & analog looks",
    tagline: "Warm film grain, halation, and retro print",
    chips: ["Filters", "Analog"],
  },
  {
    src: "/landing/feat-portrait.jpg",
    title: "Perfect light, every time",
    tagline: "Golden-hour glow without the golden hour",
    chips: ["Lighting", "Golden Hour"],
  },
] as const;

/**
 * Showcase rail inside the auth modal (desktop only — hidden below `sm`).
 * Auto-rotates every 5s; pauses entirely under prefers-reduced-motion.
 * Tab pills jump to a slide and reset the clock.
 */
export function AuthSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [paused, active]);

  return (
    <div
      className="relative hidden h-full overflow-hidden sm:block"
      aria-roledescription="carousel"
      aria-label="What you can create with 5Pixels"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt=""
          fill
          sizes="(min-width: 640px) 45vw"
          priority={i === 0}
          className={cn(
            "object-cover transition-opacity duration-700",
            i === active ? "opacity-100" : "opacity-0"
          )}
          aria-hidden={i !== active || undefined}
        />
      ))}

      {/* Legibility gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-ink-950/10"
      />

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SLIDES[active].chips.map((chip) => (
            <span
              key={chip}
              className="bg-cream-100/15 text-cream-50 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm"
            >
              {chip}
            </span>
          ))}
        </div>
        <p className="text-cream-50 text-lg font-semibold leading-snug">
          {SLIDES[active].title}
        </p>
        <p className="text-cream-100/80 mt-0.5 text-sm">
          {SLIDES[active].tagline}
        </p>

        {/* Slide pills */}
        <div className="mt-4 flex gap-1.5" role="tablist" aria-label="Slides">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Slide ${i + 1}: ${slide.title}`}
              onClick={() => setActive(i)}
              className={cn(
                "h-1.5 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-lime-500/70 focus-visible:outline-none",
                i === active
                  ? "bg-cream-50 w-6"
                  : "bg-cream-100/30 hover:bg-cream-100/50 w-3"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
