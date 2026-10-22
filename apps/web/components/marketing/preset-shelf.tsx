import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { ProductCard } from "@/components/consumer/product-card";
import type { PublicProductSummary } from "@/types/catalog";

interface PresetShelfProps {
  id: string;
  title: string;
  tagline?: string;
  products: PublicProductSummary[];
  viewAllHref: string;
  viewAllLabel: string;
  isAuthenticated: boolean;
  /** Cap the visible height so the grid reads as a teaser — the View-all
   *  button leads to the full listing. Matches the clipped-masonry pattern. */
  clipHeight?: string;
}

/**
 * A titled, aspect-natural masonry of preset cards clipped to a fixed height
 * with a bottom fade — the "not everything is shown, go view all" pattern.
 */
export function PresetShelf({
  id,
  title,
  tagline,
  products,
  viewAllHref,
  viewAllLabel,
  isAuthenticated,
  clipHeight = "max-h-[56rem]",
}: PresetShelfProps) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={id} className="px-4 pt-10 sm:px-6 md:pt-14 lg:px-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 md:mb-6">
        <div className="min-w-0">
          <h2
            id={id}
            className="text-cream-50 text-xl font-bold tracking-tight md:text-2xl"
          >
            {title}
          </h2>
          {tagline ? (
            <p className="text-text-secondary mt-1 max-w-xl text-sm md:text-base">
              {tagline}
            </p>
          ) : null}
        </div>
        <Link
          href={viewAllHref}
          prefetch={false}
          className="text-lime-400 hover:text-lime-300 focus-visible:outline-lime-400 inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {viewAllLabel}
          <ArrowRight size={14} weight="bold" aria-hidden />
        </Link>
      </div>

      <div className="relative">
        <div
          className={`columns-2 gap-3 overflow-hidden md:columns-3 md:gap-4 xl:columns-4 [&>*]:mb-3 [&>*]:break-inside-avoid md:[&>*]:mb-4 ${clipHeight}`}
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
        {/* Fade into the page bg + centered view-all affordance */}
        <div
          aria-hidden
          className="from-ink-950 via-ink-950/60 pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t to-transparent"
        />
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <Link
            href={viewAllHref}
            prefetch={false}
            className="bg-lime-400 text-ink-950 hover:bg-lime-300 focus-visible:outline-lime-300 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {viewAllLabel}
            <ArrowRight size={14} weight="bold" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
