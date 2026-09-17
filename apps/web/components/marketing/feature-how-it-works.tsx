import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SectionEyebrow } from "./section-eyebrow";
import { ArrowCircle } from "./arrow-circle";

const RAIL = [
  {
    name: "Golden Hour",
    tags: "Warm & cinematic",
    image: "/landing/rail-golden-hour.jpg",
  },
  {
    name: "Urban Film",
    tags: "Moody & modern",
    image: "/landing/rail-urban-film.jpg",
  },
  {
    name: "Crisp Nature",
    tags: "Clean & vibrant",
    image: "/landing/rail-crisp-nature.jpg",
  },
  {
    name: "Retro Print",
    tags: "Nostalgic & bold",
    image: "/landing/rail-retro-print.jpg",
  },
  {
    name: "Monochrome",
    tags: "Timeless & classic",
    image: "/landing/rail-monochrome.jpg",
  },
];

export function FeatureHowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Feature hero */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionEyebrow>Photo presets for real creators</SectionEyebrow>
            <h2 className="font-display text-cream-50 mt-5 text-4xl leading-[1.08] tracking-tight sm:text-5xl">
              Extraordinary looks for your ordinary photos.
            </h2>
            <p className="text-text-secondary mt-5 max-w-md text-base leading-relaxed">
              Turn your photos into something more with curated presets made
              for real life.
            </p>
            <div className="mt-8">
              <Link
                href="/explore"
                className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
              >
                Explore presets
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <Image
                  src="/landing/feat-portrait.jpg"
                  alt="Portrait enhanced with a warm preset"
                  fill
                  sizes="(min-width: 1024px) 30vw, 60vw"
                  className="media-frame object-cover"
                />
              </div>
            </div>
            <div className="flex w-36 shrink-0 flex-col items-center gap-3 sm:w-44">
              <div className="bg-charcoal-850 w-full rounded-xl p-1.5">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                  <Image
                    src="/landing/feat-hero-before.jpg"
                    alt="Photo before transformation"
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                </div>
                <p className="text-text-secondary px-1 pb-0.5 pt-1.5 text-[10px] font-medium">
                  Before
                </p>
              </div>
              <ArrowRight
                size={18}
                className="text-lime-400 rotate-90"
                aria-hidden="true"
              />
              <div className="bg-charcoal-850 w-full rounded-xl p-1.5">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                  <Image
                    src="/landing/feat-hero-after.jpg"
                    alt="Photo after Film Glow preset"
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                </div>
                <p className="text-text-secondary px-1 pb-0.5 pt-1.5 text-[10px] font-medium">
                  After · Film Glow
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Featured rail */}
        <div className="mt-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <SectionEyebrow>Featured looks</SectionEyebrow>
              <h3 className="font-display text-cream-50 mt-5 text-3xl leading-tight tracking-tight sm:text-4xl">
                Looks worth sharing.
              </h3>
              <p className="text-text-secondary mt-3 max-w-md text-sm leading-relaxed">
                Handpicked presets. Real results. Your photos, next level.
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

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {RAIL.map((item) => (
              <Link
                key={item.name}
                href="/explore"
                className="group bg-charcoal-850 shadow-border overflow-hidden rounded-2xl"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={item.image}
                    alt={`${item.name} preset`}
                    fill
                    sizes="(min-width: 1024px) 18vw, 45vw"
                    className="media-frame object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="font-display text-cream-50 truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="text-text-muted mt-0.5 truncate text-[10px] font-medium uppercase tracking-[0.14em]">
                      {item.tags}
                    </p>
                  </div>
                  <ArrowCircle className="group-hover:border-lime-400 group-hover:text-lime-400 h-7 w-7" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="border-cream-100/10 bg-charcoal-850 mt-24 rounded-3xl border p-8 sm:p-12">
          <SectionEyebrow>How it works</SectionEyebrow>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <h3 className="font-display text-cream-50 text-3xl leading-tight tracking-tight sm:text-4xl">
              A new look. A simple process.
            </h3>
            <Link
              href="/explore"
              className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition"
            >
              Choose your first look
              <ArrowRight size={15} weight="bold" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="bg-charcoal-850 shadow-border rounded-2xl p-5">
              <p className="text-lime-400 text-[11px] font-semibold uppercase tracking-[0.16em]">
                1 · Pick your preset
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { src: "/landing/rail-urban-film.jpg", name: "Urban Film" },
                  { src: "/landing/rail-golden-hour.jpg", name: "Golden Hour" },
                  { src: "/landing/rail-retro-print.jpg", name: "Retro Print" },
                ].map((t, i) => (
                  <div
                    key={t.name}
                    className={`relative aspect-square overflow-hidden rounded-lg ${
                      i === 1 ? "ring-lime-500 ring-2" : ""
                    }`}
                  >
                    <Image
                      src={t.src}
                      alt={t.name}
                      fill
                      sizes="110px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              <p className="text-text-secondary mt-4 text-sm leading-relaxed">
                Browse curated looks and choose the one that fits.
              </p>
            </div>

            <div className="bg-charcoal-850 shadow-border rounded-2xl p-5">
              <p className="text-lime-400 text-[11px] font-semibold uppercase tracking-[0.16em]">
                2 · Upload your photo
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src="/landing/orig-woman.jpg"
                    alt="Example source photo"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="border-cream-100/20 text-text-muted flex-1 rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                  Upload your photo
                  <span className="mt-0.5 block text-[10px]">
                    JPG, PNG or HEIC
                  </span>
                </div>
              </div>
              <p className="text-text-secondary mt-4 text-sm leading-relaxed">
                A clear photo gives the best result.
              </p>
            </div>

            <div className="bg-charcoal-850 shadow-border rounded-2xl p-5">
              <p className="text-lime-400 text-[11px] font-semibold uppercase tracking-[0.16em]">
                3 · Make it yours
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src="/landing/preview-1-after.jpg"
                    alt="Finished result"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <span className="bg-lime-500 text-ink-950 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold">
                  Download
                </span>
              </div>
              <p className="text-text-secondary mt-4 text-sm leading-relaxed">
                Adjust the look, generate, and keep the result.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
