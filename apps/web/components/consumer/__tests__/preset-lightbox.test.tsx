import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PresetView } from "@/lib/catalog/preset-view";
import type { FamilyRailMember } from "@/lib/catalog/family";
import type { PublicProductDetail } from "@/types/catalog";

const push = vi.fn();
const fetchPresetView = vi.fn();
const router = { push, replace: vi.fn(), prefetch: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/presets/warm-look",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/catalog/actions", () => ({
  fetchPresetView: (...args: unknown[]) => fetchPresetView(...args),
}));

// The related rail is orthogonal to variant swapping — stub it.
vi.mock("@/components/consumer/related-presets-section", () => ({
  RelatedPresetsSection: () => null,
}));

vi.mock("@/app/actions/favorites", () => ({ toggleFavorite: vi.fn() }));
vi.mock("@/lib/teaser/pending", () => ({
  createPendingGeneration: vi.fn(),
  prepareTeaserSourceUpload: vi.fn(),
}));

import { PresetLightbox } from "../preset-lightbox";

const WARM = {
  id: "p1",
  slug: "warm-look",
  name: "Warm Look",
  type: "filter",
  short_description: "A warm grade",
  long_description: null,
  category_id: null,
  category_slug: "warm",
  category_name: "Warm",
  featured_rank: null,
  version_id: "v1",
  version_number: 2,
  credit_cost: 5,
  output_sizes: [],
  metadata: null,
  hero_asset_id: null,
  poster_asset_id: null,
  preview_gif_asset_id: null,
  preview_video_asset_id: null,
  public_assets: [],
  created_at: "2026-01-01T00:00:00Z",
  likeness_level: "high",
  active_fields: [],
  parent_preset_id: null,
  standalone_discoverable: false,
  variant_count: 1,
  parent_slug: null,
  parent_name: null,
  parent_is_public: null,
  variant_display_name: null,
  family_id: "fam1",
  input_capability: null,
} as unknown as PublicProductDetail;

const COOL = {
  ...WARM,
  id: "p2",
  slug: "cool-look",
  name: "Cool Look",
  short_description: "A cool grade",
  parent_preset_id: "p1",
  parent_slug: "warm-look",
  parent_name: "Warm Look",
} as unknown as PublicProductDetail;

const MEMBERS: FamilyRailMember[] = [
  {
    productId: "p1",
    slug: "warm-look",
    name: "Warm Look",
    label: "Original",
    isParent: true,
    isCurrent: true,
    available: true,
    creditCost: 5,
    previewUrl: null,
    inputCapability: null,
  },
  {
    productId: "p2",
    slug: "cool-look",
    name: "Cool Look",
    label: "Cool",
    isParent: false,
    isCurrent: false,
    available: true,
    creditCost: 5,
    previewUrl: null,
    inputCapability: null,
  },
];

const view = (product: PublicProductDetail): PresetView => ({
  product,
  publicPromptRecipe: null,
  related: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/presets/warm-look");
  fetchPresetView.mockImplementation(async (slug: string) =>
    slug === "cool-look" ? view(COOL) : slug === "warm-look" ? view(WARM) : null
  );
});

describe("PresetLightbox — in-place variant swap", () => {
  it("swaps the console without a router navigation", async () => {
    render(
      <PresetLightbox
        initial={view(WARM)}
        familyMembers={MEMBERS}
        isAuthenticated
        favoriteIds={[]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Warm Look" })
    ).toBeInTheDocument();

    // act() flushes the awaited fetchPresetView → setState commit.
    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "Cool" }));
    });

    expect(
      screen.getByRole("heading", { name: "Cool Look" })
    ).toBeInTheDocument();

    // URL follows the swap without a soft navigation.
    expect(window.location.pathname).toBe("/presets/cool-look");
    expect(fetchPresetView).toHaveBeenCalledWith("cool-look");
    expect(push).not.toHaveBeenCalled();
    expect(
      screen.getByRole("option", { name: "Cool" })
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getAllByRole("link", { name: "Try Cool Look" }).length
    ).toBeGreaterThan(0);
  });

  it("keeps the current variant on chip re-select", () => {
    render(
      <PresetLightbox
        initial={view(WARM)}
        familyMembers={MEMBERS}
        isAuthenticated
        favoriteIds={[]}
      />
    );

    fireEvent.click(screen.getByRole("option", { name: "Original" }));
    expect(fetchPresetView).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/presets/warm-look");
  });

  it("falls back to a real navigation when the payload fails", async () => {
    fetchPresetView.mockResolvedValue(null);
    render(
      <PresetLightbox
        initial={view(WARM)}
        familyMembers={MEMBERS}
        isAuthenticated
        favoriteIds={[]}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: "Cool" }));
    });

    expect(push).toHaveBeenCalledWith("/presets/cool-look");
    // The failed view never replaces the on-screen preset.
    expect(
      screen.getByRole("heading", { name: "Warm Look" })
    ).toBeInTheDocument();
  });
});
