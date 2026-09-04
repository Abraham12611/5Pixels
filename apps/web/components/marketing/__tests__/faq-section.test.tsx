import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FAQSection } from "../faq-section";

// Mock analytics helper to avoid console noise in tests.
vi.mock("@/lib/analytics/track", () => ({
  trackEvent: vi.fn(),
}));

describe("FAQSection", () => {
  it("renders all questions", () => {
    render(<FAQSection />);
    expect(screen.getByText("What is a preset?")).toBeInTheDocument();
    expect(screen.getByText("Do I need to write prompts?")).toBeInTheDocument();
  });

  it("toggles answers on click", () => {
    render(<FAQSection />);
    const question = screen.getByText("What is a preset?");
    fireEvent.click(question);
    expect(
      screen.getByText(
        /A preset is a curated visual direction/
      )
    ).toBeVisible();

    fireEvent.click(question);
    expect(
      screen.queryByText(
        /A preset is a curated visual direction/
      )
    ).not.toBeInTheDocument();
  });
});
