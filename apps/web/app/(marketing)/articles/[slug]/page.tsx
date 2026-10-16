import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getPublishedArticleBySlug } from "@/lib/articles/queries";
import { publicAssetUrl } from "@/lib/catalog/media";
import { getSiteUrl } from "@/lib/billing/site-url";
import { getPublicProductBySlug } from "@/lib/db/explore";
import type { PublicProductDetail } from "@/types/catalog";
import {
  collectPresetSlugs,
  estimateReadingTimeMinutes,
  extractPlainText,
  indexHeadings,
} from "@/lib/articles/public-document";
import type { PublicArticle } from "@/lib/articles/types";
import { ArticleRenderer } from "@/components/articles/public/article-renderer";
import {
  ArticleTocDisclosure,
  ArticleTocRail,
} from "@/components/articles/public/article-toc";
import { ArticleProgress } from "@/components/articles/public/article-progress";
import { ArticleImage } from "@/components/articles/public/article-image";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function coverUrl(article: PublicArticle): string | undefined {
  const cover = article.cover;
  return cover ? publicAssetUrl(cover.bucket, cover.storageKey) : undefined;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) {
    return {
      title: "Article not found — 5Pixels",
      robots: { index: false, follow: false },
    };
  }

  const title = `${article.title} — 5Pixels`;
  const description = article.summary;
  const ogImage = coverUrl(article);

  return {
    title,
    description,
    alternates: {
      canonical: `/articles/${article.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${getSiteUrl()}/articles/${article.slug}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: article.published_at,
      modifiedTime: article.published_at,
      authors: [article.author_display_name],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

function buildJsonLd(article: PublicArticle, readingTime: number) {
  const ogImage = coverUrl(article);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    image: ogImage ? [ogImage] : undefined,
    datePublished: article.first_published_at ?? article.published_at,
    dateModified: article.published_at,
    author: {
      "@type": "Person",
      name: article.author_display_name,
    },
    publisher: {
      "@type": "Organization",
      name: "5Pixels",
      url: getSiteUrl(),
    },
    mainEntityOfPage: `${getSiteUrl()}/articles/${article.slug}`,
    wordCount: extractPlainText(article.content).split(/\s+/).filter(Boolean)
      .length,
    timeRequired: `PT${readingTime}M`,
    // Escape "</" so a title/summary can never break out of the script tag.
  };
  return {
    __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
  };
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  // Resolve every preset referenced by a block in one pass — the renderer
  // stays synchronous and each card degrades gracefully when a preset was
  // retired after publication.
  const presetSlugs = collectPresetSlugs(article.content);
  const presetEntries = await Promise.all(
    presetSlugs.map(
      async (s) =>
        [s, (await getPublicProductBySlug(s)).data] as const
    )
  );
  const presets = new Map<string, PublicProductDetail | null>(presetEntries);

  const headings = indexHeadings(article.content);
  const toc = headings.entries.map(({ id, text, level }) => ({
    id,
    text,
    level,
  }));
  const readingTime = estimateReadingTimeMinutes(article.content);
  const cover = coverUrl(article);
  const avatarUrl = article.author_avatar
    ? publicAssetUrl(
        article.author_avatar.bucket,
        article.author_avatar.storageKey
      )
    : null;

  const publishedLabel = formatDate(
    article.first_published_at ?? article.published_at
  );
  const updatedLabel =
    article.publication_number > 1 ? formatDate(article.published_at) : null;

  return (
    <>
      <ArticleProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={buildJsonLd(article, readingTime)}
      />
      <main className="flex flex-1 flex-col">
        <article className="mx-auto w-full max-w-5xl px-5 pt-8 pb-16 sm:px-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <Link
              href="/articles"
              className="text-text-secondary hover:text-cream-100 focus-visible:ring-lime-500/70 inline-flex items-center gap-1.5 rounded-md text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <ArrowLeft size={15} aria-hidden />
              Articles
            </Link>
          </nav>

          <header className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {article.topic ? (
                <span className="bg-lime-500/15 text-lime-400 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  {article.topic}
                </span>
              ) : null}
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="border-cream-100/10 text-text-secondary rounded-full border px-3 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="font-display text-cream-50 mt-4 text-3xl leading-tight font-bold break-words sm:text-4xl">
              {article.title}
            </h1>
            {article.summary ? (
              <p className="text-text-secondary mt-3 text-lg leading-relaxed">
                {article.summary}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2.5">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public Storage URL
                  <img
                    src={avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="bg-charcoal-800 h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-charcoal-800 text-text-muted flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
                  >
                    {article.author_display_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="text-cream-100 font-medium">
                  {article.author_display_name}
                </span>
              </div>
              <span className="text-text-muted" aria-hidden>
                ·
              </span>
              <div className="text-text-secondary">
                {publishedLabel ? (
                  <span>
                    Published{" "}
                    <time dateTime={article.first_published_at ?? article.published_at}>
                      {publishedLabel}
                    </time>
                  </span>
                ) : null}
                {updatedLabel ? (
                  <span>
                    {" "}
                    · Updated{" "}
                    <time dateTime={article.published_at}>{updatedLabel}</time>
                  </span>
                ) : null}
              </div>
              <span className="text-text-muted" aria-hidden>
                ·
              </span>
              <span className="text-text-secondary">
                {readingTime} min read
              </span>
            </div>
          </header>

          {cover ? (
            <ArticleImage
              src={cover}
              alt={article.title}
              className="mt-8"
              width={article.cover?.width}
              height={article.cover?.height}
            />
          ) : null}

          {toc.length > 0 ? (
            <div className="mt-6 lg:hidden">
              <ArticleTocDisclosure entries={toc} />
            </div>
          ) : null}

          <div className="mt-4 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0 max-w-3xl">
              <ArticleRenderer
                content={article.content}
                media={article.media}
                presets={presets}
                headings={headings}
              />
            </div>
            {toc.length > 0 ? (
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <ArticleTocRail entries={toc} />
                </div>
              </aside>
            ) : null}
          </div>
        </article>
      </main>
    </>
  );
}
