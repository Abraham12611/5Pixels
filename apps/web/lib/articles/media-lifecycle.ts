"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ARTICLE_MEDIA_BUCKET,
  ARTICLE_MEDIA_PUBLIC_BUCKET,
  buildArticlePublishedPath,
} from "./media";

/**
 * Publish/unpublish lifecycle for article media (#129).
 *
 * Storage object bytes cannot move inside a SQL transaction, so promotion is a
 * two-step dance coordinated here:
 *   publish   -> copy staging objects to the public bucket, then
 *                mark_article_media_published() repoints the asset rows.
 *   unpublish -> revoke_article_media() flips rows back to private FIRST (the
 *                public projection stops resolving immediately), then the
 *                public objects are deleted best-effort.
 */

interface ArticleAssetRow {
  id: string;
  article_id: string;
  asset_id: string;
  state: string;
  staging_key: string;
  published_key: string | null;
  assets: { mime_type: string } | { mime_type: string }[] | null;
}

/** Copy every ready article asset's staging object into the public bucket,
 * then flip the rows. Throws on failure — callers should treat the publish as
 * failed (the article RPC already committed, so they unpublish to roll back). */
export async function promoteArticleMedia(articleId: string): Promise<number> {
  const supabase = await createClient();
  const service = createServiceClient();

  const { data, error } = await supabase
    .from("article_assets")
    .select(
      "id, article_id, asset_id, state, staging_key, published_key, assets!inner(mime_type)"
    )
    .eq("article_id", articleId)
    .eq("state", "ready");
  if (error) {
    console.error("[promoteArticleMedia] list failed", error.message);
    throw new Error("Unable to publish article media");
  }

  const rows = (data ?? []) as ArticleAssetRow[];
  for (const row of rows) {
    const ext = row.staging_key.split(".").pop() ?? "";
    const publishedKey = buildArticlePublishedPath(
      row.article_id,
      row.asset_id,
      ext
    );

    const { data: blob, error: downloadError } = await service.storage
      .from(ARTICLE_MEDIA_BUCKET)
      .download(row.staging_key);
    if (downloadError || !blob) {
      console.error(
        "[promoteArticleMedia] staging download failed",
        row.staging_key,
        downloadError?.message
      );
      throw new Error("Unable to publish article media");
    }

    // upsert: true — publish must be idempotent. A retry after a partial
    // failure (or a republish where the object survived revocation) hits the
    // same immutable key with identical bytes.
    const { error: uploadError } = await service.storage
      .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
      .upload(publishedKey, blob, {
        contentType:
          (Array.isArray(row.assets) ? row.assets[0] : row.assets)?.mime_type ||
          "application/octet-stream",
        upsert: true,
        cacheControl: "31536000, immutable",
      });
    if (uploadError) {
      console.error(
        "[promoteArticleMedia] public upload failed",
        publishedKey,
        uploadError.message
      );
      throw new Error("Unable to publish article media");
    }
  }

  const { error: markError } = await supabase.rpc(
    "mark_article_media_published",
    { p_article_id: articleId }
  );
  if (markError) {
    console.error(
      "[promoteArticleMedia] mark failed",
      articleId,
      markError.message
    );
    throw new Error("Unable to publish article media");
  }

  return rows.length;
}

/** Flip published assets back to private, then delete their public objects.
 * Best-effort on the object deletes — the DB flip already denies new resolves;
 * a CDN-cached copy may persist briefly (documented behaviour per #129). */
export async function revokeArticleMedia(articleId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_article_media", {
    p_article_id: articleId,
  });
  if (error) {
    console.error(
      "[revokeArticleMedia] revoke failed",
      articleId,
      error.message
    );
    return;
  }

  const keys = ((data as { revoked_keys?: string[] } | null)?.revoked_keys ??
    []) as string[];
  if (keys.length === 0) return;

  const service = createServiceClient();
  const { error: removeError } = await service.storage
    .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
    .remove(keys);
  if (removeError) {
    // Stale public objects with no resolving reference — the orphan sweep
    // / re-revoke will catch them. Log and continue.
    console.error(
      "[revokeArticleMedia] object delete failed",
      articleId,
      removeError.message
    );
  }
}

/** Delete pending-upload rows older than the DB cutoff + their orphan objects. */
export async function sweepStaleArticleUploads(): Promise<{
  deleted: number;
}> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("sweep_stale_article_uploads", {});
  if (error) {
    console.error("[sweepStaleArticleUploads] sweep failed", error.message);
    throw new Error("Unable to sweep stale uploads");
  }
  const keys = ((data as { deleted_keys?: string[] } | null)?.deleted_keys ??
    []) as string[];
  if (keys.length > 0) {
    const { error: removeError } = await service.storage
      .from(ARTICLE_MEDIA_BUCKET)
      .remove(keys);
    if (removeError) {
      console.error(
        "[sweepStaleArticleUploads] object delete failed",
        removeError.message
      );
    }
  }
  return { deleted: keys.length };
}
