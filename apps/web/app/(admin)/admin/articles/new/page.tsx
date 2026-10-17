import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { createArticleAction } from "@/lib/articles/actions";

export const metadata: Metadata = {
  title: "New article",
  robots: { index: false, follow: false },
};

/**
 * "New article" lands the author straight in the studio: the draft row is
 * created here (media uploads need a real article id) and the editor opens
 * against it immediately.
 */
export default async function NewArticlePage() {
  await requireAdminOrOwner();
  const result = await createArticleAction();

  if (!result.ok || !result.article) {
    return (
      <div className="max-w-md py-16">
        <h1 className="text-cream-50 text-2xl font-bold">
          Couldn&rsquo;t create the article
        </h1>
        <p role="alert" className="text-error mt-3 text-sm">
          {result.error ?? "Something went wrong."}
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

  redirect(`/admin/articles/${result.article.id}/edit`);
}
