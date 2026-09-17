import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SectionEyebrow } from "./section-eyebrow";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    label: "Original",
    preset: false,
    image: "/landing/fan-1.jpg",
    rotate: "-rotate-6",
    z: "z-10",
  },
  {
    label: "Cinematic Warm",
    preset: true,
    image: "/landing/fan-2.jpg",
    rotate: "-rotate-2",
    z: "z-20",
  },
  {
    label: "Clean Editorial",
    preset: true,
    image: "/landing/fan-3.jpg",
    rotate: "rotate-2",
    z: "z-30",
  },
  {
    label: "Illustrated",
    preset: true,
    image: "/landing/fan-4.jpg",
    rotate: "rotate-6",
    z: "z-40",
  },
];

export function FanShowcase() {
  return (
    <section className="px-4 py-6 sm:px-6">
      <div className="bg-cream-50 mx-auto grid max-w-7xl items-center gap-12 overflow-hidden rounded-3xl p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
        <div>
          <SectionEyebrow light>Same photo, new possibilities</SectionEyebrow>
          <h2 className="font-display text-ink-950 mt-6 text-4xl leading-[1.08] tracking-tight sm:text-5xl">
            One photo. More ways to see yourself.
          </h2>
          <p className="text-ink-950/60 mt-5 max-w-sm text-base leading-relaxed">
            Explore a different direction with every preset you try.
          </p>
          <div className="mt-8">
            <Link
              href="/explore"
              className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
            >
              Find your next look
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
          <p className="text-ink-950/45 mt-8 text-xs">
            Each look is created separately.
          </p>
        </div>

        <div className="flex items-end justify-center">
          {CARDS.map((card) => (
            <div
              key={card.label}
              className={cn(
                "relative w-40 shrink-0 sm:w-44 lg:w-48",
                card.rotate,
                card.z,
                "-mx-4 sm:-mx-5"
              )}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl shadow-elevated">
                <Image
                  src={card.image}
                  alt={`${card.label} version of the same photo`}
                  fill
                  sizes="(min-width: 1024px) 15vw, 30vw"
                  className="object-cover"
                />
              </div>
              <span className="bg-ink-950 text-cream-50 absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold">
                {card.label}
                {card.preset && (
                  <span className="text-cream-50/50 font-medium">Preset</span>
                )}
                {card.preset && <ArrowRight size={11} weight="bold" />}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
