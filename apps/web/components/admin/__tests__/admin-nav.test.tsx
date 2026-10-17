import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AdminNav } from "../admin-nav";

let mockPathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AdminNav — Articles item (#132)", () => {
  it("exposes a single Articles entry under Catalog, linking to /admin/articles", () => {
    mockPathname = "/admin";
    const { container } = render(<AdminNav />);
    // #146 owns this entry — this branch mirrors its Catalog placement so
    // exactly one item survives whichever PR merges last.
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    const links = within(aside as HTMLElement).getAllByRole("link", {
      name: "Articles",
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/admin/articles");
    const group = links[0].closest("div")?.parentElement;
    expect(group?.querySelector("p")?.textContent).toBe("Catalog");
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
