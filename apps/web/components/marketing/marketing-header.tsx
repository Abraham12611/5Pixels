"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketingHeaderProps {
  isAuthenticated: boolean;
}

const navLinks = [
  { label: "Explore", href: "/explore" },
  { label: "Categories", href: "/categories" },
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
          <Link href="/" className="flex items-center gap-2" aria-label="5Pixels home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-500 text-ink-950">
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

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-secondary hover:text-cream-50 rounded-lg px-3 py-2 text-sm font-medium transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>
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
            <Button asChild variant="secondary" size="sm">
              <Link href="/app">Open app</Link>
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-cream-50 hidden text-sm font-medium hover:text-lime-400 sm:block"
              >
                Log in
              </Link>
              <Button asChild size="sm" className="bg-lime-500 text-ink-950 hover:bg-lime-400">
                <Link href="/signup">Try 5Pixels</Link>
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
          className="border-cream-100/10 border-t bg-ink-900 px-4 py-4 md:hidden"
        >
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-cream-50 block rounded-lg px-3 py-2 text-sm font-medium hover:bg-charcoal-800"
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
                    className="text-cream-50 block rounded-lg px-3 py-2 text-sm font-medium hover:bg-charcoal-800"
                  >
                    Log in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="text-cream-50 block rounded-lg px-3 py-2 text-sm font-medium hover:bg-charcoal-800"
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
