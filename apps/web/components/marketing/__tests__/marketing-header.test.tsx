import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketingHeader } from "../marketing-header";

vi.mock("@/lib/analytics/track", () => ({
  trackEvent: vi.fn(),
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
});
