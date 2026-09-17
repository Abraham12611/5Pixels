"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { SectionEyebrow } from "./section-eyebrow";
import { cn } from "@/lib/utils";

const LOOKS = [
  { name: "Cinematic Film", thumb: "/landing/thumb-cinematic-film.jpg" },
  { name: "Clean Portrait", thumb: "/landing/thumb-clean-portrait.jpg" },
  { name: "Golden Hour", thumb: "/landing/thumb-golden-hour.jpg" },
  { name: "Black & White", thumb: "/landing/thumb-black-white.jpg" },
  { name: "Moody Cool", thumb: "/landing/thumb-moody-cool.jpg" },
];

const PAIRS = [
  {
    before: "/landing/preview-1-before.jpg",
    after: "/landing/preview-1-after.jpg",
  },
  {
    before: "/landing/preview-2-before.jpg",
    after: "/landing/preview-2-after.jpg",
  },
  {
    before: "/landing/preview-3-before.jpg",
    after: "/landing/preview-3-after.jpg",
  },
];

export function PresetPreview() {
  const [active, setActive] = useState(0);

  return (
    <section className="px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionEyebrow>Preview before you commit</SectionEyebrow>
        <h2 className="font-display text-cream-50 mt-5 max-w-2xl text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          See the look on different people.
        </h2>
        <p className="text-text-secondary mt-4 max-w-lg text-base leading-relaxed">
          Pick a preset and see how it transforms real photos before you spend a
          credit.
        </p>

        <div className="mt-8 flex flex-wrap gap-3" role="tablist" aria-label="Choose a look to preview">
          {LOOKS.map((look, i) => (
            <button
              key={look.name}
              type="button"
              role="tab"
              aria-selected={active === i}
              onClick={() => setActive(i)}
              className={cn(
                "flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-xs font-semibold transition",
                active === i
                  ? "border-lime-500 bg-lime-500/10 text-cream-50"
                  : "border-cream-100/15 text-text-secondary hover:text-cream-50"
              )}
            >
              <span className="relative h-8 w-11 overflow-hidden rounded-full">
                <Image
                  src={look.thumb}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </span>
              {look.name}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PAIRS.map((pair, i) => (
            <div
              key={i}
              className="bg-charcoal-850 shadow-border flex items-center gap-3 rounded-2xl p-3"
            >
              <div className="relative flex-1">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                  <Image
                    src={pair.before}
                    alt={`Original photo ${i + 1}`}
                    fill
                    sizes="(min-width: 640px) 14vw, 45vw"
                    className="media-frame object-cover"
                  />
                </div>
                <span className="bg-ink-950/80 text-cream-50 absolute left-2 top-2 rounded-md px-2 py-1 text-[10px] font-medium backdrop-blur-sm">
                  Original
                </span>
              </div>
              <ArrowRight
                size={18}
                className="text-text-muted shrink-0"
                aria-hidden="true"
              />
              <div className="relative flex-1">
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                  <Image
                    src={pair.after}
                    alt={`${LOOKS[active].name} result ${i + 1}`}
                    fill
                    sizes="(min-width: 640px) 14vw, 45vw"
                    className="media-frame object-cover"
                  />
                </div>
                <span className="bg-lime-500 text-ink-950 absolute left-2 top-2 rounded-md px-2 py-1 text-[10px] font-semibold">
                  {LOOKS[active].name}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-text-muted mt-8 text-xs">
          Every preset shows real before and after results. What you see is what
          you can create.
        </p>
      </div>
    </section>
  );
}
