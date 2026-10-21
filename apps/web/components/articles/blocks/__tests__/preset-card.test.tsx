import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticlePresetCard } from "../preset-card";
import type { PresetCardData } from "@/lib/articles/preset-card";
import { trackEvent } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({
  trackEvent: vi.fn(),
  useTrackClick: () => vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const CARD: PresetCardData = {
  productId: "11111111-2222-3333-4444-555555555555",
  slug: "film-grain-portrait",
  name: "Film Grain Portrait",
  type: "filter",
  shortDescription: "Analog grain, soft skin tones",
  categoryName: "Portrait",
  creditCost: 4,
  activeVersionId: "66666666-7777-4888-8999-000000000000",
  versionNumber: 3,
  imageUrl: "https://cdn.example.test/film.png",
  videoUrl: null,
  href: "/presets/film-grain-portrait",
};

describe("ArticlePresetCard", () => {
  it("renders name, type badge and the Try this look deep link — no static price (#248)", () => {
    render(<ArticlePresetCard preset={CARD} />);
    expect(
      screen.getByText("Film Grain Portrait")
    ).toBeInTheDocument();
    expect(screen.getByText("Filter")).toBeInTheDocument();
    expect(screen.queryByText(/credit/i)).not.toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /try this look/i });
    expect(cta).toHaveAttribute("href", "/presets/film-grain-portrait");
  });

  it("fires article_preset_click with canonical ids on CTA click", () => {
    render(
      <ArticlePresetCard
        preset={CARD}
        analyticsProps={{ article_id: "art-1" }}
      />
    );
    fireEvent.click(screen.getByRole("link", { name: /try this look/i }));
    expect(trackEvent).toHaveBeenCalledWith({
      event: "article_preset_click",
      props: {
        preset_id: CARD.productId,
        slug: CARD.slug,
        article_id: "art-1",
      },
    });
  });

  it("renders the compact variant with the same link contract", () => {
    render(<ArticlePresetCard preset={CARD} variant="compact" />);
    const cta = screen.getByRole("link", { name: /try this look/i });
    expect(cta).toHaveAttribute("href", "/presets/film-grain-portrait");
    expect(screen.getByText("Film Grain Portrait")).toBeInTheDocument();
  });

  it("notes when a pinned version is stale", () => {
    render(<ArticlePresetCard preset={CARD} pinnedVersionStale />);
    expect(screen.getByText(/Shows the current version/)).toBeInTheDocument();
  });

  it("renders a non-interactive fallback for retired/missing presets", () => {
    render(<ArticlePresetCard preset={null} />);
    expect(
      screen.getByText("This preset is no longer available")
    ).toBeInTheDocument();
    // No link out — the safe fallback must not offer navigation.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
