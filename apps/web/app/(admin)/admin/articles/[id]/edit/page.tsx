import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { getArticleForEditor } from "@/lib/articles/queries";
import { ArticleStudio } from "@/components/articles/studio/article-studio";

export const metadata: Metadata = {
  title: "Edit article",
  robots: { index: false, follow: false },
};

export default async function EditArticlePage({
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
        <h1 className="text-cream-50 text-2xl font-bold">Article not found</h1>
        <p className="text-text-secondary mt-3 text-sm">
          {error ?? "It may have been removed, or the link is wrong."}
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

  const publicBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return <ArticleStudio article={article} publicBaseUrl={publicBaseUrl} />;
}
