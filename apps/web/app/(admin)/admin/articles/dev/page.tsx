import type { Metadata } from "next";
import { requireAdmin } from "@/lib/db/admin";
import { ArticleEditorHarness } from "@/components/articles/editor/dev-harness";

export const metadata: Metadata = {
  title: "Article editor dev",
  robots: { index: false, follow: false },
};

/**
 * Staff-only isolated mount for the BlockNote article editor (#125).
 * The real studio (list/drafts/autosave/publish) lands in #126.
 */
export default async function ArticleEditorDevPage() {
  await requireAdmin();
  return <ArticleEditorHarness />;
}
