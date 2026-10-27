"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";

export interface LaunchCarouselCard {
  id: string;
  eyebrow: string;
  title: string;
  tagline: string;
  href: string;
  /** Resolved public asset URL — null renders a gradient placeholder. */
  imageUrl: string | null;
  imageAlt: string;
}

/** Triple the deck so the track can loop seamlessly in both directions. */
const COPIES = 3;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function LaunchCarousel({ cards }: { cards: LaunchCarouselCard[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const normalizing = useRef(false);

  // Jump to the middle copy on mount so there's scrollable deck on both sides.
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = track.scrollWidth / COPIES;
  }, [cards.length]);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || normalizing.current) return;
    const segment = track.scrollWidth / COPIES;
    if (segment <= 0) return;
    if (track.scrollLeft < segment * 0.5 || track.scrollLeft >= segment * 1.5) {
      normalizing.current = true;
      track.scrollLeft =
        track.scrollLeft < segment * 0.5
          ? track.scrollLeft + segment
          : track.scrollLeft - segment;
      requestAnimationFrame(() => {
        normalizing.current = false;
      });
    }
  }, []);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild;
    const step = card ? card.clientWidth + 20 : 400;
    track.scrollBy({
      left: direction * step,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  if (cards.length === 0) return null;

  const deck = Array.from({ length: COPIES }, () => cards).flat();

  return (
    <section
      aria-label="Launches and featured presets"
      className="group/carousel relative pt-3 md:pt-5"
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        role="region"
        aria-roledescription="carousel"
        aria-label="Launch carousel — scroll horizontally"
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 sm:px-6 lg:px-10"
      >
        {deck.map((card, i) => (
          <Link
            key={`${card.id}-${i}`}
            href={card.href}
            prefetch={false}
            aria-hidden={i >= cards.length && i < cards.length * 2 ? undefined : true}
            tabIndex={i >= cards.length && i < cards.length * 2 ? 0 : -1}
            className="group focus-visible:outline-lime-400 relative grid w-[19.5rem] shrink-0 snap-start grid-flow-row gap-3 rounded-xl transition active:brightness-75 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-[25rem] xl:w-[32rem]"
          >
            <figure
              className="bg-charcoal-850 relative overflow-hidden rounded-xl"
              style={{ aspectRatio: "16 / 9" }}
            >
              {card.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt={card.imageAlt}
                  fill
                  sizes="(max-width: 640px) 312px, (max-width: 1280px) 400px, 512px"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="from-charcoal-800 to-ink-950 h-full w-full bg-gradient-to-br" />
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[-0.5px_-0.5px_1px_0_rgba(255,255,255,0.14)_inset,0.8px_0.5px_0.5px_0_rgba(27,27,27,0.2)_inset]"
              />
            </figure>
            <div className="grid grid-rows-2 text-left">
              <h3 className="text-cream-50 truncate text-sm font-bold tracking-tight uppercase transition group-hover:text-[#D1FE17] md:text-base">
                {card.title}
              </h3>
              <p className="text-text-secondary truncate text-xs xl:text-sm">
                {card.tagline}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Subtle edge fades */}
      <div
        aria-hidden
        className="from-ink-950/70 pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r to-transparent sm:w-10"
      />
      <div
        aria-hidden
        className="from-ink-950/70 pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l to-transparent sm:w-10"
      />

      {/* Arrows — revealed on hover over the carousel, centered on the 16:9 media frame */}
      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        aria-label="Scroll launches backward"
        className="bg-ink-950/80 text-cream-50 hover:bg-ink-900 focus-visible:outline-lime-400 absolute top-[40%] left-6 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 p-2.5 opacity-0 backdrop-blur-md transition-opacity group-hover/carousel:opacity-100 hover:text-[#D1FE17] focus-visible:opacity-100 focus-visible:outline-2 md:flex lg:left-12"
      >
        <ArrowLeft size={18} weight="bold" />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        aria-label="Scroll launches forward"
        className="bg-ink-950/80 text-cream-50 hover:bg-ink-900 focus-visible:outline-lime-400 absolute top-[40%] right-6 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/10 p-2.5 opacity-0 backdrop-blur-md transition-opacity group-hover/carousel:opacity-100 hover:text-[#D1FE17] focus-visible:opacity-100 focus-visible:outline-2 md:flex lg:right-12"
      >
        <ArrowRight size={18} weight="bold" />
      </button>
    </section>
  );
}
