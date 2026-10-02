import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section wrapper enforcing the mobile page rhythm: 20px gutters, a 20px/600
 * title, an optional 44px "See all" target, and 15px between the header and
 * its content.
 */
export function MobileSection({
  title,
  seeAllHref,
  seeAllLabel = "See all",
  headingLevel: Heading = "h2",
  bleed = false,
  className,
  children,
}: {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  headingLevel?: "h2" | "h3";
  /** Content ignores the page gutter (rails, full-bleed media). */
  bleed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("py-[15px]", className)}>
      <div className="flex items-center justify-between gap-4 px-5">
        <Heading className="text-cream-50 text-xl font-semibold">
          {title}
        </Heading>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="text-text-secondary hover:text-cream-50 focus-visible:ring-lime-500/70 focus-visible:ring-offset-ink-950 -mr-2 flex h-11 items-center rounded-lg px-2 text-[13px] transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {seeAllLabel} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
      <div className={cn("mt-[15px]", !bleed && "px-5")}>{children}</div>
    </section>
  );
}
