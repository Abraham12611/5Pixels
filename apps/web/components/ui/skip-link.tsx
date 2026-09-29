"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Visually hidden until focused; lands on the page's <main> (17.3). */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="bg-lime-400 text-ink-950 focus-visible:ring-ink-950 fixed top-3 left-3 z-[70] -translate-y-20 rounded-lg px-4 py-2 text-sm font-semibold transition-transform focus-visible:translate-y-0 focus-visible:ring-2 focus-visible:outline-none"
    >
      Skip to content
    </a>
  );
}

/**
 * Route-change focus management (17.3): on each client navigation, tag the
 * page's <main> as the skip target and move focus to its first heading so
 * keyboard and AT users aren't stranded.
 */
export function RouteFocus() {
  const pathname = usePathname();

  useEffect(() => {
    // Let the new route paint before moving focus.
    const id = requestAnimationFrame(() => {
      const main = document.querySelector("main");
      if (main && !main.id) main.id = "main-content";
      const heading =
        main?.querySelector<HTMLElement>("h1, h2") ??
        document.querySelector<HTMLElement>("h1");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
