import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserDropdown } from "../user-dropdown";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/actions/auth", () => ({
  signOut: vi.fn(),
}));

// The Radix dropdown mounts modal content (scroll-lock + focus trap) that
// never settles under jsdom — and isn't what's under test. A lightweight
// always-open stand-in lets us assert on the items the component renders.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div role="menuitem">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const BASE = {
  name: "Test User",
  email: "test@example.com",
  credits: 20,
};

describe("UserDropdown — Articles entries (#132)", () => {
  it("shows the public Articles link for regular users, no writer CTA", () => {
    render(<UserDropdown {...BASE} isAdmin={false} />);

    expect(screen.getByRole("link", { name: /^articles$/i })).toHaveAttribute(
      "href",
      "/articles"
    );
    expect(
      screen.queryByRole("link", { name: /manage articles/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /write article/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /admin console/i })
    ).not.toBeInTheDocument();
  });

  it("shows Manage articles for admin/owner only", () => {
    render(<UserDropdown {...BASE} isAdmin />);

    expect(
      screen.getByRole("link", { name: /manage articles/i })
    ).toHaveAttribute("href", "/admin/articles");
    expect(
      screen.getByRole("link", { name: /admin console/i })
    ).toBeInTheDocument();
  });
});
