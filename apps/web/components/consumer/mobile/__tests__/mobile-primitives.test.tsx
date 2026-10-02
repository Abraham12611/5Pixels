import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MobileSection } from "../mobile-section";
import { MobileRail } from "../mobile-rail";
import { DockedActionBar } from "../docked-action-bar";

describe("MobileSection", () => {
  it("renders a titled section with an optional See all link", () => {
    render(
      <MobileSection title="Trending looks" seeAllHref="/explore">
        <p>content</p>
      </MobileSection>
    );

    expect(
      screen.getByRole("heading", { name: "Trending looks" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute(
      "href",
      "/explore"
    );
  });

  it("omits the See all link when there is no destination", () => {
    render(
      <MobileSection title="Recent">
        <p>content</p>
      </MobileSection>
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("MobileRail", () => {
  it("exposes a labelled, keyboard-reachable list of items", () => {
    render(
      <MobileRail label="Trending looks">
        <span>one</span>
        <span>two</span>
      </MobileRail>
    );

    const rail = screen.getByRole("list", { name: "Trending looks" });
    expect(rail).toHaveAttribute("tabindex", "0");
    expect(within(rail).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("DockedActionBar", () => {
  it("renders the cost line, the action and a disabled reason", () => {
    render(
      <DockedActionBar info="5 credits · 12 left" reason="Add a photo to generate">
        <button type="button" disabled>
          Generate
        </button>
      </DockedActionBar>
    );

    expect(screen.getByText("5 credits · 12 left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
    expect(screen.getByText("Add a photo to generate")).toBeInTheDocument();
  });
});
