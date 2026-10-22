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
    const step = card ? card.clientWidth + 16 : 320;
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
      className="relative pt-6 md:pt-10"
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        role="region"
        aria-roledescription="carousel"
        aria-label="Launch carousel — scroll horizontally"
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-6 lg:px-10"
      >
        {deck.map((card, i) => (
          <Link
            key={`${card.id}-${i}`}
            href={card.href}
            prefetch={false}
            aria-hidden={i >= cards.length && i < cards.length * 2 ? undefined : true}
            tabIndex={i >= cards.length && i < cards.length * 2 ? 0 : -1}
            className="group bg-charcoal-850 border-cream-100/10 hover:border-lime-500/40 focus-visible:outline-lime-400 relative w-[19rem] shrink-0 snap-start overflow-hidden rounded-2xl border focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-[24rem] md:w-[27rem]"
          >
            <div className="relative aspect-[4/3] overflow-hidden md:aspect-[16/10]">
              {card.imageUrl ? (
                <Image
                  src={card.imageUrl}
                  alt={card.imageAlt}
                  fill
                  sizes="(max-width: 640px) 304px, (max-width: 768px) 384px, 432px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="from-charcoal-800 to-ink-950 h-full w-full bg-gradient-to-br" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 md:p-5">
                <span className="text-lime-400 text-[10px] font-bold tracking-[0.18em] uppercase">
                  {card.eyebrow}
                </span>
                <span className="text-cream-50 text-xl font-bold tracking-tight md:text-2xl">
                  {card.title}
                </span>
                <span className="text-cream-100/80 line-clamp-2 text-sm">
                  {card.tagline}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Edge fades */}
      <div
        aria-hidden
        className="from-ink-950 pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r to-transparent sm:w-16"
      />
      <div
        aria-hidden
        className="from-ink-950 pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent sm:w-16"
      />

      {/* Arrows — pointer scrolling works everywhere; buttons help desktop. */}
      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        aria-label="Scroll launches backward"
        className="bg-ink-950/80 text-cream-50 hover:bg-ink-900 hover:text-lime-400 focus-visible:outline-lime-400 absolute top-1/2 left-6 hidden -translate-y-1/2 items-center justify-center rounded-full p-2.5 backdrop-blur-sm focus-visible:outline-2 md:flex lg:left-12"
      >
        <ArrowLeft size={18} weight="bold" />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        aria-label="Scroll launches forward"
        className="bg-ink-950/80 text-cream-50 hover:bg-ink-900 hover:text-lime-400 focus-visible:outline-lime-400 absolute top-1/2 right-6 hidden -translate-y-1/2 items-center justify-center rounded-full p-2.5 backdrop-blur-sm focus-visible:outline-2 md:flex lg:right-12"
      >
        <ArrowRight size={18} weight="bold" />
      </button>
    </section>
  );
}
