import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileFeed } from "../mobile-feed";
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

describe("MobileFeed", () => {
  it("shows every look under the All chip", () => {
    render(<MobileFeed items={items} categories={categories} />);
    expect(screen.getAllByText("Midnight Premiere").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Modern Cover").length).toBeGreaterThan(0);
  });

  it("filters the feed when a category chip is selected", () => {
    render(<MobileFeed items={items} categories={categories} />);
    fireEvent.click(screen.getByRole("tab", { name: "Covers" }));
    expect(screen.queryByText("Midnight Premiere")).not.toBeInTheDocument();
    expect(screen.getAllByText("Modern Cover").length).toBeGreaterThan(0);
  });

  it("opens the quick sheet when a card is tapped", () => {
    render(<MobileFeed items={items} categories={categories} />);
    fireEvent.click(screen.getAllByText("Modern Cover")[0]!);
    expect(
      screen.getByRole("dialog", { name: "Modern Cover quick preview" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /use this look/i })
    ).toHaveAttribute("href", "/app/create/modern-cover");
  });
});
