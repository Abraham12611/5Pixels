import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SectionEyebrow } from "./section-eyebrow";
import { ArrowCircle } from "./arrow-circle";

const PRESET_CARDS = [
  {
    name: "Midnight Premiere",
    tags: "Cinematic · Moody · Bold",
    image: "/landing/hero-midnight-after.jpg",
    original: "/landing/hero-midnight-before.jpg",
  },
  {
    name: "Studio Standard",
    tags: "Clean · Timeless · Natural",
    image: "/landing/hero-studio-after.jpg",
    original: "/landing/hero-studio-before.jpg",
  },
  {
    name: "Paper Persona",
    tags: "Artistic · Expressive · Unique",
    image: "/landing/hero-paper-after.jpg",
    original: "/landing/hero-paper-before.jpg",
  },
];

const CATEGORIES = [
  {
    name: "Portraits",
    tagline: "Everyday to extraordinary",
    image: "/landing/cat-portraits.jpg",
  },
  {
    name: "Cinematic",
    tagline: "Movie-worthy moments",
    image: "/landing/cat-cinematic.jpg",
  },
  {
    name: "Covers",
    tagline: "Editorial in minutes",
    image: "/landing/cat-covers.jpg",
  },
  {
    name: "Illustration",
    tagline: "Turn photos into art",
    image: "/landing/cat-illustration.jpg",
  },
  {
    name: "Professional",
    tagline: "Polished and confident",
    image: "/landing/cat-professional.jpg",
  },
];

export function HeroLanding() {
  return (
    <section className="px-4 pt-14 sm:px-6 lg:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <SectionEyebrow>Curated AI photo transformations</SectionEyebrow>
            <h1 className="font-display text-cream-50 mt-6 text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Pick the look.
              <br />
              Make it yours.
            </h1>
            <p className="text-text-secondary mt-6 max-w-md text-lg leading-relaxed">
              Choose a preset, upload your photo, and let 5Pixels handle the
              rest.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
              >
                Explore presets
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href="#how-it-works"
                className="border-cream-100/15 text-cream-50 hover:border-cream-100/30 inline-flex items-center rounded-full border px-6 py-3 text-sm font-semibold transition"
              >
                See how it works
              </Link>
            </div>
            <p className="text-text-muted mt-6 text-xs font-semibold uppercase tracking-[0.18em]">
              No prompt required.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {PRESET_CARDS.map((card) => (
              <Link
                key={card.name}
                href="/explore"
                className="group bg-charcoal-850 shadow-border overflow-hidden rounded-2xl"
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={card.image}
                    alt={`${card.name} preset result`}
                    fill
                    sizes="(min-width: 1024px) 20vw, 33vw"
                    className="media-frame object-cover"
                  />
                  <span className="bg-ink-950/80 absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 backdrop-blur-sm">
                    <span className="relative h-6 w-6 overflow-hidden rounded-md">
                      <Image
                        src={card.original}
                        alt=""
                        fill
                        sizes="24px"
                        className="object-cover"
                      />
                    </span>
                    <span className="text-cream-50 text-[10px] font-medium">
                      Original
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="font-display text-cream-50 truncate text-base font-semibold">
                      {card.name}
                    </p>
                    <p className="text-text-muted mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em]">
                      {card.tags}
                    </p>
                  </div>
                  <ArrowCircle className="group-hover:border-lime-400 group-hover:text-lime-400 h-8 w-8" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 pb-20 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href="/categories"
              className="group relative flex aspect-[8/5] items-end overflow-hidden rounded-2xl"
            >
              <Image
                src={cat.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 18vw, 45vw"
                className="media-frame object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="from-ink-950/85 via-ink-950/40 absolute inset-0 bg-gradient-to-t to-transparent" />
              <span className="relative flex w-full items-end justify-between gap-2 p-4">
                <span>
                  <span className="text-cream-50 block text-sm font-semibold">
                    {cat.name}
                  </span>
                  <span className="text-cream-50/70 mt-0.5 block text-[11px]">
                    {cat.tagline}
                  </span>
                </span>
                <ArrowCircle className="group-hover:border-lime-400 group-hover:text-lime-400 h-8 w-8 backdrop-blur-sm" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
