"use client";

import { useEffect, useRef } from "react";

const MARKER = "__overlay";

/**
 * Makes browser Back a first-class dismissal for an overlay: opening pushes a
 * history entry, closing by any other means pops it, and a hardware/browser
 * Back closes the overlay instead of leaving the page.
 *
 * Guards against double-pop when overlays stack: each instance only pops the
 * entry it pushed itself.
 */
export function useOverlayHistory(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    const id = `${MARKER}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    window.history.pushState({ [MARKER]: id }, "");
    pushedRef.current = true;

    const handlePopState = () => {
      // Our entry is gone: the overlay must close, and must not pop again.
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [open]);
}
