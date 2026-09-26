"use client";

import { useEffect } from "react";

interface GrowSurfApi {
  init?: () => void;
  initElements?: () => void;
}

declare global {
  interface Window {
    growsurf?: GrowSurfApi;
  }
}

/**
 * Re-initializes GrowSurf embedded elements after client-side navigation.
 * The universal code auto-initializes on full page loads, but on SPA route
 * changes the blocks may mount after the script is ready — `grsfReady` fires
 * once the library loads, and `initElements()` re-scans the DOM for
 * `data-grsf-block-*` elements (per the embeddable-elements docs).
 */
export function GrowSurfInit() {
  useEffect(() => {
    const init = () => {
      try {
        window.growsurf?.initElements?.();
      } catch {
        // Non-fatal — embedded blocks just render empty until the next init.
      }
    };

    if (window.growsurf) {
      init();
      return;
    }

    document.addEventListener("grsfReady", init);
    window.addEventListener("grsfReady", init);
    return () => {
      document.removeEventListener("grsfReady", init);
      window.removeEventListener("grsfReady", init);
    };
  }, []);

  return null;
}
