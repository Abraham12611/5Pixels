import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketingHeader } from "../marketing-header";

vi.mock("@/lib/analytics/track", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("MarketingHeader", () => {
  it("renders logo and primary nav", () => {
    render(<MarketingHeader isAuthenticated={false} />);
    expect(screen.getByText("5Pixels")).toBeInTheDocument();
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Try 5Pixels")).toBeInTheDocument();
  });

  it("toggles mobile menu", () => {
    render(<MarketingHeader isAuthenticated={false} />);
    const menuButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(menuButton);
    expect(screen.getByTestId("mobile-menu")).toBeInTheDocument();
    fireEvent.click(menuButton);
    expect(screen.queryByTestId("mobile-menu")).not.toBeInTheDocument();
  });

  it("shows Open app for authenticated users", () => {
    render(<MarketingHeader isAuthenticated />);
    expect(screen.getByText("Open app")).toBeInTheDocument();
    expect(screen.queryByText("Try 5Pixels")).not.toBeInTheDocument();
  });

  it("shows a promo pill linking to pricing for never-paid users", () => {
    render(
      <MarketingHeader isAuthenticated promoLabel="Save 50% today" />
    );
    const pill = screen.getByTestId("promo-pill");
    expect(pill).toHaveAttribute("href", "/pricing");
    expect(pill).toHaveTextContent("Save 50% today");
  });

  it("hides the promo pill for paid users (no label)", () => {
    render(<MarketingHeader isAuthenticated promoLabel={null} />);
    expect(screen.queryByTestId("promo-pill")).not.toBeInTheDocument();
    expect(screen.getByText("Open app")).toBeInTheDocument();
  });

  it("opens the search palette from the header button", () => {
    render(
      <MarketingHeader
        isAuthenticated={false}
        searchPresets={[]}
        searchCategories={[]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
