"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateArticleDocument } from "./document";
import {
  collectDocumentAssetIds,
  prepareDocumentForStorage,
} from "./document-media";
import {
  removeStagedPublicCopies,
  revokeArticleMedia,
  stageArticleMediaPublicCopies,
} from "./media-lifecycle";
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
  else if (m.includes("invalid_cover_asset")) code = "invalid_cover_asset";
  else if (m.includes("media_ref_not_ready")) code = "media_not_ready";
  else if (m.includes("media_not_promoted")) code = "media_not_promoted";
  else if (m.includes("media_in_use")) code = "media_in_use";
  else if (m.includes("preset_version_unavailable"))
    code = "preset_version_unavailable";
  else if (m.includes("preset_unavailable")) code = "preset_unavailable";
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

/**
 * Media-reference integrity (#129): every asset:// id in a document must be a
 * media row belonging to THIS article. `requireReady` additionally demands a
 * verified/published state — used at publish so an article can never go live
 * pointing at pending uploads, forged ids, or another article's assets.
 */
async function checkDocumentAssetRefs(
  articleId: string,
  assetIds: string[],
  requireReady: boolean
): Promise<string | null> {
  if (assetIds.length === 0) return null;
  const supabase = await createClient();
  let query = supabase
    .from("article_assets")
    .select("asset_id")
    .eq("article_id", articleId)
    .in("asset_id", assetIds);
  if (requireReady) query = query.in("state", ["ready", "published"]);
  const { data, error } = await query;
  if (error) return "Unable to verify article media references";
  const found = new Set(((data ?? []) as { asset_id: string }[]).map((r) => r.asset_id));
  const missing = assetIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    return requireReady
      ? "The article references media that is not ready for publishing — re-check its uploads."
      : "The document references media that does not belong to this article.";
  }
  return null;
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
    // Normalise media references to asset:// BEFORE validation so the
    // persisted document never carries storage URLs or unvetted remote src.
    const prepared = prepareDocumentForStorage(input.content);
    const validation = validateArticleDocument(prepared.document);
    if (!validation.ok) {
      return { ok: false, code: "invalid_content", error: validation.error };
    }
    const refError = await checkDocumentAssetRefs(
      input.articleId,
      prepared.assetIds,
      false
    );
    if (refError) {
      return { ok: false, code: "invalid_content", error: refError };
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

  // Media references the publication will use: document asset:// ids + cover.
  const { data: draft } = await supabase
    .from("articles")
    .select("draft_content, cover_asset_id")
    .eq("id", articleId)
    .single();
  const refs = new Set(
    collectDocumentAssetIds(
      Array.isArray(draft?.draft_content)
        ? (draft.draft_content as Parameters<typeof collectDocumentAssetIds>[0])
        : []
    )
  );
  if (typeof draft?.cover_asset_id === "string" && draft.cover_asset_id) {
    refs.add(draft.cover_asset_id);
  }

  const refError = await checkDocumentAssetRefs(articleId, [...refs], true);
  if (refError) {
    return { ok: false, code: "invalid_content", error: refError };
  }

  // Stage the public objects BEFORE publishing — only for the referenced
  // assets. publish_article then verifies object presence and flips the rows
  // inside the same transaction as the snapshot, so a failure at any point
  // leaves the previous live publication fully intact.
  let stagedKeys: string[];
  try {
    stagedKeys = await stageArticleMediaPublicCopies(articleId, [...refs]);
  } catch {
    return {
      ok: false,
      code: "media_not_promoted",
      error: "Publishing failed while preparing media — the article was not changed.",
    };
  }

  const result = await rpcResult(
    supabase.rpc("publish_article", {
      p_article_id: articleId,
      p_expected_edit_version: expectedEditVersion,
    })
  );
  if (!result.ok) {
    // The publication never committed — remove the staged objects (the orphan
    // sweep is the backstop if this best-effort delete fails).
    await removeStagedPublicCopies(stagedKeys);
    return result;
  }

  revalidateArticlePaths(result.article);
  return result;
}

export async function unpublishArticleAction(
  articleId: string
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const result = await rpcResult(
    supabase.rpc("unpublish_article", { p_article_id: articleId })
  );
  if (result.ok) {
    // Revoke public serving first (rows flip private), objects deleted after.
    await revokeArticleMedia(articleId);
    revalidateArticlePaths(result.article);
  }
  return result;
}

export async function archiveArticleAction(
  articleId: string
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const result = await rpcResult(
    supabase.rpc("archive_article", { p_article_id: articleId })
  );
  if (result.ok) {
    await revokeArticleMedia(articleId);
    revalidateArticlePaths(result.article);
  }
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
