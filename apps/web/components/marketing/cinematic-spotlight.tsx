import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SectionEyebrow } from "./section-eyebrow";

const TILES = [
  "/landing/cin-tile-1.jpg",
  "/landing/cin-tile-2.jpg",
  "/landing/cin-tile-3.jpg",
];

const TRAITS = ["Mood-driven lighting", "Scene-aware", "Film-grade color"];

export function CinematicSpotlight() {
  return (
    <section className="px-4 py-6 sm:px-6">
      <div className="border-cream-100/10 bg-charcoal-850 mx-auto grid max-w-7xl overflow-hidden rounded-3xl border lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <SectionEyebrow>Cinematic presets</SectionEyebrow>
          <h2 className="font-display text-cream-50 mt-6 text-4xl leading-[1.08] tracking-tight sm:text-5xl">
            Give your photo a leading role.
          </h2>
          <p className="text-text-secondary mt-5 max-w-sm text-base leading-relaxed">
            One photo becomes a scene. Cinematic presets rebuild light, mood,
            and color around you.
          </p>
          <div className="mt-8">
            <Link
              href="/explore"
              className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
            >
              Explore cinematic looks
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
            {TRAITS.map((t) => (
              <li
                key={t}
                className="text-text-muted text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-3 p-4 sm:p-6">
          {TILES.map((src, i) => (
            <div
              key={src}
              className="relative aspect-[3/4] overflow-hidden rounded-xl"
            >
              <Image
                src={src}
                alt={`Cinematic preset example ${i + 1}`}
                fill
                sizes="(min-width: 1024px) 14vw, 30vw"
                className="media-frame object-cover"
              />
            </div>
          ))}
          <div className="bg-charcoal-850 absolute -bottom-1 left-6 w-28 rounded-xl p-1.5 shadow-elevated sm:w-32">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
              <Image
                src="/landing/cin-original.jpg"
                alt="Original photo before cinematic preset"
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
            <p className="text-text-secondary px-1 pb-0.5 pt-1.5 text-[10px] font-medium">
              Original photo
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
