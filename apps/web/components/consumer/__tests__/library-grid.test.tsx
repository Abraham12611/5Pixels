import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LibraryGrid, type LibraryItem } from "../library-grid";

vi.mock("../library-result-card", () => ({
  LibraryResultCard: ({ item }: { item: LibraryItem }) => (
    <div data-testid="result-card">{item.productName}</div>
  ),
}));

// Server actions can't load in jsdom — bulk paths are covered separately.
vi.mock("@/lib/library/actions", () => ({
  deleteGeneration: vi.fn(async () => ({ success: true })),
  markGenerationDownloaded: vi.fn(async () => ({ success: true })),
  setGenerationSaved: vi.fn(async () => ({ success: true })),
}));

function makeItems(count: number): LibraryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `g${i}`,
    productName: `Preset ${i}`,
    productSlug: `preset-${i}`,
    createdAt: new Date().toISOString(),
    savedAt: null,
    downloadedAt: null,
    outputUrl: null,
    outputWidth: null,
    outputHeight: null,
  }));
}

describe("LibraryGrid", () => {
  it("renders the first page only, then reveals more on Load more", () => {
    render(<LibraryGrid items={makeItems(15)} />);
    expect(screen.getAllByTestId("result-card")).toHaveLength(12);
    fireEvent.click(
      screen.getByRole("button", { name: "Load more results" })
    );
    expect(screen.getAllByTestId("result-card")).toHaveLength(15);
    expect(
      screen.queryByRole("button", { name: "Load more results" })
    ).not.toBeInTheDocument();
  });

  it("uses a uniform grid, not masonry", () => {
    const { container } = render(<LibraryGrid items={makeItems(2)} />);
    const grid = container.querySelector("[aria-label='Library results']");
    expect(grid?.className).toContain("grid-cols-2");
    expect(grid?.className).not.toContain("columns-");
  });

  it("Select enters selection mode with a count header and bulk bar", () => {
    render(<LibraryGrid items={makeItems(3)} />);
    fireEvent.click(screen.getByRole("button", { name: /Select/ }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel" })
    ).toBeInTheDocument();
    // Docked bulk bar
    expect(
      screen.getByRole("button", { name: "Download" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("0 selected")).not.toBeInTheDocument();
  });

  it("Filters opens the T3 modal and applies a preset facet", async () => {
    render(<LibraryGrid items={makeItems(15)} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Filters/ })
    );
    // Staged modal sections (modal is code-split — resolves on next tick)
    expect(
      await screen.findByText("Source", {}, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.getByText("Preset")).toBeInTheDocument();
    // Choose the "Preset 0" facet → apply → only that card remains
    fireEvent.click(screen.getByRole("radio", { name: /Preset 0/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Show 1 result" })
    );
    expect(screen.getAllByTestId("result-card")).toHaveLength(1);
    // Applied chip reflects the facet and clears it
    expect(
      screen.getByRole("button", { name: "Remove Preset 0 filter" })
    ).toBeInTheDocument();
  });

  it("Sort sheet applies a different order", () => {
    render(<LibraryGrid items={makeItems(2)} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Newest first/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Oldest first" })
    );
    expect(
      screen.getByRole("button", { name: /Oldest first/ })
    ).toBeInTheDocument();
  });
});
