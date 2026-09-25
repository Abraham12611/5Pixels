"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a media query and returns whether it matches. Initial render
 * is `false` (SSR-safe); the real value lands in an effect on mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Below `sm` — where overlays switch to sheet tiers (25_MOBILE_WEB_POLISH/15). */
export const NARROW_QUERY = "(max-width: 639.98px)";

export function useIsNarrow(): boolean {
  return useMediaQuery(NARROW_QUERY);
}
