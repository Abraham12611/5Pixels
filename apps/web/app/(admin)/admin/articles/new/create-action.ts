"use server";

import { redirect } from "next/navigation";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { createArticleAction } from "@/lib/articles/actions";

/**
 * Create a draft only in response to a POST-backed Server Action.
 * Never mutate article records while rendering /admin/articles/new: the
 * create action calls revalidatePath(), which Next.js forbids during render.
 */
export async function createAndOpenArticleAction(): Promise<void> {
  await requireAdminOrOwner();
  const result = await createArticleAction();

  if (!result.ok || !result.article) {
    redirect("/admin/articles/new?error=create");
  }

  redirect(`/admin/articles/${result.article.id}/edit`);
}
