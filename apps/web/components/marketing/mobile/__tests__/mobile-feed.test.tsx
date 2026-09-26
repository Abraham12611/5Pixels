import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileFeed } from "../mobile-feed";
import { LandingQuickViewHost } from "../landing-quick-view";
import type { LandingFeedItem } from "../landing-feed-types";

const items: LandingFeedItem[] = [
  {
    id: "1",
    slug: "midnight-premiere",
    name: "Midnight Premiere",
    type: "filter",
    shortDescription: "Film-noir grade",
    categoryName: "Cinematic",
    categorySlug: "cinematic",
    creditCost: 4,
    thumbUrl: null,
    previewUrl: null,
    previewVideoUrl: null,
    exampleUrls: [],
    available: true,
  },
  {
    id: "2",
    slug: "modern-cover",
    name: "Modern Cover",
    type: "poster",
    shortDescription: "Magazine cover",
    categoryName: "Covers",
    categorySlug: "covers",
    creditCost: 6,
    thumbUrl: null,
    previewUrl: null,
    previewVideoUrl: null,
    exampleUrls: [],
    available: true,
  },
];

const categories = [
  { slug: "cinematic", name: "Cinematic" },
  { slug: "covers", name: "Covers" },
];

function renderFeed() {
  return render(
    <LandingQuickViewHost isAuthenticated={false}>
      <MobileFeed items={items} categories={categories} />
    </LandingQuickViewHost>
  );
}

describe("MobileFeed", () => {
  it("shows every look under the All chip", () => {
    renderFeed();
    expect(screen.getAllByText("Midnight Premiere").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Modern Cover").length).toBeGreaterThan(0);
  });

  it("renders the section grammar: chip tablist, rail, and see-all links", () => {
    renderFeed();
    expect(
      screen.getByRole("tablist", { name: "Filter looks" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Trending looks" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /see all/i }).length
    ).toBeGreaterThan(0);
  });

  it("filters the feed when a category chip is selected", () => {
    renderFeed();
    fireEvent.click(screen.getByRole("tab", { name: "Covers" }));
    expect(screen.queryByText("Midnight Premiere")).not.toBeInTheDocument();
    expect(screen.getAllByText("Modern Cover").length).toBeGreaterThan(0);
  });

  it("hides the trending rail while a category chip is active", () => {
    renderFeed();
    fireEvent.click(screen.getByRole("tab", { name: "Covers" }));
    expect(
      screen.queryByRole("list", { name: "Trending looks" })
    ).not.toBeInTheDocument();
  });

  it("opens the quick sheet when a card is tapped", () => {
    renderFeed();
    fireEvent.click(screen.getAllByText("Modern Cover")[0]!);
    expect(
      screen.getByRole("dialog", { name: "Modern Cover quick preview" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /use this look/i })
    ).toHaveAttribute("href", "/app/create/modern-cover");
  });
});
