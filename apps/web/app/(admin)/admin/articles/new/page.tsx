import Link from "next/link";
import type { Metadata } from "next";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { createAndOpenArticleAction } from "./create-action";

export const metadata: Metadata = {
  title: "New article",
  robots: { index: false, follow: false },
};

/**
 * GET is intentionally read-only. A draft is created by an explicit form
 * submission, so opening, refreshing, or prefetching this URL cannot create
 * unwanted drafts or call revalidatePath() during a Server Component render.
 */
export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminOrOwner();
  const { error } = await searchParams;

  return (
    <div className="max-w-lg py-12">
      <h1 className="text-cream-50 text-3xl font-bold">New article</h1>
      <p className="text-text-secondary mt-3 text-sm">
        Create a private draft and open the article editor. Nothing is
        published until you choose to publish it.
      </p>
      {error === "create" && (
        <p role="alert" className="text-error mt-5 text-sm">
          Couldn&rsquo;t create the article. Please try again.
        </p>
      )}
      <form action={createAndOpenArticleAction} className="mt-7">
        <button
          type="submit"
          className="bg-lime-500 text-ink-950 hover:bg-lime-400 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          Create draft and open editor
        </button>
      </form>
      <Link
        href="/admin/articles"
        className="text-lime-400 mt-6 inline-block text-sm hover:underline"
      >
        ← Back to articles
      </Link>
    </div>
  );
}
