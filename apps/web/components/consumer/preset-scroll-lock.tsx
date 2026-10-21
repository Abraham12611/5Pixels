"use client";

import { useEffect } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/scroll-lock";

/**
 * Pins document scroll while the viewport is ≥ md — the preset lightbox is
 * a fixed takeover on desktop but a flowing page on mobile, where the site
 * header, footer and bottom nav stay reachable.
 */
export function PresetScrollLock() {
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      if (mq.matches) lockBodyScroll();
      else unlockBodyScroll();
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      unlockBodyScroll();
    };
  }, []);
  return null;
}
