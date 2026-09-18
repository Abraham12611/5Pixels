"use client";

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ArrowRight, Compass, Sparkle, TrendUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { SearchCategory, SearchPreset } from "@/lib/search";

interface ExploreMenuProps {
  categories: SearchCategory[];
  featured: SearchPreset[];
  active: boolean;
}

const TRIGGER_CLASS =
  "text-text-secondary hover:text-cream-100 group relative inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-lime-500/50 focus-visible:ring-2 data-[state=open]:text-cream-50";

const LINK_CLASS =
  "text-text-secondary hover:bg-charcoal-800 hover:text-cream-100 group/link flex flex-row items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors";

/**
 * Explore mega-menu — Browse categories on the left, a few featured looks on
 * the right. Opens on hover/focus/click via Radix NavigationMenu.
 */
export function ExploreMenu({ categories, featured, active }: ExploreMenuProps) {
  return (
    <NavigationMenu viewport={false} delayDuration={120}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(TRIGGER_CLASS, active && "text-cream-50")}
          >
            Explore
            {active && (
              <span className="absolute inset-x-3 -bottom-1 flex justify-center">
                <ActiveMarker />
              </span>
            )}
          </NavigationMenuTrigger>

          <NavigationMenuContent className="bg-charcoal-850 border-cream-100/10 shadow-elevated w-[min(40rem,90vw)] rounded-xl border p-2">
            <div className="grid gap-1 sm:grid-cols-[190px_1fr]">
              {/* Browse column */}
              <div className="border-cream-100/10 flex flex-col gap-0.5 sm:border-r sm:pr-2">
                <MenuLink href="/explore" icon={Compass}>
                  View all presets
                </MenuLink>
                <MenuLink href="/explore?sort=featured" icon={TrendUp}>
                  Trending
                </MenuLink>
                <MenuLink href="/explore?sort=newest" icon={Sparkle}>
                  New looks
                </MenuLink>

                {categories.length > 0 && (
                  <>
                    <div className="border-cream-100/10 mx-2.5 my-1.5 border-t" />
                    <p className="text-text-muted px-2.5 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider">
                      Categories
                    </p>
                    <div className="[&::-webkit-scrollbar-thumb]:bg-charcoal-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:w-1 max-h-56 overflow-y-auto pr-1">
                      {categories.map((c) => (
                        <NavigationMenuLink asChild key={c.slug}>
                          <Link
                            href={`/explore?category=${c.slug}`}
                            className={LINK_CLASS}
                          >
                            {c.name}
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Featured looks column */}
              {featured.length > 0 && (
                <div className="hidden sm:block">
                  <p className="text-text-muted px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider">
                    Featured looks
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {featured.slice(0, 4).map((p) => (
                      <NavigationMenuLink asChild key={p.slug}>
                        <Link
                          href={`/presets/${p.slug}`}
                          className="hover:bg-charcoal-800 group/tile flex flex-row items-center gap-2.5 rounded-lg p-2 transition-colors"
                        >
                          <span className="bg-charcoal-800 media-frame relative h-11 w-11 shrink-0 overflow-hidden rounded-md">
                            {p.thumbUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- menu thumbs don't need next/image optimization
                              <img
                                src={p.thumbUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="text-cream-100 block truncate text-xs font-medium">
                              {p.name}
                            </span>
                            <span className="text-text-muted block truncate text-[11px]">
                              {p.categoryName ?? "Preset"} · {p.creditCost} cr
                            </span>
                          </span>
                        </Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold"; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <NavigationMenuLink asChild>
      <Link href={href} className={LINK_CLASS}>
        <Icon size={16} weight="bold" className="text-text-muted" />
        <span className="flex-1">{children}</span>
        <ArrowRight
          size={12}
          weight="bold"
          className="text-text-muted opacity-0 transition-opacity group-hover/link:opacity-100"
        />
      </Link>
    </NavigationMenuLink>
  );
}

function ActiveMarker() {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="bg-lime-400 h-[3px] w-[3px] rounded-[1px]" />
      ))}
    </span>
  );
}
