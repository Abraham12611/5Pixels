import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { useOverlayHistory } from "../use-overlay-history";

describe("useOverlayHistory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pops its pushed entry when closed without navigating", () => {
    const push = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});

    const { unmount, rerender } = renderHook(
      ({ open }) => useOverlayHistory(open, () => {}),
      { initialProps: { open: true } }
    );
    expect(push).toHaveBeenCalledTimes(1);

    // Simulate "sheet closed while still on its own marker entry": the
    // push spy is mocked, so fake the state the browser would expose.
    const marker = (push.mock.calls[0]![0] as Record<string, string>).__overlay;
    Object.defineProperty(window.history, "state", {
      value: { __overlay: marker },
      configurable: true,
    });

    rerender({ open: false });
    unmount();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("does NOT pop when an in-overlay link navigated away first", () => {
    const push = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});

    const { unmount } = renderHook(
      ({ open }) => useOverlayHistory(open, () => {}),
      { initialProps: { open: true } }
    );
    expect(push).toHaveBeenCalledTimes(1);

    // Next.js router pushed /presets/[slug] — history.state is now the
    // router's own object, our marker entry sits underneath.
    Object.defineProperty(window.history, "state", {
      value: { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [] },
      configurable: true,
    });

    unmount();
    expect(back).not.toHaveBeenCalled();
  });
});
