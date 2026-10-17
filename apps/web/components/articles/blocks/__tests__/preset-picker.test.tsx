import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresetPicker } from "../preset-picker";
import { fetchCatalogPage } from "@/lib/catalog/browser";
import type { PublicProductSummary } from "@/types/catalog";

vi.mock("@/lib/catalog/browser", () => ({
  fetchCatalogPage: vi.fn(),
}));

const fetchMock = vi.mocked(fetchCatalogPage);

function product(
  n: number,
  overrides: Partial<PublicProductSummary> = {}
): PublicProductSummary {
  return {
    id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
    slug: `preset-${n}`,
    name: `Preset ${n}`,
    type: n % 2 === 0 ? "poster" : "filter",
    short_description: `Look ${n}`,
    long_description: null,
    category_id: null,
    category_slug: null,
    category_name: "Portrait",
    featured_rank: n,
    version_id: `v${n}`,
    version_number: 1,
    credit_cost: 3,
    output_sizes: [],
    metadata: null,
    hero_asset_id: null,
    poster_asset_id: null,
    preview_gif_asset_id: null,
    preview_video_asset_id: null,
    public_assets: [],
    created_at: null,
    likeness_level: null,
    ...overrides,
  };
}

function page(n: number, total: number) {
  return {
    products: Array.from({ length: n }, (_, i) => product(i + 1)),
    totalCount: total,
  };
}

const SEARCH_DEBOUNCE_MS = 300;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(page(3, 3));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PresetPicker", () => {
  it("loads the first catalog page on open and lists options", async () => {
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText("Preset 1")).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 12, type: null })
    );
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("debounces the search box before querying the catalog", async () => {
    vi.useFakeTimers();
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400); // initial load settles
    });
    fetchMock.mockClear();

    const input = screen.getByRole("combobox", { name: /search presets/i });
    fireEvent.change(input, { target: { value: "film" } });
    // Nothing yet — still inside the debounce window.
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS + 50);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: "film", page: 1 })
    );
  });

  it("moves the active option with arrows and picks with Enter", async () => {
    const onPick = vi.fn();
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={onPick} />);

    await waitFor(() =>
      expect(screen.getByText("Preset 3")).toBeInTheDocument()
    );

    const input = screen.getByRole("combobox", { name: /search presets/i });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const active = screen
      .getAllByRole("option")
      .find((o) => o.getAttribute("aria-selected") === "true");
    expect(active).toHaveTextContent("Preset 2");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({
        presetId: product(2).id,
        slug: "preset-2",
        publicVersionId: "v2",
      })
    );
  });

  it("paginates with Previous/Next and sends the page to the RPC", async () => {
    fetchMock.mockResolvedValue(page(12, 30));
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      )
    );
  });

  it("filters by product type via the tabs", async () => {
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await waitFor(() => screen.getByText("Preset 1"));

    fireEvent.click(screen.getByRole("tab", { name: "Posters" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: "poster" })
      )
    );
  });

  it("shows the empty state when no public presets match", async () => {
    fetchMock.mockResolvedValue({ products: [], totalCount: 0 });
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await waitFor(() =>
      expect(
        screen.getByText(/No presets match your search/)
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Only published filters/)).toBeInTheDocument();
  });

  it("shows the error state on a failed request and retries", async () => {
    // fetchCatalogPage swallows RPC failures into a typed error field — the
    // picker must surface it rather than fake an empty catalog.
    fetchMock.mockResolvedValue({
      products: [],
      totalCount: 0,
      error: "catalog_query_failed",
    });
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    await waitFor(() =>
      expect(
        screen.getByText(/Couldn't load the catalog/)
      ).toBeInTheDocument()
    );
    // It must NOT claim an empty catalog.
    expect(
      screen.queryByText(/No presets match/)
    ).not.toBeInTheDocument();

    fetchMock.mockResolvedValue(page(2, 2));
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() =>
      expect(screen.getByText("Preset 1")).toBeInTheDocument()
    );
  });

  it("exposes a labelled listbox for assistive tech", async () => {
    render(<PresetPicker open onOpenChange={vi.fn()} onPick={vi.fn()} />);
    const listbox = await screen.findByRole("listbox", {
      name: /preset results/i,
    });
    expect(listbox).toBeInTheDocument();
    await waitFor(() =>
      expect(
        listbox.querySelectorAll('[role="option"]').length
      ).toBeGreaterThan(0)
    );
    expect(
      listbox.querySelector('[role="option"]')
    ).toHaveAccessibleName();
  });
});
