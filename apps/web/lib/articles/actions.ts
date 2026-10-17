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
import { ARTICLE_MEDIA_BUCKET } from "./media";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAction } from "@/lib/db/audit";
import { getArticleForEditor } from "./queries";
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
  else if (m.includes("settings_fields_invalid"))
    code = "settings_fields_invalid";
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
  await auditArticleTransition("article.publish", articleId, result.article);
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
    await auditArticleTransition("article.unpublish", articleId, result.article);
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
    await auditArticleTransition("article.archive", articleId, result.article);
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
  if (result.ok) {
    revalidateArticlePaths(result.article);
    await auditArticleTransition(
      "article.unarchive",
      articleId,
      result.article
    );
  }
  return result;
}

/* --------------------------------------------------------------------------
 * Studio helpers (#126)
 * ------------------------------------------------------------------------ */

/** Status transitions land in admin_audit_logs alongside the RPC's own
 * published_by/last_edited_by fields. Non-blocking: the transition already
 * committed, so an audit outage must not masquerade as a failed mutation. */
async function auditArticleTransition(
  action: string,
  articleId: string,
  article?: Article
) {
  try {
    await logAdminAction({
      action,
      entityType: "article",
      entityId: articleId,
      after: article
        ? { status: article.status, slug: article.slug }
        : undefined,
      throwOnFailure: false,
    });
  } catch (err) {
    console.error(`[articles] audit log failed for ${action}`, err);
  }
}

/** One media clone the app must physically copy + finalize after
 * duplicate_article registered the new rows. */
export interface ArticleMediaCopyPlan {
  asset_id: string;
  from_key: string;
  to_key: string;
  mime_type: string;
  bytes: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
}

/**
 * Duplicate an article as a new draft (#126). The RPC creates the draft,
 * re-registers every media row under fresh article-scoped asset ids and
 * rewrites the document references atomically; this action then performs the
 * physical object copies in the private bucket and finalizes each clone so
 * it flips pending -> ready. A copy failure never leaves dangling shared
 * references — the row simply stays pending until the sweep reclaims it.
 */
export async function duplicateArticleAction(
  articleId: string
): Promise<ArticleWriteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_article", {
    p_article_id: articleId,
  });
  if (error) {
    const { code, message } = mapRpcError(error);
    return { ok: false, code, error: message };
  }

  const { article, copies } = (data ?? {}) as {
    article?: Article;
    copies?: ArticleMediaCopyPlan[];
  };
  if (!article) {
    return { ok: false, code: "unknown", error: "Duplicate returned no article" };
  }

  const service = createServiceClient();
  let failedCopies = 0;
  for (const copy of copies ?? []) {
    const { error: copyError } = await service.storage
      .from(ARTICLE_MEDIA_BUCKET)
      .copy(copy.from_key, copy.to_key);
    if (copyError) {
      console.error(
        "[duplicateArticleAction] object copy failed",
        copy.from_key,
        copyError.message
      );
      failedCopies += 1;
      continue;
    }
    // finalize verifies the copied object against the assets row and flips
    // the clone pending -> ready.
    const { error: finalizeError } = await supabase.rpc(
      "finalize_article_media_upload",
      {
        p_asset_id: copy.asset_id,
        p_verified_mime_type: copy.mime_type,
        p_verified_bytes: copy.bytes,
        p_width: copy.width,
        p_height: copy.height,
        p_duration_ms: copy.duration_ms,
      }
    );
    if (finalizeError) {
      console.error(
        "[duplicateArticleAction] finalize failed",
        copy.asset_id,
        finalizeError.message
      );
      failedCopies += 1;
    }
  }

  revalidatePath("/admin/articles");
  await auditArticleTransition("article.duplicate", articleId, article);
  return {
    ok: true,
    article,
    warning:
      failedCopies > 0
        ? `${failedCopies} media item${failedCopies === 1 ? "" : "s"} could not be copied — re-add them in the duplicate before publishing.`
        : undefined,
  };
}

/** Fresh editor payload after an edit_version conflict — the client remounts
 * the editor against the newest row. */
export async function getArticleForStudioAction(
  articleId: string
): Promise<ArticleWriteResult> {
  const { data, error } = await getArticleForEditor(articleId);
  if (error || !data) {
    return {
      ok: false,
      code: "article_not_found",
      error: error ?? "Article not found",
    };
  }
  return { ok: true, article: data };
}
