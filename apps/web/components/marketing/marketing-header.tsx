"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";
import {
  Compass,
  Faders,
  Fire,
  FrameCorners,
  GridFour,
  SealCheck,
  Sparkle,
} from "@phosphor-icons/react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketingHeaderProps {
  isAuthenticated: boolean;
}

const MEGA_SECTIONS = [
  {
    title: "Browse",
    items: [
      {
        label: "Explore all presets",
        description: "Every curated filter and poster.",
        href: "/explore",
        icon: Compass,
      },
      {
        label: "Categories",
        description: "Navigate by genre and use case.",
        href: "/categories",
        icon: GridFour,
      },
      {
        label: "Trending now",
        description: "Most-used looks this week.",
        href: "/explore?sort=featured",
        icon: Fire,
        badge: "Hot",
      },
    ],
  },
  {
    title: "Types",
    items: [
      {
        label: "Filters",
        description: "Style transformations from one photo.",
        href: "/explore?type=filter",
        icon: Faders,
      },
      {
        label: "Posters",
        description: "Cover art with deterministic text layouts.",
        href: "/explore?type=poster",
        icon: FrameCorners,
        badge: "New",
      },
    ],
  },
];

const MOBILE_LINKS = [
  { label: "Explore", href: "/explore" },
  { label: "Categories", href: "/categories" },
  { label: "Filters", href: "/explore?type=filter" },
  { label: "Posters", href: "/explore?type=poster" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function MarketingHeader({ isAuthenticated }: MarketingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition duration-300 ${
        scrolled
          ? "border-cream-100/10 bg-ink-950/80 backdrop-blur-md"
          : "border-transparent bg-ink-950"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="5Pixels home"
          >
            <span className="bg-lime-500 text-ink-950 flex h-8 w-8 items-center justify-center rounded-lg">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="5" cy="5" r="2" />
                <circle cx="12" cy="5" r="2" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </span>
            <span className="text-cream-50 text-xl font-bold tracking-tight">
              5Pixels
            </span>
          </Link>

          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-sm font-medium text-text-secondary hover:bg-transparent hover:text-cream-50 data-[state=open]:bg-transparent data-[state=open]:text-cream-50">
                  Explore
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="bg-charcoal-900 border-cream-100/10 grid w-[560px] gap-1 rounded-2xl border p-3 shadow-2xl md:grid-cols-2">
                    {MEGA_SECTIONS.map((section) => (
                      <div key={section.title}>
                        <p className="text-text-muted px-2 pb-1 pt-2 text-[11px] font-semibold tracking-widest uppercase">
                          {section.title}
                        </p>
                        <ul className="space-y-0.5">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <li key={item.href}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    href={item.href}
                                    className="group hover:bg-charcoal-800 flex items-start gap-3 rounded-xl px-2 py-2.5 transition"
                                  >
                                    <span className="bg-charcoal-800 group-hover:bg-lime-400/15 text-text-secondary group-hover:text-lime-300 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition">
                                      <Icon size={16} weight="fill" />
                                    </span>
                                    <span>
                                      <span className="text-cream-50 flex items-center gap-2 text-sm font-medium">
                                        {item.label}
                                        {item.badge && (
                                          <span
                                            className={cn(
                                              "rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                                              item.badge === "Hot"
                                                ? "bg-rose-500/20 text-rose-300"
                                                : "bg-lime-400/15 text-lime-300"
                                            )}
                                          >
                                            {item.badge}
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-text-muted mt-0.5 block text-xs leading-snug">
                                        {item.description}
                                      </span>
                                    </span>
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {navLinks.map((link) => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={link.href}
                      className="text-text-secondary hover:text-cream-50 block rounded-lg px-3 py-2 text-sm font-medium transition"
                    >
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="text-text-secondary hover:text-cream-50 hidden rounded-lg p-2 transition sm:block"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>

          {isAuthenticated ? (
            <>
              <span className="text-lime-400 hidden items-center gap-1.5 rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium sm:flex">
                <SealCheck size={14} weight="fill" />
                <span>3 free credits</span>
              </span>
              <Button asChild variant="secondary" size="sm">
                <Link href="/app">Open app</Link>
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-cream-50 hidden text-sm font-medium hover:text-lime-400 sm:block"
              >
                Log in
              </Link>
              <Button
                asChild
                size="sm"
                className="bg-lime-500 text-ink-950 hover:bg-lime-400"
              >
                <Link href="/signup">
                  <Sparkle size={14} weight="fill" className="mr-1" />
                  Try 5Pixels
                </Link>
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="text-cream-50 rounded-lg p-2 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          data-testid="mobile-menu"
          className="border-cream-100/10 bg-ink-900 border-t px-4 py-4 md:hidden"
        >
          <ul className="space-y-1">
            {MOBILE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-cream-50 hover:bg-charcoal-800 block rounded-lg px-3 py-2 text-sm font-medium"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {!isAuthenticated && (
              <>
                <li>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-cream-50 hover:bg-charcoal-800 block rounded-lg px-3 py-2 text-sm font-medium"
                  >
                    Log in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="bg-lime-500 text-ink-950 hover:bg-lime-400 mt-2 block rounded-lg px-3 py-2.5 text-sm font-semibold text-center"
                  >
                    Try 5Pixels
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
