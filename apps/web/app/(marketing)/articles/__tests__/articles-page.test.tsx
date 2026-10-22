import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { PublicArticleSummary } from "@/lib/articles/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/articles",
  useSearchParams: () => new URLSearchParams(),
}));

const getPublishedArticles = vi.fn();
const getPublishedArticleTopics = vi.fn();
vi.mock("@/lib/articles/queries", () => ({
  getPublishedArticles: (...args: unknown[]) => getPublishedArticles(...args),
  getPublishedArticleTopics: (...args: unknown[]) =>
    getPublishedArticleTopics(...args),
}));

import ArticlesPage from "../page";

function article(
  slug: string,
  overrides: Partial<PublicArticleSummary> = {}
): PublicArticleSummary {
  return {
    article_id: slug,
    slug,
    title: `Guide ${slug}`,
    summary: `Summary for ${slug}`,
    topic: "Portraits",
    tags: [],
    cover: null,
    author_display_name: "Studio Team",
    author_avatar: null,
    published_at: "2026-10-01T12:00:00Z",
    word_count: 400,
    ...overrides,
  };
}

const SP = (params: Record<string, string>) => Promise.resolve(params);

beforeEach(() => {
  getPublishedArticles.mockReset();
  getPublishedArticleTopics.mockReset();
  getPublishedArticleTopics.mockResolvedValue({
    data: [
      { topic: "Portraits", article_count: 3 },
      { topic: "Products", article_count: 1 },
    ],
  });
});

describe("ArticlesPage", () => {
  it("renders title, subcopy, and article cards", async () => {
    getPublishedArticles.mockResolvedValue({
      data: [article("one"), article("two")],
      totalCount: 2,
    });
    render(await ArticlesPage({ searchParams: SP({}) }));

    expect(
      screen.getByRole("heading", { name: "Articles", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Discover how it's made/i)).toBeInTheDocument();
    expect(screen.getByText("Guide one")).toBeInTheDocument();
    expect(screen.getByText("Guide two")).toBeInTheDocument();
    expect(screen.getByText(/2 articles/)).toBeInTheDocument();
  });

  it("passes searchParams through to the listing RPC", async () => {
    getPublishedArticles.mockResolvedValue({ data: [], totalCount: 0 });
    render(
      await ArticlesPage({
        searchParams: SP({ q: " neon ", topic: "Portraits", page: "2" }),
      })
    );
    expect(getPublishedArticles).toHaveBeenCalledWith({
      page: 2,
      pageSize: 12,
      topic: "Portraits",
      query: "neon",
    });
  });

  it("shows topic chips preserving the search query", async () => {
    getPublishedArticles.mockResolvedValue({
      data: [article("one")],
      totalCount: 1,
    });
    render(await ArticlesPage({ searchParams: SP({ q: "neon" }) }));

    const rail = screen.getByRole("navigation", { name: "Filter by topic" });
    const chip = within(rail).getByRole("link", { name: /Portraits/ });
    expect(chip.getAttribute("href")).toBe("/articles?topic=Portraits&q=neon");
    const all = within(rail).getByRole("link", { name: "All" });
    expect(all.getAttribute("href")).toBe("/articles?q=neon");
  });

  it("renders topic-preserving pagination", async () => {
    getPublishedArticles.mockResolvedValue({
      data: [article("one")],
      totalCount: 30,
    });
    render(
      await ArticlesPage({
        searchParams: SP({ page: "2", topic: "Portraits" }),
      })
    );
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    const prev = screen.getByRole("link", { name: /Previous/ });
    expect(prev.getAttribute("href")).toBe("/articles?topic=Portraits");
    const next = screen.getByRole("link", { name: /Next/ });
    expect(next.getAttribute("href")).toBe(
      "/articles?topic=Portraits&page=3"
    );
  });

  it("shows a filtered empty state with clear-filters affordance", async () => {
    getPublishedArticles.mockResolvedValue({ data: [], totalCount: 0 });
    render(await ArticlesPage({ searchParams: SP({ q: "zzz" }) }));
    expect(screen.getByText("No articles match")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Clear filters" })[0]
    ).toHaveAttribute("href", "/articles");
    expect(screen.getByText(/0 articles matching/)).toBeInTheDocument();
  });

  it("shows the never-published empty state", async () => {
    getPublishedArticles.mockResolvedValue({ data: [], totalCount: 0 });
    getPublishedArticleTopics.mockResolvedValue({ data: [] });
    render(await ArticlesPage({ searchParams: SP({}) }));
    expect(screen.getByText("No articles yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse presets" })
    ).toHaveAttribute("href", "/explore");
  });

  it("throws on RPC error so error.tsx handles it", async () => {
    getPublishedArticles.mockResolvedValue({
      data: [],
      error: "Unable to load articles. Please try again.",
    });
    await expect(
      ArticlesPage({ searchParams: SP({}) })
    ).rejects.toThrow("Unable to load articles");
  });

  it("search box keeps the submitted query", async () => {
    getPublishedArticles.mockResolvedValue({ data: [], totalCount: 0 });
    render(await ArticlesPage({ searchParams: SP({ q: "golden hour" }) }));
    expect(screen.getByRole("searchbox")).toHaveValue("golden hour");
  });
});
