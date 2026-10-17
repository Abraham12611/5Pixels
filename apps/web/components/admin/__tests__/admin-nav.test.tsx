import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminNav } from "../admin-nav";

let mockPathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminNav — Articles item (#132)", () => {
  it("exposes Articles under Growth, linking to /admin/articles", () => {
    mockPathname = "/admin";
    render(<AdminNav />);
    const links = screen.getAllByRole("link", { name: "Articles" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/admin/articles");
    }
  });

  it("marks Articles active on nested studio routes", () => {
    mockPathname = "/admin/articles/dev";
    render(<AdminNav />);
    const links = screen.getAllByRole("link", { name: "Articles" });
    expect(links.some((l) => l.getAttribute("aria-current") === "page")).toBe(
      true
    );
  });
});
