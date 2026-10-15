"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateArticleDocument } from "./document";
import { normalizeSlug } from "./slug";
import type {
  Article,
  ArticleRevisionSource,
  ArticleWriteErrorCode,
  ArticleWriteResult,
} from "./types";

/**
 * Server actions for the Articles studio. Every mutation goes through a
 * SECURITY DEFINER RPC — the database is the authority for staff checks,
 * optimistic versioning, slug rules and publish atomicity.
 *
 * Revalidation contract (consumed by the editor CRUD ticket #126 and the
 * public routes #131/#132):
 *   - publish/unpublish/archive/unarchive revalidate /articles (index) and
 *     /articles/[slug] (detail) — slugs are immutable post-publish, so the
 *     detail path is stable.
 */

const ARTICLES_INDEX = "/articles";
const articlePath = (slug: string) => `/articles/${slug}`;

function revalidateArticlePaths(article?: Article | null) {
  revalidatePath(ARTICLES_INDEX);
  revalidatePath("/admin/articles");
  if (article?.slug) revalidatePath(articlePath(article.slug));
}

function mapRpcError(error: { message?: string; code?: string } | null): {
  code: ArticleWriteErrorCode;
  message: string;
} {
  const message = error?.message ?? "Unknown error";
  const m = message.toLowerCase();
  let code: ArticleWriteErrorCode = "unknown";
  if (error?.code === "42501" || m.includes("forbidden")) code = "forbidden";
  else if (error?.code === "40001" || m.includes("edit_version_conflict"))
    code = "edit_version_conflict";
  else if (error?.code === "23505") code = "slug_conflict";
  else if (m.includes("article_not_published")) code = "article_not_published";
  else if (m.includes("article_not_archived")) code = "article_not_archived";
  else if (m.includes("article_not_found")) code = "article_not_found";
  else if (m.includes("slug_locked")) code = "slug_locked";
  else if (m.includes("invalid_slug")) code = "invalid_slug";
  else if (m.includes("invalid_tags")) code = "invalid_tags";
  else if (m.includes("invalid_content")) code = "invalid_content";
  else if (m.includes("title_required")) code = "title_required";
  else if (m.includes("content_required")) code = "content_required";
  else if (m.includes("cannot_publish_archived"))
    code = "cannot_publish_archived";
  return { code, message };
}

async function rpcResult(
  promise: PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>
): Promise<ArticleWriteResult> {
  const { data, error } = await promise;
  if (error) {
    const { code, message } = mapRpcError(error);
    return { ok: false, code, error: message };
  }
  return { ok: true, article: (data as Article) ?? undefined };
}

export async function createArticleAction(
  title?: string
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const result = await rpcResult(
    supabase.rpc("create_article", { p_title: title ?? null })
  );
  if (result.ok) revalidatePath("/admin/articles");
  return result;
}

export interface SaveArticleDraftInput {
  articleId: string;
  /** Optimistic concurrency token — must equal the row's edit_version. */
  expectedEditVersion: number;
  title?: string;
  summary?: string;
  slug?: string;
  topic?: string;
  tags?: string[];
  coverAssetId?: string;
  clearCover?: boolean;
  /** Canonical BlockNote document JSON (validated before send). */
  content?: unknown;
  schemaVersion?: number;
  source?: Exclude<ArticleRevisionSource, "publish">;
}

export async function saveArticleDraftAction(
  input: SaveArticleDraftInput
): Promise<ArticleWriteResult> {
  // App-side validation first — the DB still enforces every bound itself.
  let contentJson: unknown = undefined;
  if (input.content !== undefined) {
    const validation = validateArticleDocument(input.content);
    if (!validation.ok) {
      return { ok: false, code: "invalid_content", error: validation.error };
    }
    contentJson = validation.document;
  }

  const supabase = await createClient();
  return rpcResult(
    supabase.rpc("save_article_draft", {
      p_article_id: input.articleId,
      p_expected_edit_version: input.expectedEditVersion,
      p_title: input.title ?? null,
      p_summary: input.summary ?? null,
      p_slug: input.slug !== undefined ? normalizeSlug(input.slug) : null,
      p_topic: input.topic ?? null,
      p_tags: input.tags ?? null,
      p_cover_asset_id: input.coverAssetId ?? null,
      p_clear_cover: input.clearCover ?? false,
      p_content: contentJson ?? null,
      p_schema_version: input.schemaVersion ?? null,
      p_source: input.source === "autosave" ? "autosave" : "manual",
    })
  );
}

export async function publishArticleAction(
  articleId: string,
  expectedEditVersion: number
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const result = await rpcResult(
    supabase.rpc("publish_article", {
      p_article_id: articleId,
      p_expected_edit_version: expectedEditVersion,
    })
  );
  if (result.ok) revalidateArticlePaths(result.article);
  return result;
}

export async function unpublishArticleAction(
  articleId: string
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const result = await rpcResult(
    supabase.rpc("unpublish_article", { p_article_id: articleId })
  );
  if (result.ok) revalidateArticlePaths(result.article);
  return result;
}

export async function archiveArticleAction(
  articleId: string
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const result = await rpcResult(
    supabase.rpc("archive_article", { p_article_id: articleId })
  );
  if (result.ok) revalidateArticlePaths(result.article);
  return result;
}

export async function unarchiveArticleAction(
  articleId: string
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const result = await rpcResult(
    supabase.rpc("unarchive_article", { p_article_id: articleId })
  );
  if (result.ok) revalidateArticlePaths(result.article);
  return result;
}
