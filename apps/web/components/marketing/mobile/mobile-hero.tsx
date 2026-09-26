"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/ui/use-media-query";
import { cn } from "@/lib/utils";
import { useLandingQuickView } from "./landing-quick-view";
import type { LandingFeedItem } from "./landing-feed-types";

/**
 * Mobile hero carousel — up to three featured presets as full-bleed 4:5
 * slides (25_MOBILE_WEB_POLISH/05 §2.1). The carousel never auto-advances;
 * only the active slide's muted video loops, and reduced motion swaps it for
 * the poster frame.
 */
export function MobileHero({ items }: { items: LandingFeedItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const openQuickView = useLandingQuickView();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  if (items.length === 0) return null;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(index, items.length - 1));
  };

  return (
    <section
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured looks"
      className="px-5"
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        tabIndex={0}
        aria-label="Featured preset slides"
        className="scrollbar-none focus-visible:ring-lime-500/70 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth rounded-lg px-5 focus-visible:ring-2 focus-visible:outline-none"
      >
        {items.map((item, index) => (
          <article
            key={item.id}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}`}
            className="media-frame relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden rounded-2xl"
          >
            <Link
              href={`/presets/${item.slug}`}
              aria-label={`See ${item.name}`}
              className="absolute inset-0"
            >
              {item.previewVideoUrl && index === active && !reducedMotion ? (
                <video
                  src={item.previewVideoUrl}
                  poster={item.thumbUrl ?? undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : item.thumbUrl ? (
                <Image
                  src={item.thumbUrl}
                  alt={`${item.name} preset example`}
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                />
              ) : (
                <span className="bg-charcoal-800 absolute inset-0 flex items-center justify-center">
                  <Sparkle size={40} weight="fill" className="text-lime-400" />
                </span>
              )}
            </Link>

            <span className="bg-lime-400 text-ink-950 absolute left-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
              Preset of the week
            </span>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent p-4 pt-16">
              <h1 className="font-display text-cream-50 text-3xl leading-tight">
                {item.name}
              </h1>
              {item.shortDescription ? (
                <p className="text-cream-100/80 mt-1 line-clamp-2 text-sm">
                  {item.shortDescription}
                </p>
              ) : null}
              <div className="pointer-events-auto mt-3.5 flex items-center gap-2">
                <Button asChild variant="brand">
                  <Link href={`/app/create/${item.slug}`}>Use this look</Link>
                </Button>
                {openQuickView ? (
                  <Button
                    variant="secondary"
                    onClick={() => openQuickView(item)}
                  >
                    <Eye size={16} weight="bold" />
                    Preview
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {items.map((item, i) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "bg-lime-400 w-4" : "bg-charcoal-700 w-1.5"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
