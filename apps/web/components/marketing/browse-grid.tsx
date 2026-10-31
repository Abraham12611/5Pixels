import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { BrowseLink } from "@/lib/marketing/landing-content";

/** "Explore more" link grid — higgsfield's feature-pill row adapted to
 *  5Pixels' real destinations. */
export function BrowseGrid({ links }: { links: BrowseLink[] }) {
  return (
    <section
      aria-label="Explore more of 5Pixels"
      className="px-4 pt-10 sm:px-6 md:pt-14 lg:px-10"
    >
      <h2 className="text-cream-50 text-xl font-bold tracking-tight md:text-2xl">
        Explore more
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-3 md:gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className="group bg-charcoal-850 border-cream-100/10 hover:border-lime-500/40 focus-visible:outline-lime-400 flex items-center justify-between gap-2 rounded-xl border px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 md:px-5 md:py-4"
          >
            <span className="text-cream-50 group-hover:text-lime-400 text-sm font-semibold transition md:text-base">
              {link.label}
            </span>
            <ArrowUpRight
              size={16}
              weight="bold"
              aria-hidden
              className="text-text-muted group-hover:text-lime-400 shrink-0 transition"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
