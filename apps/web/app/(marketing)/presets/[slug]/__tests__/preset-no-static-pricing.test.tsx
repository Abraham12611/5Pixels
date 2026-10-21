import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getUser = vi.fn();
const getPublicProductBySlug = vi.fn();
const getUserFavoriteProductIds = vi.fn();
const getPresetFamilyRail = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/presets/warm-look",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/db/explore", () => ({
  getPublicProductBySlug: (...args: unknown[]) =>
    getPublicProductBySlug(...args),
  getUserFavoriteProductIds: () => getUserFavoriteProductIds(),
  getPublicProductEditorial: vi.fn(async () => null),
  // RelatedPresets is stubbed below, but keep the export in case the page
  // wiring changes.
  getPublicProducts: vi.fn(async () => ({ data: [] })),
}));

vi.mock("@/lib/catalog/family", () => ({
  getPresetFamilyRail: (...args: unknown[]) => getPresetFamilyRail(...args),
}));

// Related rail — the swap path resolves related products itself; pricing
// coverage lives in the rendered surface under test.
vi.mock("@/components/consumer/related-presets-section", () => ({
  RelatedPresetsSection: () => null,
}));

// Server action used by the lightbox's in-place variant swap — not exercised
// by these render assertions.
vi.mock("@/lib/catalog/actions", () => ({
  fetchPresetView: vi.fn(async () => null),
}));

vi.mock("@/app/actions/favorites", () => ({ toggleFavorite: vi.fn() }));
vi.mock("@/lib/teaser/pending", () => ({
  createPendingGeneration: vi.fn(),
  prepareTeaserSourceUpload: vi.fn(),
}));

import PresetDetailPage from "../page";

/**
 * #248: the public detail page must never present the legacy static
 * `product_versions.credit_cost` as a price — the authoritative quote only
 * appears inside Create. `credit_cost: 5` stays in the fixture to prove it
 * is no longer rendered anywhere.
 */
const PRODUCT = {
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
  variant_count: 0,
  parent_slug: null,
  parent_name: null,
  parent_is_public: null,
  variant_display_name: null,
  family_id: "p1",
  input_capability: null,
};

function signedIn() {
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
}

function signedOut() {
  getUser.mockResolvedValue({ data: { user: null } });
}

async function renderPage() {
  return render(
    await PresetDetailPage({
      params: Promise.resolve({ slug: "warm-look" }),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getPublicProductBySlug.mockResolvedValue({ data: PRODUCT, error: null });
  getUserFavoriteProductIds.mockResolvedValue([]);
  getPresetFamilyRail.mockResolvedValue({ data: [] });
});

describe("PresetDetailPage — no static credit pricing (#248)", () => {
  it("renders no credit price for signed-in users", async () => {
    signedIn();
    await renderPage();
    expect(screen.queryByText(/\bcredits?\b/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /credit/i })
    ).not.toBeInTheDocument();
  });

  it("keeps CTA labels free of the static cost", async () => {
    signedIn();
    await renderPage();
    // One shared CTA renders in the console footer and the mobile docked
    // bar — both carry the same "Try {name}" label.
    expect(
      screen.getAllByRole("link", { name: "Try Warm Look" }).length
    ).toBeGreaterThan(0);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("aria-label") ?? "").not.toMatch(/credit/i);
    }
  });

  it("keeps the docked info line free of the static cost", async () => {
    signedIn();
    await renderPage();
    expect(
      screen.getByText("Each run is unique — results will differ")
    ).toBeInTheDocument();
  });

  it("shows the anonymous teaser without a credit price", async () => {
    signedOut();
    await renderPage();
    // Anon CTAs are the teaser launcher — the flow mounts on tap, so the
    // page-level affordance is the "Try this look" button itself.
    const launchers = screen.getAllByRole("button", {
      name: "Try this look",
    });
    expect(launchers.length).toBeGreaterThan(0);
    for (const launcher of launchers) {
      expect(launcher).not.toHaveTextContent(/credit/i);
    }
    expect(screen.queryByText(/\bcredits?\b/i)).not.toBeInTheDocument();
  });

  it("emits JSON-LD without an Offer price", async () => {
    signedOut();
    await renderPage();
    const script = document.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).not.toBeNull();
    const ld = JSON.parse(script!.innerHTML);
    expect(ld.offers).toBeUndefined();
    expect(JSON.stringify(ld)).not.toMatch(/price|credit/i);
  });
});
