import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LibrarySegments,
  parseLibrarySegment,
} from "../library-segments";

vi.mock("../library-grid", () => ({
  LibraryGrid: () => <div data-testid="library-grid" />,
}));
vi.mock("../favorites-grid", () => ({
  FavoritesGrid: () => <div data-testid="favorites-grid" />,
}));
vi.mock("../runs-list", () => ({
  RunsList: () => <div data-testid="runs-list" />,
}));
vi.mock("../preset-quick-view", () => ({
  PresetQuickViewHost: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("../product-card", () => ({
  ProductCard: () => null,
}));

const baseProps = {
  results: [],
  activeRuns: [],
  favorites: [],
  suggestions: [],
  runs: [],
};

describe("LibrarySegments", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/app/library");
    vi.restoreAllMocks();
  });

  it("renders a segmented control with Results / Presets / Runs tabs", () => {
    render(<LibrarySegments initialTab="results" {...baseProps} />);
    for (const label of ["Results", "Presets", "Runs"]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("tab", { name: "Results" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("shows the Results panel by default", () => {
    render(<LibrarySegments initialTab="results" {...baseProps} />);
    expect(screen.getByTestId("library-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("favorites-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("runs-list")).not.toBeInTheDocument();
  });

  it("deep links: initialTab=presets renders the Presets segment", () => {
    render(
      <LibrarySegments
        initialTab="presets"
        {...baseProps}
        favorites={[
          {
            product: { id: "p1" },
            isAvailable: true,
            favoritedAt: "",
          } as never,
        ]}
      />
    );
    expect(screen.getByTestId("favorites-grid")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Presets" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("deep links: initialTab=runs renders the Runs segment", () => {
    render(
      <LibrarySegments
        initialTab="runs"
        {...baseProps}
        runs={[
          {
            id: "r1",
            productName: "Manga Cut-Out",
            status: "completed",
            creditCost: 5,
            createdAt: new Date().toISOString(),
            thumb: null,
          },
        ]}
      />
    );
    expect(screen.getByTestId("runs-list")).toBeInTheDocument();
  });

  it("switching segments reflects the choice in the URL via replaceState", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    render(<LibrarySegments initialTab="results" {...baseProps} />);
    const runsTab = screen.getByRole("tab", { name: "Runs" });
    fireEvent.mouseDown(runsTab);
    fireEvent.click(runsTab);
    expect(screen.getByTestId("runs-list")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(null, "", "/app/library?tab=runs");
  });

  it("switching back to Results clears the tab param", () => {
    const spy = vi.spyOn(window.history, "replaceState");
    render(<LibrarySegments initialTab="runs" {...baseProps} />);
    const resultsTab = screen.getByRole("tab", { name: "Results" });
    fireEvent.mouseDown(resultsTab);
    fireEvent.click(resultsTab);
    expect(spy).toHaveBeenCalledWith(null, "", "/app/library");
  });

  it("shows the in-progress rail inside Results when runs are active", () => {
    render(
      <LibrarySegments
        initialTab="results"
        {...baseProps}
        activeRuns={[
          { id: "a1", productName: "Ink Portrait", status: "generating", thumb: null },
        ]}
      />
    );
    expect(
      screen.getByRole("heading", { name: "In progress" })
    ).toBeInTheDocument();
  });

  it("shows suggested looks in an empty Presets segment", () => {
    render(
      <LibrarySegments
        initialTab="presets"
        {...baseProps}
        suggestions={[{ id: "s1" } as never]}
      />
    );
    expect(
      screen.getByText("Looks you save appear here.")
    ).toBeInTheDocument();
    expect(screen.getByText("Start with these")).toBeInTheDocument();
  });
});

describe("parseLibrarySegment", () => {
  it("maps known tab params and falls back to results", () => {
    expect(parseLibrarySegment("presets")).toBe("presets");
    expect(parseLibrarySegment("runs")).toBe("runs");
    expect(parseLibrarySegment("results")).toBe("results");
    expect(parseLibrarySegment("bogus")).toBe("results");
    expect(parseLibrarySegment(null)).toBe("results");
  });
});
