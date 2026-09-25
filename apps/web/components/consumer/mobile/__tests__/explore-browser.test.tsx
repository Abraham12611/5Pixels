import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { ExploreMobileBrowser } from "@/components/consumer/mobile/explore-browser";
import type { ParsedCatalogFilters } from "@/lib/catalog/filters";
import type { PublicProductSummary } from "@/types/catalog";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/explore",
}));

const fetchCatalogPage = vi.fn();
vi.mock("@/lib/catalog/browser", () => ({
  fetchCatalogPage: (...args: unknown[]) => fetchCatalogPage(...args),
  fetchCategoryCounts: vi
    .fn()
    .mockResolvedValue({ counts: {}, total: 0 }),
}));

function makeProduct(id: string, name: string): PublicProductSummary {
  return {
    id,
    slug: id,
    name,
    type: "filter",
    short_description: `${name} look`,
    long_description: null,
    category_id: null,
    category_slug: "cinematic",
    category_name: "Cinematic",
    featured_rank: null,
    version_id: null,
    version_number: 1,
    credit_cost: 5,
    output_sizes: [],
    metadata: null,
    hero_asset_id: null,
    poster_asset_id: null,
    preview_gif_asset_id: null,
    preview_video_asset_id: null,
    public_assets: [],
    created_at: null,
    likeness_level: null,
  };
}

const FILTERS: ParsedCatalogFilters = {
  type: null,
  category: null,
  search: null,
  sort: "featured",
  page: 1,
  pageSize: 2,
  errors: [],
};

const CATEGORIES = [{ slug: "cinematic", name: "Cinematic" }];

function renderBrowser(
  overrides: Partial<Parameters<typeof ExploreMobileBrowser>[0]> = {}
) {
  return render(
    <ExploreMobileBrowser
      initialProducts={[makeProduct("p1", "First"), makeProduct("p2", "Second")]}
      initialPage={1}
      totalCount={4}
      filters={FILTERS}
      categories={CATEGORIES}
      isAuthenticated={false}
      favoriteIds={[]}
      returnPath="/explore"
      suggestions={[]}
      headerOffsetClass="top-16"
      {...overrides}
    />
  );
}

beforeEach(() => {
  push.mockReset();
  fetchCatalogPage.mockReset();
});

describe("ExploreMobileBrowser", () => {
  it("renders the sticky controls and result count", () => {
    renderBrowser();
    expect(screen.getByLabelText("Search looks")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filters" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sort looks" })
    ).toBeInTheDocument();
    expect(screen.getByText("4 looks")).toBeInTheDocument();
  });

  it("loads the next page on tap, appends items and syncs ?page=", async () => {
    fetchCatalogPage.mockResolvedValue({
      products: [makeProduct("p3", "Third"), makeProduct("p4", "Fourth")],
      totalCount: 4,
    });
    const replaceState = vi.spyOn(window.history, "replaceState");

    renderBrowser();
    fireEvent.click(
      screen.getByRole("button", { name: "Load more looks" })
    );

    await waitFor(() =>
      expect(screen.getByText("Fourth")).toBeInTheDocument()
    );
    expect(fetchCatalogPage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 2 })
    );
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/explore?page=2&page_size=2"
    );
    expect(
      screen.queryByRole("button", { name: "Load more looks" })
    ).not.toBeInTheDocument();
  });

  it("category chips navigate with the category param", () => {
    renderBrowser();
    fireEvent.click(screen.getByRole("tab", { name: "Cinematic" }));
    expect(push).toHaveBeenCalledWith("/explore?category=cinematic");
  });

  it("shows the active-filter count on the Filters trigger", () => {
    renderBrowser({
      filters: { ...FILTERS, type: "filter", category: "cinematic" },
    });
    expect(
      screen.getByRole("button", { name: "Filters, 2 active" })
    ).toBeInTheDocument();
  });

  it("renders the empty state with suggestions", () => {
    renderBrowser({
      initialProducts: [],
      totalCount: 0,
      suggestions: [makeProduct("s1", "Suggested")],
    });
    expect(screen.getByText(/No looks match/)).toBeInTheDocument();
    expect(screen.getByText("Suggested")).toBeInTheDocument();
  });
});
