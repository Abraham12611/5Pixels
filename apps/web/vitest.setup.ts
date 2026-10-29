import "@testing-library/jest-dom";
import { expect } from "vitest";
import { toHaveNoViolations } from "vitest-axe/dist/matchers.js";

// vitest-axe@0.1.0's extend-expect entry is an empty stub — register directly.
expect.extend({ toHaveNoViolations });

// jsdom has no matchMedia — components gating on pointer/width/reduced-motion
// queries need a stub.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

// jsdom has no ResizeObserver — cmdk and layout-aware components need a stub.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom defines scrollTo as a throwing "Not implemented" stub — override it
// so scroll-lock's unlock path doesn't log noise on every dialog unmount.
if (typeof window !== "undefined") {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}

// jsdom has no scrollIntoView — cmdk calls it while rendering items.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
