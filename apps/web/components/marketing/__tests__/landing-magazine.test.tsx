import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
import { LaunchCarousel } from "../launch-carousel";
import { CtaGrid } from "../cta-grid";
import { PresetShelf } from "../preset-shelf";
import { PromoBanner } from "../promo-banner";
import { BrowseGrid } from "../browse-grid";
import { LANDING_TILES, BROWSE_LINKS } from "@/lib/marketing/landing-content";
import type { PublicProductSummary } from "@/types/catalog";

function makeProduct(slug: string): PublicProductSummary {
  return {
    id: `id-${slug}`,
    slug,
    name: `Preset ${slug}`,
    type: "filter",
    short_description: `${slug} look`,
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

describe("LaunchCarousel", () => {
  const cards = [
    {
      id: "a",
      eyebrow: "NEW MODEL",
      title: "Nano Banana 2",
      tagline: "tag",
      href: "/explore",
      imageUrl: null,
      imageAlt: "art",
    },
    {
      id: "b",
      eyebrow: "DROP",
      title: "Retro Slam Manga",
      tagline: "tag",
      href: "/presets/retro-slam-manga",
      imageUrl: null,
      imageAlt: "art",
    },
  ];

  it("triples the deck for the seamless loop, with only the middle copy focusable", () => {
    const { container } = render(<LaunchCarousel cards={cards} />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(cards.length * 3);

    const focusable = [...links].filter((l) => l.tabIndex === 0);
    expect(focusable).toHaveLength(cards.length);
    for (const link of focusable) {
      expect(link).not.toHaveAttribute("aria-hidden", "true");
    }
    const inert = [...links].filter((l) => l.tabIndex === -1);
    for (const link of inert) {
      expect(link).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("exposes labeled arrow controls and a scrollable region", () => {
    render(<LaunchCarousel cards={cards} />);
    expect(
      screen.getByRole("button", { name: /scroll launches backward/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /scroll launches forward/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /launch carousel/i })
    ).toBeInTheDocument();
  });

  it("renders nothing for an empty deck", () => {
    const { container } = render(<LaunchCarousel cards={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("CtaGrid", () => {
  it("shows the discount signup CTA for anonymous visitors", () => {
    render(<CtaGrid isAuthenticated={false} tiles={LANDING_TILES} />);
    const cta = screen.getByRole("button", { name: /sign up and get your/i });
    expect(cta).toHaveAttribute("aria-haspopup", "dialog");
    expect(cta.textContent).toContain("extra discount");
  });

  it("swaps the signup CTA for a pricing link when signed in", () => {
    render(<CtaGrid isAuthenticated tiles={LANDING_TILES} />);
    expect(
      screen.getByRole("link", { name: /unlock your extra discount/i })
    ).toHaveAttribute("href", "/pricing");
    expect(
      screen.queryByRole("button", { name: /sign up and get your/i })
    ).not.toBeInTheDocument();
  });

  it("renders the sharp signup benefit bullets", () => {
    render(<CtaGrid isAuthenticated={false} tiles={LANDING_TILES} />);
    for (const copy of [
      "Access Nano Banana 2 & Pro presets",
      "Unlock your extra annual discount",
      "4K studio filters & typographic posters",
    ]) {
      expect(screen.getByText(copy)).toBeInTheDocument();
    }
  });

  it("marks NEW tiles with an inline badge", () => {
    render(<CtaGrid isAuthenticated={false} tiles={LANDING_TILES} />);
    const badges = screen.getAllByText("NEW");
    expect(badges.length).toBe(
      LANDING_TILES.filter((t) => t.badge === "NEW").length
    );
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders every configured tile as a link", () => {
    render(<CtaGrid isAuthenticated={false} tiles={LANDING_TILES} />);
    const links = screen.getAllByRole("link");
    for (const tile of LANDING_TILES) {
      const match = links.find(
        (l) =>
          l.getAttribute("href") === tile.href &&
          l.textContent?.includes(tile.title)
      );
      expect(match, `tile "${tile.title}" → ${tile.href}`).toBeTruthy();
    }
  });
});

describe("PresetShelf", () => {
  const products = [makeProduct("one"), makeProduct("two"), makeProduct("three")];

  it("clamps the masonry and links the title + faded view-all button", () => {
    const { container } = render(
      <PresetShelf
        id="shelf-x"
        title="Nano Banana 2"
        tagline="tag"
        products={products}
        viewAllHref="/models/nano-banana-2/presets"
        viewAllLabel="View all of Nano Banana 2"
        isAuthenticated={false}
      />
    );
    const grid = container.querySelector("[data-explore-masonry]");
    expect(grid).not.toBeNull();
    expect(grid?.className).toContain("columns-2");
    // The clip lives on the wrapper around the masonry columns.
    const clip = grid?.parentElement;
    expect(clip?.className).toContain("overflow-hidden");
    expect(clip?.className).toContain("max-h-[56rem]");

    // Title heading links to the same listing as the faded View-all button.
    expect(
      screen.getByRole("link", { name: "Nano Banana 2" })
    ).toHaveAttribute("href", "/models/nano-banana-2/presets");
    expect(
      screen.getByRole("link", { name: /view all of nano banana 2/i })
    ).toHaveAttribute("href", "/models/nano-banana-2/presets");
  });

  it("renders the Start generating / Learn more pills when configured", () => {
    render(
      <PresetShelf
        id="shelf-x"
        title="Nano Banana 2"
        products={products}
        viewAllHref="/models/nano-banana-2/presets"
        viewAllLabel="View all"
        startHref="/presets/cover-star"
        learnMoreHref="/models/nano-banana-2"
        isAuthenticated={false}
      />
    );
    expect(
      screen.getByRole("link", { name: /start generating/i })
    ).toHaveAttribute("href", "/presets/cover-star");
    expect(
      screen.getByRole("link", { name: /learn more/i })
    ).toHaveAttribute("href", "/models/nano-banana-2");
  });

  it("renders a card per product", () => {
    render(
      <PresetShelf
        id="shelf-x"
        title="T"
        products={products}
        viewAllHref="/explore"
        viewAllLabel="View all"
        isAuthenticated={false}
      />
    );
    expect(screen.getByText("Preset one")).toBeInTheDocument();
    expect(screen.getByText("Preset three")).toBeInTheDocument();
  });

  it("renders nothing when the product list is empty", () => {
    const { container } = render(
      <PresetShelf
        id="empty"
        title="Empty"
        products={[]}
        viewAllHref="/explore"
        viewAllLabel="View all"
        isAuthenticated={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("PromoBanner", () => {
  it("links the whole banner to its href", () => {
    render(
      <PromoBanner
        banner={{
          id: "p",
          eyebrow: "NEW",
          title: "Posters",
          body: "body",
          ctaLabel: "Try it",
          href: "/explore?type=poster",
          presetSlug: null,
        }}
        imageUrl={null}
        imageAlt=""
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/explore?type=poster");
    expect(link.textContent).toContain("Posters");
  });
});

describe("BrowseGrid", () => {
  it("renders every browse link", () => {
    render(<BrowseGrid links={BROWSE_LINKS} />);
    for (const link of BROWSE_LINKS) {
      expect(
        screen.getByRole("link", { name: new RegExp(link.label, "i") })
      ).toHaveAttribute("href", link.href);
    }
  });
});
