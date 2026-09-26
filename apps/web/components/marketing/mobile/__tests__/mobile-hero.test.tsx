import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileHero } from "../mobile-hero";
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

function renderHero() {
  return render(
    <LandingQuickViewHost isAuthenticated={false}>
      <MobileHero items={items} />
    </LandingQuickViewHost>
  );
}

describe("MobileHero", () => {
  it("exposes carousel semantics with labelled slides", () => {
    renderHero();
    expect(
      screen.getByRole("group", { name: "Featured looks" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Featured preset slides")).toBeInTheDocument();
    expect(screen.getByLabelText("1 of 2")).toBeInTheDocument();
    expect(screen.getByLabelText("2 of 2")).toBeInTheDocument();
  });

  it("opens the quick sheet from the Preview ghost", () => {
    renderHero();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Preview" })[0]!
    );
    expect(
      screen.getByRole("dialog", { name: "Midnight Premiere quick preview" })
    ).toBeInTheDocument();
  });

  it("keeps the Use this look action pointing at the studio", () => {
    renderHero();
    expect(
      screen.getAllByRole("link", { name: /use this look/i })[0]
    ).toHaveAttribute("href", "/app/create/midnight-premiere");
  });
});
