import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleCard } from "../article-card";
import type { PublicArticleSummary } from "@/lib/articles/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/articles",
  useSearchParams: () => new URLSearchParams(),
}));

function makeArticle(
  overrides: Partial<PublicArticleSummary> = {}
): PublicArticleSummary {
  return {
    article_id: "aaaaaaaa-0000-4000-8000-000000000001",
    slug: "neon-portrait-guide",
    title: "Neon portrait guide",
    summary: "How we built the neon look.",
    topic: "Portraits",
    tags: ["neon", "portrait", "studio"],
    cover: {
      assetId: "bbbbbbbb-0000-4000-8000-000000000002",
      bucket: "article-media-public",
      storageKey: "articles/a/c.png",
      mimeType: "image/png",
      width: 1600,
      height: 900,
    },
    author_display_name: "Studio Team",
    author_avatar: null,
    published_at: "2026-10-01T12:00:00Z",
    word_count: 800,
    ...overrides,
  };
}

describe("ArticleCard", () => {
  it("links to the public article route and shows title + summary", () => {
    render(<ArticleCard article={makeArticle()} />);
    const link = screen.getByRole("link", { name: /Neon portrait guide/i });
    expect(link).toHaveAttribute("href", "/articles/neon-portrait-guide");
    expect(screen.getByText("How we built the neon look.")).toBeInTheDocument();
  });

  it("shows topic badge, tags, author name, date and reading time", () => {
    render(<ArticleCard article={makeArticle()} />);
    expect(screen.getByText("Portraits")).toBeInTheDocument();
    expect(screen.getByText("neon")).toBeInTheDocument();
    expect(screen.getByText("Studio Team")).toBeInTheDocument();
    expect(screen.getByText(/4 min read/)).toBeInTheDocument();
    expect(
      screen.getByText("Oct 1, 2026", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders cover only from the public projection", () => {
    const { container } = render(<ArticleCard article={makeArticle()} />);
    // alt="" imgs are presentational — query the DOM directly.
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toContain(
      "/storage/v1/object/public/article-media-public/articles/a/c.png"
    );
    expect(img!.getAttribute("src")).not.toContain("token=");
  });

  it("falls back gracefully without cover/avatar", () => {
    render(
      <ArticleCard
        article={makeArticle({ cover: null, author_avatar: null })}
      />
    );
    expect(screen.getByText("5Pixels")).toBeInTheDocument();
    // Initial fallback avatar
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("clamps tag overflow to 4 chips", () => {
    render(
      <ArticleCard
        article={makeArticle({ tags: ["a", "b", "c", "d", "e", "f"] })}
      />
    );
    expect(screen.getByText("d")).toBeInTheDocument();
    expect(screen.queryByText("e")).not.toBeInTheDocument();
  });
});
