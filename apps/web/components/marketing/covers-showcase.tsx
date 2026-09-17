import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { SectionEyebrow } from "./section-eyebrow";
import { ArrowCircle } from "./arrow-circle";

const COVERS = [
  {
    name: "Cover Story",
    tagline: "Turn your photo into a magazine cover.",
    image: "/landing/cover-modern.jpg",
    original: "/landing/orig-cover-1.jpg",
  },
  {
    name: "Debut Album",
    tagline: "Create album art with your photo.",
    image: "/landing/cover-debut.jpg",
    original: "/landing/orig-cover-2.jpg",
  },
  {
    name: "Culture Poster",
    tagline: "Turn moments into bold statements.",
    image: "/landing/cover-pulse.jpg",
  },
  {
    name: "Sunday Edition",
    tagline: "Bring your photo to an editorial spread.",
    image: "/landing/cover-sunday.jpg",
  },
];

export function CoversShowcase() {
  return (
    <section className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionEyebrow>Covers &amp; graphic looks</SectionEyebrow>
            <h2 className="font-display text-cream-50 mt-5 text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Put your photo on the cover.
            </h2>
            <p className="text-text-secondary mt-4 max-w-lg text-base leading-relaxed">
              Turn your image into cover art, posters, and editorial
              compositions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/explore?type=poster"
              className="bg-lime-500 text-ink-950 hover:bg-lime-400 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition"
            >
              Explore cover looks
              <ArrowRight size={15} weight="bold" />
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="border-cream-100/15 text-text-secondary flex h-10 w-10 items-center justify-center rounded-full border">
                <CaretLeft size={16} />
              </span>
              <span className="border-cream-100/15 text-text-secondary flex h-10 w-10 items-center justify-center rounded-full border">
                <CaretRight size={16} />
              </span>
            </span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {COVERS.map((cover) => (
            <Link key={cover.name} href="/explore?type=poster" className="group">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                <Image
                  src={cover.image}
                  alt={`${cover.name} preset example`}
                  fill
                  sizes="(min-width: 1024px) 22vw, 45vw"
                  className="media-frame object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                {cover.original && (
                  <span className="bg-ink-950/80 absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 backdrop-blur-sm">
                    <span className="relative h-6 w-6 overflow-hidden rounded-md">
                      <Image
                        src={cover.original}
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
                )}
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-cream-50 text-lg font-semibold">
                    {cover.name}
                  </p>
                  <p className="text-text-secondary mt-1 text-xs leading-relaxed">
                    {cover.tagline}
                  </p>
                </div>
                <ArrowCircle className="group-hover:border-lime-400 group-hover:text-lime-400 h-8 w-8" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
