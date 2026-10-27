import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { ProductCard } from "@/components/consumer/product-card";
import type { PublicProductSummary } from "@/types/catalog";

interface PresetShelfProps {
  id: string;
  title: string;
  tagline?: string;
  products: PublicProductSummary[];
  viewAllHref: string;
  viewAllLabel: string;
  /** Primary "Start generating" CTA href (e.g. /presets/[ctaPresetSlug]). */
  startHref?: string;
  /** Secondary "Learn more" CTA href (e.g. /models/[slug]). */
  learnMoreHref?: string;
  isAuthenticated: boolean;
  /** Cap the visible height so the grid reads as a teaser — the View-all
   *  button leads to the full listing. Matches the clipped-masonry pattern. */
  clipHeight?: string;
}

/**
 * Higgsfield-style preset shelf: brand-lime uppercase title link + subtitle on
 * the left, "Start generating" + "Learn more" pills on the right, tight
 * aspect-natural masonry columns clipped with a bottom fade and a frosted
 * brand-alpha "View all" button.
 */
export function PresetShelf({
  id,
  title,
  tagline,
  products,
  viewAllHref,
  viewAllLabel,
  startHref,
  learnMoreHref,
  isAuthenticated,
  clipHeight = "max-h-[56rem]",
}: PresetShelfProps) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby={id}
      className="px-4 pt-10 sm:px-6 md:pt-14 lg:px-10"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 md:mb-5">
        <hgroup className="min-w-0 space-y-1">
          <h2 id={id}>
            <Link
              href={viewAllHref}
              prefetch={false}
              className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#D1FE17] uppercase transition hover:text-lime-300 md:text-2xl"
            >
              {title}
            </Link>
          </h2>
          {tagline ? (
            <p className="text-text-secondary max-w-2xl text-xs sm:text-sm">
              {tagline}
            </p>
          ) : null}
        </hgroup>

        <div className="flex shrink-0 items-center gap-2">
          {startHref ? (
            <Link
              href={startHref}
              prefetch={false}
              className="text-ink-950 inline-flex h-9 items-center justify-center rounded-lg bg-[#D1FE17] px-3.5 text-xs font-semibold transition hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 md:h-10 md:px-4 md:text-sm"
            >
              Start generating
            </Link>
          ) : null}
          {learnMoreHref ? (
            <Link
              href={learnMoreHref}
              prefetch={false}
              className="bg-charcoal-850 text-cream-50 border-cream-100/15 hover:bg-charcoal-800 hover:border-cream-100/30 inline-flex h-9 items-center justify-center rounded-lg border px-3.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 md:h-10 md:px-4 md:text-sm"
            >
              Learn more
            </Link>
          ) : null}
        </div>
      </div>

      <div className={`relative overflow-hidden ${clipHeight}`}>
        <div
          data-explore-masonry=""
          className="columns-2 gap-2 overflow-x-hidden md:columns-3 lg:columns-4 xl:columns-5 [&>*]:mb-2 [&>*]:break-inside-avoid"
        >
          {products.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              isAuthenticated={isAuthenticated}
              returnPath="/"
              priority={i < 4}
              variant="grid"
            />
          ))}
        </div>

        {/* Bottom fade + frosted brand-alpha View-all button */}
        <div className="from-ink-950 via-ink-950/85 pointer-events-none absolute -bottom-1 left-0 z-10 grid h-52 w-full items-end justify-center bg-gradient-to-t to-transparent pb-5 md:pb-9">
          <Link
            href={viewAllHref}
            prefetch={false}
            className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-xl border border-[#D1FE17]/25 bg-[#D1FE17]/15 px-5 text-sm font-semibold text-[#D1FE17] backdrop-blur-md transition hover:bg-[#D1FE17]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
          >
            {viewAllLabel}
            <ArrowUpRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
