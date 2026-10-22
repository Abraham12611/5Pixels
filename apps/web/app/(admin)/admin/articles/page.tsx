import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { listArticlesForStaff } from "@/lib/articles/queries";
import type { ArticleStatus } from "@/lib/articles/types";
import { createAndOpenArticleAction } from "./new/create-action";
import { ArticleRowActions } from "@/components/articles/studio/article-row-actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Articles",
  robots: { index: false, follow: false },
};

const STATUSES: { value: ArticleStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const STATUS_BADGE: Record<ArticleStatus, string> = {
  draft: "bg-charcoal-700 text-cream-100",
  published: "bg-lime-500/15 text-lime-400",
  archived: "bg-charcoal-800 text-text-muted",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireAdminOrOwner();
  const params = await searchParams;
  const status = (["draft", "published", "archived"] as const).find(
    (s) => s === params.status
  );
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";

  const { data: articles, error, totalCount } = await listArticlesForStaff({
    status,
    search: q || undefined,
    updatedFrom: from || undefined,
    updatedTo: to || undefined,
    page,
  });
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / pageSize));

  const pageLink = (p: number) => {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/articles${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-cream-50 text-3xl font-bold">Articles</h1>
          <p className="text-text-secondary mt-2">
            Write and publish guides. Drafts and previews are staff-only;
            published articles are public at /articles.
          </p>
        </div>
        <form action={createAndOpenArticleAction}>
          <button
            type="submit"
            className="bg-lime-500 text-ink-950 hover:bg-lime-400 flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Plus size={16} weight="bold" />
            New article
          </button>
        </form>
      </div>

      <form
        method="GET"
        action="/admin/articles"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Filter by status"
          className="border-cream-100/15 bg-charcoal-850 text-cream-50 rounded-lg border px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search title or author…"
          aria-label="Search articles by title or author email"
          className="border-cream-100/15 bg-charcoal-850 text-cream-50 placeholder:text-text-muted w-56 rounded-lg border px-3 py-2 text-sm"
        />
        <label className="text-text-muted flex items-center gap-1.5 text-xs">
          Updated from
          <input
            type="date"
            name="from"
            defaultValue={from}
            aria-label="Filter by updated date from"
            className="border-cream-100/15 bg-charcoal-850 text-cream-50 rounded-lg border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-text-muted flex items-center gap-1.5 text-xs">
          to
          <input
            type="date"
            name="to"
            defaultValue={to}
            aria-label="Filter by updated date to"
            className="border-cream-100/15 bg-charcoal-850 text-cream-50 rounded-lg border px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="border-cream-100/15 bg-charcoal-800 text-cream-100 hover:bg-charcoal-700 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors"
        >
          Filter
        </button>
      </form>

      {error && (
        <p role="alert" className="text-error mb-4 text-sm">
          {error}
        </p>
      )}

      <div className="border-cream-100/10 bg-charcoal-850 overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="text-text-secondary border-cream-100/10 border-b">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Last edited</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-cream-100/10 divide-y">
              {articles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-text-secondary px-4 py-10 text-center"
                  >
                    {q || status || from || to
                      ? "No articles match these filters."
                      : "No articles yet — create the first one."}
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr
                    key={article.id}
                    className="hover:bg-charcoal-800/50 transition"
                  >
                    <td className="text-cream-50 max-w-xs px-4 py-3">
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="font-medium hover:underline"
                      >
                        {article.title}
                      </Link>
                      <p className="text-text-muted truncate text-xs">
                        /articles/{article.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_BADGE[article.status]
                        )}
                      >
                        {article.status === "draft" &&
                        !article.first_published_at
                          ? "Draft"
                          : article.status[0].toUpperCase() +
                            article.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-text-secondary max-w-[140px] truncate px-4 py-3">
                      {article.author_email ?? "—"}
                    </td>
                    <td className="text-text-secondary max-w-[140px] truncate px-4 py-3">
                      {article.editor_email ?? "—"}
                    </td>
                    <td className="text-text-secondary whitespace-nowrap px-4 py-3">
                      {formatDate(article.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ArticleRowActions article={article} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <p className="text-text-muted">
            Page {page} of {totalPages} · {totalCount} article
            {totalCount === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageLink(page - 1)}
                className="border-cream-100/15 text-cream-100 hover:bg-charcoal-800 rounded-lg border px-3 py-1.5"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageLink(page + 1)}
                className="border-cream-100/15 text-cream-100 hover:bg-charcoal-800 rounded-lg border px-3 py-1.5"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
