/**
 * Reference-counted body scroll lock. Nested overlays (a confirm sheet over a
 * content sheet) each acquire the lock; scrolling is only restored when the
 * last one releases it. iOS discards the scroll position under
 * `overflow: hidden`, so the document is pinned with `position: fixed` and the
 * offset is restored on release.
 */
let locks = 0;
let scrollY = 0;
let previous: {
  overflow: string;
  position: string;
  top: string;
  width: string;
} | null = null;

export function lockBodyScroll(): void {
  locks += 1;
  if (locks > 1) return;

  const { body } = document;
  scrollY = window.scrollY;
  previous = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
  };

  body.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.width = "100%";
}

export function unlockBodyScroll(): void {
  if (locks === 0) return;
  locks -= 1;
  if (locks > 0) return;

  const { body } = document;
  body.style.overflow = previous?.overflow ?? "";
  body.style.position = previous?.position ?? "";
  body.style.top = previous?.top ?? "";
  body.style.width = previous?.width ?? "";
  previous = null;

  window.scrollTo(0, scrollY);
}

/** Test helper: number of outstanding locks. */
export function activeScrollLocks(): number {
  return locks;
}
