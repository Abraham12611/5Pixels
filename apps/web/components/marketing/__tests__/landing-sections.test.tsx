import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryFaq } from "../category-faq";
import { PresetPreview } from "../preset-preview";

describe("CategoryFaq", () => {
  it("renders all questions and category rows", () => {
    render(<CategoryFaq />);
    expect(
      screen.getByText("Which photos work best?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("How are my photos handled?")
    ).toBeInTheDocument();
    expect(screen.getByText("Portraits")).toBeInTheDocument();
    expect(screen.getByText("Seasonal")).toBeInTheDocument();
  });

  it("keeps answers collapsed until a question is opened", () => {
    render(<CategoryFaq />);
    const summary = screen.getByText("How do credits work?");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
  });
});

describe("PresetPreview", () => {
  it("marks the first look as selected by default", () => {
    render(<PresetPreview />);
    const first = screen.getByRole("tab", { name: "Cinematic Film" });
    expect(first).toHaveAttribute("aria-selected", "true");
  });

  it("updates the result label when another look is picked", () => {
    render(<PresetPreview />);
    fireEvent.click(screen.getByRole("tab", { name: "Golden Hour" }));
    expect(
      screen.getAllByText("Golden Hour").length
    ).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole("tab", { name: "Golden Hour" })
    ).toHaveAttribute("aria-selected", "true");
  });
});
