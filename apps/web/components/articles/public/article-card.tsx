import Link from "next/link";
import { publicAssetUrl } from "@/lib/catalog/media";
import { readingMinutes } from "@/lib/articles/reading-time";
import type { PublicArticleSummary } from "@/lib/articles/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Directory card for a published article summary. Cover + author imagery
 * resolve only from the RPC's public-bucket projection — never a signed URL
 * or private path.
 */
export function ArticleCard({
  article,
  priority = false,
}: {
  article: PublicArticleSummary;
  priority?: boolean;
}) {
  const coverUrl = article.cover
    ? publicAssetUrl(article.cover.bucket, article.cover.storageKey)
    : null;
  const avatarUrl = article.author_avatar
    ? publicAssetUrl(
        article.author_avatar.bucket,
        article.author_avatar.storageKey
      )
    : null;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group bg-charcoal-850 border-cream-100/10 hover:border-cream-100/20 focus-visible:ring-lime-500/50 flex flex-col overflow-hidden rounded-2xl border transition-colors focus-visible:outline-none focus-visible:ring-2"
    >
      {/* Cover */}
      <div className="bg-charcoal-800 relative aspect-[16/9] w-full overflow-hidden">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- public storage object; width/height known from the media map
          <img
            src={coverUrl}
            alt=""
            width={article.cover?.width ?? 1600}
            height={article.cover?.height ?? 900}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="from-charcoal-800 to-charcoal-850 flex h-full w-full items-center justify-center bg-gradient-to-br"
          >
            <span className="text-text-muted text-sm font-semibold tracking-widest uppercase">
              5Pixels
            </span>
          </div>
        )}
        {article.topic && (
          <span className="bg-ink-950/80 text-cream-50 absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm">
            {article.topic}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-cream-50 group-hover:text-lime-300 text-lg font-semibold leading-snug transition-colors">
          {article.title}
        </h2>
        <p className="text-text-secondary line-clamp-3 text-sm leading-relaxed">
          {article.summary}
        </p>

        {article.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {article.tags.slice(0, 4).map((tag) => (
              <li
                key={tag}
                className="border-cream-100/10 text-text-muted rounded-full border px-2 py-0.5 text-[11px]"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center gap-2.5 pt-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- public author avatar snapshot
            <img
              src={avatarUrl}
              alt=""
              width={28}
              height={28}
              loading="lazy"
              decoding="async"
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="bg-charcoal-700 text-cream-100 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
            >
              {article.author_display_name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="text-text-secondary min-w-0 flex-1 truncate text-xs">
            <span className="text-cream-100">{article.author_display_name}</span>
            <span aria-hidden="true"> · </span>
            <time dateTime={article.published_at}>
              {formatDate(article.published_at)}
            </time>
            <span aria-hidden="true"> · </span>
            {readingMinutes(article.word_count)} min read
          </p>
        </div>
      </div>
    </Link>
  );
}
