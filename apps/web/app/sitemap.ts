import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getPublishedArticles } from "@/lib/articles/queries";
import { MODEL_LINES } from "@/lib/marketing/model-lines";

/**
 * Minimal sitemap for the Articles directory (#132).
 *
 * Scope: core static routes + /articles + every *currently published* article
 * slug (paged through get_public_articles, so drafts/archives/unpublished
 * content can never appear). Preset/category URL coverage and changeFrequency
 * tuning belong to the dedicated GTM sitemap/indexing ticket (#121) — this
 * file should be reconciled with that work when it lands.
 */

const STATIC_ROUTES = [
  "/",
  "/explore",
  "/categories",
  "/pricing",
  "/articles",
];

const SITEMAP_PAGE_SIZE = 50;
// TODO(#121): temporary bound — published articles beyond the first 1000
// (newest-first) are not listed. When the dedicated GTM/indexing ticket
// lands, replace this with sitemap index pagination
// (sitemap-articles-<n>.xml) so coverage scales with the catalog.
const SITEMAP_MAX_ARTICLES = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    ...STATIC_ROUTES,
    ...MODEL_LINES.flatMap((line) => [line.pageHref, line.presetsHref]),
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));

  let page = 1;
  let fetched = 0;
  while (fetched < SITEMAP_MAX_ARTICLES) {
    const { data, error } = await getPublishedArticles({
      page,
      pageSize: SITEMAP_PAGE_SIZE,
    });
    // On failure degrade to the static routes — a sitemap that omits
    // articles is recoverable; a crashing one is not.
    if (error || data.length === 0) break;

    for (const article of data) {
      entries.push({
        url: `${SITE_URL}/articles/${article.slug}`,
        lastModified: new Date(article.published_at),
      });
    }
    fetched += data.length;
    if (data.length < SITEMAP_PAGE_SIZE) break;
    page += 1;
  }

  return entries;
}
