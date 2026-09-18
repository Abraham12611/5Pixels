"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LandingFeedItem } from "./landing-feed-types";

/**
 * Mobile hero — one dominant featured-preset card, swipeable through the top
 * featured looks. "Try this look" goes straight into the studio; tapping the
 * art opens the preset detail.
 */
export function MobileHero({ items }: { items: LandingFeedItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (items.length === 0) return null;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(index, items.length - 1));
  };

  return (
    <section aria-label="Featured looks" className="px-4">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4"
      >
        {items.map((item) => (
          <article
            key={item.id}
            className="media-frame relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden rounded-2xl"
          >
            <Link
              href={`/presets/${item.slug}`}
              aria-label={`See ${item.name}`}
              className="absolute inset-0"
            >
              {item.thumbUrl ? (
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
                  <Link href={`/app/create/${item.slug}`}>Try this look</Link>
                </Button>
                <Button asChild variant="secondary" size="icon" aria-label={`Open ${item.name} details`}>
                  <Link href={`/presets/${item.slug}`}>
                    <ArrowUpRight size={16} weight="bold" />
                  </Link>
                </Button>
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
