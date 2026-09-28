import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineBanner, DegradedBannerGate } from "../offline-banner";

vi.mock("sonner", () => ({ toast: vi.fn() }));

function setOnline(value: boolean) {
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(value);
}

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is hidden while online", () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });

  it("shows a persistent banner while offline", () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(
      screen.getByRole("status", { hidden: true })
    ).toHaveTextContent(/you're offline/i);
  });

  it("suppresses degraded content while offline", () => {
    setOnline(false);
    render(
      <DegradedBannerGate>
        <div>paused notice</div>
      </DegradedBannerGate>
    );
    expect(screen.queryByText(/paused notice/i)).not.toBeInTheDocument();
  });

  it("passes degraded content through while online", () => {
    setOnline(true);
    render(
      <DegradedBannerGate>
        <div>paused notice</div>
      </DegradedBannerGate>
    );
    expect(screen.getByText(/paused notice/i)).toBeInTheDocument();
  });
});
