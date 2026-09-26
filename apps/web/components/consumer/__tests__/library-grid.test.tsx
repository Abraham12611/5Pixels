import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LibraryGrid, type LibraryItem } from "../library-grid";

vi.mock("../library-result-card", () => ({
  LibraryResultCard: ({ item }: { item: LibraryItem }) => (
    <div data-testid="result-card">{item.productName}</div>
  ),
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
});
