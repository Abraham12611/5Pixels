import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresetQuickSheet } from "@/components/consumer/preset-quick-sheet";
import type { QuickSheetPreset } from "@/lib/catalog/quick-sheet";

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as MediaQueryList);
});

const ITEM: QuickSheetPreset = {
  id: "p1",
  slug: "midnight-premiere",
  name: "Midnight Premiere",
  type: "filter",
  shortDescription: "A film-noir grade with deep blacks and teal shadows.",
  categoryName: "Cinematic",
  categorySlug: "cinematic",
  creditCost: 4,
  previewUrl: "https://cdn.example.com/poster.jpg",
  previewVideoUrl: null,
  exampleUrls: [
    "https://cdn.example.com/e1.jpg",
    "https://cdn.example.com/e2.jpg",
    "https://cdn.example.com/e3.jpg",
  ],
  available: true,
};

function renderSheet(overrides: Partial<QuickSheetPreset> = {}) {
  const onOpenChange = vi.fn();
  render(
    <PresetQuickSheet
      item={{ ...ITEM, ...overrides }}
      onOpenChange={onOpenChange}
      isAuthenticated
      returnPath="/explore"
    />
  );
  return onOpenChange;
}

describe("PresetQuickSheet", () => {
  it("renders nothing when item is null", () => {
    render(
      <PresetQuickSheet
        item={null}
        onOpenChange={() => {}}
        isAuthenticated
        returnPath="/explore"
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the pinned CTA, details link, and deferred-auth line", () => {
    renderSheet();
    expect(
      screen.getByRole("dialog", { name: "Midnight Premiere quick preview" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /use this look/i })
    ).toHaveAttribute("href", "/app/create/midnight-premiere");
    expect(
      screen.getByRole("link", { name: /view full details/i })
    ).toHaveAttribute("href", "/presets/midnight-premiere");
    expect(
      screen.getByText(/no account needed until you generate/i)
    ).toBeInTheDocument();
  });

  it("closes via the explicit close control", () => {
    const onOpenChange = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on Escape", () => {
    const onOpenChange = renderSheet();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens an example in the nested image viewer", () => {
    renderSheet();
    fireEvent.click(
      screen.getByRole("button", {
        name: "View example 2 for Midnight Premiere",
      })
    );
    expect(
      screen.getByRole("dialog", { name: "Midnight Premiere example 2" })
    ).toBeInTheDocument();
    expect(screen.getByText("Example 2 of 3")).toBeInTheDocument();
  });

  it("expands the description via More", () => {
    renderSheet();
    const more = screen.getByRole("button", { name: "More" });
    fireEvent.click(more);
    expect(screen.getByRole("button", { name: "Less" })).toBeInTheDocument();
  });

  it("shows the retired state when the preset is unavailable", () => {
    renderSheet({ available: false });
    expect(
      screen.getByRole("link", { name: /find a similar look/i })
    ).toHaveAttribute("href", "/explore?category=cinematic");
    expect(
      screen.queryByRole("link", { name: /use this look/i })
    ).not.toBeInTheDocument();
  });

  it("renders the favorite heart", () => {
    renderSheet();
    expect(
      screen.getByRole("button", { name: "Add to favorites" })
    ).toBeInTheDocument();
  });
});
