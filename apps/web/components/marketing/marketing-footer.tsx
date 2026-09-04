"use client";

import Link from "next/link";

interface MarketingFooterProps {
  isAuthenticated: boolean;
}

const footerLinks = {
  Explore: [
    { label: "All presets", href: "/explore" },
    { label: "Filters", href: "/explore?type=filter" },
    { label: "Posters", href: "/explore?type=poster" },
    { label: "Categories", href: "/categories" },
  ],
  Resources: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Help center", href: "#" },
    { label: "Prompt guide", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Trust", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
  Community: [
    { label: "X / Twitter", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "TikTok", href: "#" },
  ],
};

export function MarketingFooter({ isAuthenticated }: MarketingFooterProps) {
  return (
    <footer className="bg-lime-500 text-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <p className="text-ink-950 mb-3 text-2xl font-bold tracking-tight">
              AI-NATIVE CREATIVE SUITE
            </p>
            <p className="text-ink-900/80 max-w-xs text-sm">
              5Pixels turns one photo into curated, high-quality
              transformations — no prompt engineering required.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              {!isAuthenticated && (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-lime-400 hover:bg-ink-900"
                  >
                    Sign up
                  </Link>
                  <Link
                    href="/login"
                    className="text-ink-950 text-sm font-medium hover:underline"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {Object.entries(footerLinks).map(([column, links]) => (
              <div key={column}>
                <h4 className="text-ink-950 mb-4 text-sm font-semibold uppercase tracking-wider">
                  {column}
                </h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-ink-900/80 hover:text-ink-950 text-sm transition"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-ink-950/10 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-ink-900/70 text-xs">
            5Pixels — AI photo presets.
          </p>
          <div className="flex gap-5 text-xs font-medium text-ink-900/80">
            {["X / Twitter", "YouTube", "LinkedIn", "TikTok"].map((social) => (
              <Link
                key={social}
                href="#"
                className="hover:text-ink-950"
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
