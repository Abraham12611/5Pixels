import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileBottomNav } from "../mobile-bottom-nav";

let mockPathname = "/explore";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("MobileBottomNav", () => {
  it("renders the tab bar on regular routes", () => {
    mockPathname = "/explore";
    render(<MobileBottomNav />);
    expect(screen.getByRole("navigation", { name: "Primary" }))
      .toBeInTheDocument();
  });

  it("hides on preset detail — the docked action bar owns the thumb zone", () => {
    mockPathname = "/presets/cyber-punk";
    const { container } = render(<MobileBottomNav />);
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole("navigation", { name: "Primary" })
    ).not.toBeInTheDocument();
  });

  it("hides on create and results routes too", () => {
    for (const path of ["/app/create/cyber-punk", "/app/results/abc"]) {
      mockPathname = path;
      const { container, unmount } = render(<MobileBottomNav />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });
});
