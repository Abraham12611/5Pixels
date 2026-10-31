import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { PromoBanner as PromoBannerConfig } from "@/lib/marketing/landing-content";

interface PromoBannerProps {
  banner: PromoBannerConfig;
  /** Resolved image URL for banner.presetSlug — null = plain gradient. */
  imageUrl: string | null;
  imageAlt: string;
}

/** Full-bleed marketing banner interleaved between preset shelves. */
export function PromoBanner({ banner, imageUrl, imageAlt }: PromoBannerProps) {
  return (
    <section className="px-4 pt-10 sm:px-6 md:pt-14 lg:px-10">
      <Link
        href={banner.href}
        prefetch={false}
        className="group border-cream-100/10 hover:border-lime-500/40 focus-visible:outline-lime-400 relative block overflow-hidden rounded-2xl border focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <div className="relative aspect-[16/10] sm:aspect-[21/9]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(max-width: 640px) 100vw, 1200px"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="from-charcoal-800 to-ink-950 h-full w-full bg-gradient-to-br" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6 md:max-w-xl md:p-10">
            <span className="text-lime-400 text-[10px] font-bold tracking-[0.18em] uppercase">
              {banner.eyebrow}
            </span>
            <p className="text-cream-50 text-2xl font-bold tracking-tight md:text-4xl">
              {banner.title}
            </p>
            <p className="text-cream-100/80 max-w-md text-sm md:text-base">
              {banner.body}
            </p>
            <span className="bg-lime-400 text-ink-950 group-hover:bg-lime-300 mt-3 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition">
              {banner.ctaLabel}
              <ArrowRight size={14} weight="bold" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
