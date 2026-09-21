import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    name: "Golden Hour",
    tags: "Warm · Cinematic · Natural",
    result: "/landing/light-golden-after.jpg",
    original: "/landing/light-golden-before.jpg",
    rotate: "-rotate-3",
    thumb: "/landing/light-golden-after.jpg",
  },
  {
    name: "Mediterranean",
    tags: "Vibrant · Film · Timeless",
    result: "/landing/light-med-after.jpg",
    original: "/landing/light-med-before.jpg",
    rotate: "rotate-2",
    thumb: "/landing/light-med-after.jpg",
  },
  {
    name: "Vivid Pets",
    tags: "Crisp · Colorful · True to life",
    result: "/landing/light-pets-after.jpg",
    original: "/landing/light-pets-before.jpg",
    rotate: "-rotate-2",
    thumb: "/landing/light-pets-after.jpg",
  },
];

export function LightBreak() {
  return (
    <section className="px-4 py-6 pb-24 sm:px-6">
      <div className="bg-cream-50 relative mx-auto max-w-7xl overflow-hidden rounded-3xl px-6 py-16 sm:px-12 sm:py-20">
        {/* Decor: botanical leaves, bottom-left */}
        <div className="pointer-events-none absolute -bottom-8 -left-10 h-56 w-56 opacity-90" aria-hidden="true">
          <Image
            src="/landing/deco-monstera.jpg"
            alt=""
            fill
            sizes="224px"
            className="object-contain mix-blend-multiply"
          />
        </div>

        <div className="relative mx-auto max-w-2xl text-center">
          <span aria-hidden="true" className="mx-auto flex w-fit gap-[4px]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="bg-ink-950/80 h-2 w-2 rounded-[2px]" />
            ))}
            <span className="bg-lime-500 h-2 w-2 rounded-[2px]" />
          </span>
          <h2 className="font-display text-ink-950 mt-6 text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            You choose the look.
            <br />
            We handle the rest.
          </h2>
          <p className="text-ink-950/60 mt-5 text-base leading-relaxed">
            Curated transformations without the technical setup.
          </p>
          <div className="mt-8">
            <Link
              href="/explore"
              className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
            >
              Find a look
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
          <p className="text-ink-950/45 mt-6 text-[11px] font-semibold uppercase tracking-[0.2em]">
            No prompt required.
          </p>
        </div>

        <div className="relative mt-14 flex flex-wrap items-start justify-center gap-6 lg:gap-10">
          {CARDS.map((card, i) => (
            <div
              key={card.name}
              className={cn("relative w-56 sm:w-64", card.rotate)}
            >
              {/* Polaroid frame */}
              <div className="rounded-xl bg-white p-2 pb-3 shadow-elevated">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                  <Image
                    src={card.result}
                    alt={`${card.name} preset result`}
                    fill
                    sizes="(min-width: 640px) 20vw, 60vw"
                    className="object-cover"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="relative h-7 w-7 overflow-hidden rounded-md">
                      <Image
                        src={card.thumb}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </span>
                    <span>
                      <span className="text-ink-950 block text-xs font-semibold">
                        {card.name}
                      </span>
                      <span className="text-ink-950/50 block text-[9px]">
                        {card.tags}
                      </span>
                    </span>
                  </div>
                  <ArrowRight size={13} className="text-ink-950/60" />
                </div>
              </div>

              {/* Overlapping Original mini-card */}
              <div
                className={cn(
                  "absolute top-0 w-20 rounded-lg bg-white p-1 pb-1.5 shadow-elevated sm:w-24",
                  i % 2 === 0 ? "-left-5 -rotate-6" : "-right-5 rotate-6"
                )}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-md">
                  <Image
                    src={card.original}
                    alt="Original photo"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <p className="text-ink-950/60 px-0.5 pt-1 text-[8px] font-semibold uppercase tracking-wider">
                  Original
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Handwritten note */}
        <p className="font-display text-ink-950/55 relative mx-auto mt-12 w-fit -rotate-2 text-sm italic tracking-wide">
          Same photo.
          <br />
          A whole new feeling.
        </p>
      </div>
    </section>
  );
}
