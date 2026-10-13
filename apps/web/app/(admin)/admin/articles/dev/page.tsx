import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
import { getArticleForEditor } from "@/lib/articles/queries";
import { ArticleEditorHarness } from "@/components/articles/editor/dev-harness";

export const metadata: Metadata = {
  title: "Article editor dev",
  robots: { index: false, follow: false },
};

/**
 * Staff-only isolated mount for the BlockNote article editor (#125) with the
 * real media pipeline (#129). Without ?article= it creates a fresh draft and
 * redirects so every harness run exercises a real article row.
 */
export default async function ArticleEditorDevPage({
  searchParams,
}: {
  searchParams: Promise<{ article?: string }>;
}) {
  await requireAdmin();
  const { article: articleId } = await searchParams;

  if (!articleId) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_article", {
      p_title: "Dev harness article",
    });
    if (error || !data) {
      throw new Error("Unable to create dev article");
    }
    redirect(`/admin/articles/dev?article=${(data as { id: string }).id}`);
  }

  const { data: article, error } = await getArticleForEditor(articleId);
  if (error || !article) {
    throw new Error("Article not found");
  }

  return <ArticleEditorHarness article={article} />;
}
