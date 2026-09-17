import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart } from "@phosphor-icons/react/dist/ssr";
import { SectionEyebrow } from "./section-eyebrow";

const CHIPS = ["Featured", "Portraits", "Cinematic", "Covers", "Illustration"];

const CARDS = [
  {
    name: "Midnight Premiere",
    category: "Cinematic",
    tagline: "Moody tones. Cinematic atmosphere.",
    image: "/landing/hero-midnight-after.jpg",
    aspect: "aspect-[3/4]",
  },
  {
    name: "Softbox Portrait",
    category: "Portraits",
    tagline: "Clean. Natural. Effortless.",
    image: "/landing/gal-softbox.jpg",
    aspect: "aspect-[3/4]",
  },
  {
    name: "Analog Weekend",
    category: "Lifestyle",
    tagline: "Film vibes for everyday moments.",
    image: "/landing/gal-analog.jpg",
    aspect: "aspect-[4/3]",
  },
  {
    name: "Paper Persona",
    category: "Illustration",
    tagline: "Turn your photos into art.",
    image: "/landing/gal-paper.jpg",
    aspect: "aspect-[4/3]",
  },
  {
    name: "Cover Story",
    category: "Covers",
    tagline: "Magazine-ready in seconds.",
    image: "/landing/gal-next.jpg",
    aspect: "aspect-[4/3]",
  },
  {
    name: "Painted Light",
    category: "Creative",
    tagline: "Dreamy color. Cinematic mood.",
    image: "/landing/gal-painted.jpg",
    aspect: "aspect-[3/4]",
  },
];

export function LookGallery() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionEyebrow>Curated presets</SectionEyebrow>
            <h2 className="font-display text-cream-50 mt-5 text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find your next look.
            </h2>
            <p className="text-text-secondary mt-4 max-w-md text-base leading-relaxed">
              Professionally designed presets. Ready for your photo.
            </p>
          </div>
          <Link
            href="/explore"
            className="border-cream-100/15 text-cream-50 hover:border-cream-100/30 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition"
          >
            View all presets
            <ArrowRight size={15} weight="bold" />
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          {CHIPS.map((chip, i) => (
            <span
              key={chip}
              className={
                i === 0
                  ? "bg-lime-500 text-ink-950 rounded-full px-4 py-2 text-xs font-semibold"
                  : "border-cream-100/15 text-text-secondary rounded-full border px-4 py-2 text-xs font-medium"
              }
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-10 columns-2 gap-4 lg:columns-4 [&>*]:mb-4">
          {CARDS.map((card) => (
            <Link
              key={card.name}
              href="/explore"
              className="group bg-charcoal-850 shadow-border block break-inside-avoid overflow-hidden rounded-2xl"
            >
              <div className={`relative ${card.aspect}`}>
                <Image
                  src={card.image}
                  alt={`${card.name} preset`}
                  fill
                  sizes="(min-width: 1024px) 24vw, 50vw"
                  className="media-frame object-cover"
                />
                <span className="bg-ink-950/70 text-cream-50 absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm">
                  <Heart size={15} />
                </span>
              </div>
              <div className="p-4">
                <p className="text-text-muted text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {card.category}
                </p>
                <p className="font-display text-cream-50 mt-1.5 text-lg font-semibold">
                  {card.name}
                </p>
                <p className="text-text-secondary mt-1 text-xs leading-relaxed">
                  {card.tagline}
                </p>
                <span className="border-cream-100/15 text-cream-50 group-hover:border-lime-400 group-hover:text-lime-400 mt-3.5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition">
                  View look
                  <ArrowRight size={12} weight="bold" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
