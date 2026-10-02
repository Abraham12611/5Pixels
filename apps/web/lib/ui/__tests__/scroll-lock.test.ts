import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activeScrollLocks,
  lockBodyScroll,
  unlockBodyScroll,
} from "../scroll-lock";

afterEach(() => {
  while (activeScrollLocks() > 0) unlockBodyScroll();
});

describe("scroll lock", () => {
  it("pins the document while any overlay holds the lock", () => {
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.position).toBe("");
  });

  it("is reference counted across nested overlays", () => {
    lockBodyScroll();
    lockBodyScroll();
    expect(activeScrollLocks()).toBe(2);

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
  });

  it("pins the document at the current offset and restores it on release", () => {
    // jsdom never scrolls, so the offset is stubbed.
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 240,
    });
    const restored: number[] = [];
    const scrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation((_x, y) => {
        restored.push(y as number);
      });

    lockBodyScroll();
    expect(document.body.style.top).toBe("-240px");

    unlockBodyScroll();
    expect(restored).toEqual([240]);

    scrollTo.mockRestore();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("ignores an unbalanced release", () => {
    unlockBodyScroll();
    expect(activeScrollLocks()).toBe(0);
  });
});
