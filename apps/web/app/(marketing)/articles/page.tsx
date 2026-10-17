import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublishedArticles,
  getPublishedArticleTopics,
} from "@/lib/articles/queries";
import { ArticleCard } from "@/components/articles/public/article-card";
import { Button } from "@/components/ui/button";
import {
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Newspaper,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

const DESCRIPTION =
  "Discover how it's made. Learn the presets, settings, and creative steps behind standout creations on 5Pixels. Follow along and make something of your own.";

export const metadata: Metadata = {
  title: "Articles",
  description: DESCRIPTION,
  alternates: { canonical: "/articles" },
  openGraph: {
    type: "website",
    title: "Articles — 5Pixels",
    description: DESCRIPTION,
    url: "/articles",
  },
  twitter: { card: "summary", title: "Articles — 5Pixels", description: DESCRIPTION },
};

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Build a directory URL preserving the active topic/query filters. */
function articlesHref({
  page,
  topic,
  q,
}: {
  page?: number;
  topic?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/articles?${qs}` : "/articles";
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstString(params.q)?.trim().slice(0, 120) || undefined;
  const topic = firstString(params.topic)?.slice(0, 120) || undefined;
  const page = Math.max(1, Number.parseInt(firstString(params.page) ?? "1", 10) || 1);

  const [{ data: articles, totalCount = 0, error }, { data: topics }] =
    await Promise.all([
      getPublishedArticles({ page, pageSize: PAGE_SIZE, topic, query: q }),
      getPublishedArticleTopics(),
    ]);

  if (error) {
    throw new Error(error);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isFiltered = Boolean(q || topic);

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header + search */}
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-cream-50 text-3xl font-bold sm:text-4xl">
              Articles
            </h1>
            <p className="text-text-secondary mt-3 leading-relaxed">
              {DESCRIPTION}
            </p>
          </div>
          <form
            action="/articles"
            method="get"
            role="search"
            className="w-full md:w-80"
          >
            {topic && <input type="hidden" name="topic" value={topic} />}
            <label htmlFor="article-search" className="sr-only">
              Search articles
            </label>
            <div className="relative">
              <MagnifyingGlass
                className="text-text-muted pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                id="article-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Search articles…"
                maxLength={120}
                className="border-cream-100/10 bg-charcoal-850 text-cream-50 placeholder:text-text-muted focus:border-lime-500/50 focus:ring-lime-500/50 h-11 w-full rounded-full border pl-10 pr-4 text-sm outline-none transition-colors focus:ring-1"
              />
            </div>
          </form>
        </div>

        {/* Topic filter rail */}
        {topics.length > 0 && (
          <nav aria-label="Filter by topic" className="mb-8">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href={articlesHref({ q })}
                  aria-current={!topic ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                    !topic
                      ? "border-lime-500/40 bg-lime-500/10 text-cream-50"
                      : "border-cream-100/10 bg-charcoal-850 text-text-secondary hover:text-cream-100"
                  )}
                >
                  All
                </Link>
              </li>
              {topics.map((t) => (
                <li key={t.topic}>
                  <Link
                    href={articlesHref({ topic: t.topic, q })}
                    aria-current={topic === t.topic ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                      topic === t.topic
                        ? "border-lime-500/40 bg-lime-500/10 text-cream-50"
                        : "border-cream-100/10 bg-charcoal-850 text-text-secondary hover:text-cream-100"
                    )}
                  >
                    {t.topic}
                    <span className="text-text-muted text-xs">
                      {t.article_count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Result summary */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-text-muted text-sm" aria-live="polite">
            {totalCount} {totalCount === 1 ? "article" : "articles"}
            {q ? ` matching “${q}”` : ""}
            {topic ? ` in ${topic}` : ""}
          </p>
          {isFiltered && (
            <Link
              href="/articles"
              className="text-text-secondary hover:text-lime-400 text-[13px] font-medium transition-colors"
            >
              Clear filters
            </Link>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            {isFiltered ? (
              <>
                <MagnifyingGlass
                  className="text-text-muted h-12 w-12"
                  aria-hidden="true"
                />
                <h2 className="text-cream-50 mt-4 text-xl font-semibold">
                  No articles match
                </h2>
                <p className="text-text-secondary mt-2 max-w-md">
                  Try a different search term or topic — or browse everything
                  we’ve published.
                </p>
                <Button asChild variant="secondary" className="mt-6">
                  <Link href="/articles">Clear filters</Link>
                </Button>
              </>
            ) : (
              <>
                <Newspaper
                  className="text-text-muted h-12 w-12"
                  aria-hidden="true"
                />
                <h2 className="text-cream-50 mt-4 text-xl font-semibold">
                  No articles yet
                </h2>
                <p className="text-text-secondary mt-2 max-w-md">
                  We’re working on our first guides — check back soon, or
                  explore the preset catalog in the meantime.
                </p>
                <Button asChild variant="secondary" className="mt-6">
                  <Link href="/explore">Browse presets</Link>
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <section
              aria-label="Articles"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.article_id}
                  article={article}
                  priority={index < 3}
                />
              ))}
            </section>

            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-10 flex items-center justify-between gap-4"
              >
                <Button
                  asChild
                  variant="secondary"
                  disabled={page <= 1}
                  className={
                    page <= 1 ? "pointer-events-none opacity-50" : ""
                  }
                >
                  <Link
                    href={articlesHref({ page: page - 1, topic, q })}
                    aria-disabled={page <= 1}
                  >
                    <CaretLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Link>
                </Button>

                <p className="text-text-secondary text-sm">
                  Page {page} of {totalPages}
                </p>

                <Button
                  asChild
                  variant="secondary"
                  disabled={page >= totalPages}
                  className={
                    page >= totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                >
                  <Link
                    href={articlesHref({ page: page + 1, topic, q })}
                    aria-disabled={page >= totalPages}
                  >
                    Next
                    <CaretRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
