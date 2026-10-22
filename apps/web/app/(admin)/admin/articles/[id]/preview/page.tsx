import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { getArticleForEditor } from "@/lib/articles/queries";
import { ArticleEditor } from "@/components/articles/editor";

export const metadata: Metadata = {
  title: "Article preview",
  robots: { index: false, follow: false },
};

/** Draft content is private — never cache this route. */
export const dynamic = "force-dynamic";

/**
 * Staff-only preview of the WORKING draft (#126). Rendered through the same
 * BlockNote view in read-only mode so staff see exactly what persists; the
 * public renderer (#131) replaces this view on live pages.
 */
export default async function ArticlePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrOwner();
  const { id } = await params;
  const { data: article, error } = await getArticleForEditor(id);

  if (error || !article) {
    return (
      <div className="max-w-md py-16">
        <h1 className="text-cream-50 text-2xl font-bold">Nothing to preview</h1>
        <p className="text-text-secondary mt-3 text-sm">
          {error ?? "This article doesn't exist."}
        </p>
        <Link
          href="/admin/articles"
          className="text-lime-400 mt-6 inline-block text-sm hover:underline"
        >
          ← Back to articles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-warning/40 bg-warning/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <p className="text-cream-50 text-sm">
          <span className="font-semibold">Staff preview</span>
          <span className="text-text-secondary">
            {" "}
            — working draft, not visible to the public.
            {article.status === "published" &&
              " The live page still shows the last published version."}
          </span>
        </p>
        <Link
          href={`/admin/articles/${article.id}/edit`}
          className="text-lime-400 text-xs font-medium hover:underline"
        >
          Back to editor
        </Link>
      </div>

      <ArticleEditor
        articleId={article.id}
        initialDocument={article.draft_content}
        initialTitle={article.title}
        coverAssetId={article.cover_asset_id}
        editVersion={article.edit_version}
        readOnly
      />
    </div>
  );
}
