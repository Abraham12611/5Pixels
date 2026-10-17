import { describe, expect, it, vi, beforeEach } from "vitest";

const getPublishedArticles = vi.fn();
vi.mock("@/lib/articles/queries", () => ({
  getPublishedArticles: (...args: unknown[]) => getPublishedArticles(...args),
}));

import sitemap from "../sitemap";
import robots from "../robots";

function row(slug: string) {
  return {
    article_id: slug,
    slug,
    title: `Guide ${slug}`,
    summary: "",
    topic: null,
    tags: [],
    cover: null,
    author_display_name: "Studio Team",
    author_avatar: null,
    published_at: "2026-10-01T12:00:00Z",
    word_count: 100,
  };
}

beforeEach(() => {
  getPublishedArticles.mockReset();
});

describe("sitemap", () => {
  it("includes static routes, /articles and every published slug", async () => {
    getPublishedArticles.mockResolvedValue({
      data: [row("neon-guide"), row("studio-light")],
      totalCount: 2,
    });

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain("https://5pixels.app/");
    expect(urls).toContain("https://5pixels.app/articles");
    expect(urls).toContain("https://5pixels.app/articles/neon-guide");
    expect(urls).toContain("https://5pixels.app/articles/studio-light");
    // Only what the published-only RPC returned — no drafts/paths can leak.
    expect(urls.every((u) => !u.includes("draft"))).toBe(true);
    expect(urls.every((u) => !u.startsWith("https://5pixels.app/admin"))).toBe(
      true
    );
    expect(urls.every((u) => !u.startsWith("https://5pixels.app/app"))).toBe(
      true
    );
  });

  it("paginates through the RPC until a short page", async () => {
    const full = Array.from({ length: 50 }, (_, i) => row(`a-${i}`));
    getPublishedArticles
      .mockResolvedValueOnce({ data: full, totalCount: 51 })
      .mockResolvedValueOnce({ data: [row("a-50")], totalCount: 51 });

    const entries = await sitemap();
    expect(getPublishedArticles).toHaveBeenCalledTimes(2);
    expect(
      entries.filter((e) => e.url.includes("/articles/a-")).length
    ).toBe(51);
  });

  it("degrades to static routes when the RPC fails", async () => {
    getPublishedArticles.mockResolvedValue({ data: [], error: "boom" });
    const entries = await sitemap();
    expect(entries.map((e) => e.url)).toContain(
      "https://5pixels.app/articles"
    );
    expect(entries.some((e) => e.url.includes("/articles/"))).toBe(false);
  });
});

describe("robots", () => {
  it("references the sitemap and blocks private surfaces", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://5pixels.app/sitemap.xml");
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const disallow = rules.flatMap((rule) =>
      Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow ?? ""]
    );
    expect(disallow).toEqual(
      expect.arrayContaining(["/admin", "/app", "/api", "/checkout"])
    );
  });
});
