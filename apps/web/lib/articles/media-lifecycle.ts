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
 *   publish   -> stageArticleMediaPublicCopies() copies ONLY the referenced
 *                assets' staging objects to the public bucket, then the
 *                publish_article RPC verifies object presence and marks those
 *                rows published atomically with the publication snapshot.
 *   unpublish -> revoke_article_media() flips rows back to private FIRST (the
 *                public projection stops resolving immediately), then the
 *                public objects are deleted; published_key stays on the row
 *                until deletion is confirmed so a failed delete is retried.
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

/**
 * Copy the public objects for exactly the asset ids the publication will
 * reference (document refs + cover). Already-published assets are skipped —
 * their objects exist already. Returns the keys staged so a failed publish
 * can roll them back without touching the previous live publication.
 * Throws on failure after cleaning up the keys it already staged.
 */
export async function stageArticleMediaPublicCopies(
  articleId: string,
  assetIds: string[]
): Promise<string[]> {
  if (assetIds.length === 0) return [];
  const supabase = await createClient();
  const service = createServiceClient();

  const { data, error } = await supabase
    .from("article_assets")
    .select(
      "id, article_id, asset_id, state, staging_key, published_key, assets!inner(mime_type)"
    )
    .eq("article_id", articleId)
    .eq("state", "ready")
    .in("asset_id", assetIds);
  if (error) {
    console.error("[stageArticleMediaPublicCopies] list failed", error.message);
    throw new Error("Unable to publish article media");
  }

  const stagedKeys: string[] = [];
  const rows = (data ?? []) as ArticleAssetRow[];
  try {
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
        throw new Error(
          `staging download failed for ${row.staging_key}: ${downloadError?.message ?? "not found"}`
        );
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
        throw new Error(
          `public upload failed for ${publishedKey}: ${uploadError.message}`
        );
      }
      stagedKeys.push(publishedKey);
    }
  } catch (err) {
    // Roll back what we staged — nothing was marked published yet, and the
    // previous live publication (if any) is untouched.
    if (stagedKeys.length > 0) {
      const { error: cleanupError } = await service.storage
        .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
        .remove(stagedKeys);
      if (cleanupError) {
        console.error(
          "[stageArticleMediaPublicCopies] rollback delete failed",
          cleanupError.message
        );
      }
    }
    console.error("[stageArticleMediaPublicCopies] failed", err);
    throw new Error("Unable to publish article media");
  }

  return stagedKeys;
}

/** Best-effort removal of staged public objects after a failed publish RPC. */
export async function removeStagedPublicCopies(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const service = createServiceClient();
  const { error } = await service.storage
    .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
    .remove(keys);
  if (error) {
    // Orphaned public objects are unreferenced (rows were never marked
    // published) — the orphan sweep finds and removes them.
    console.error("[removeStagedPublicCopies] delete failed", error.message);
  }
}

/**
 * Repair for the delete-vs-republish race: object deletes happen outside any
 * transaction, so a republish can mark a row `published` again (same immutable
 * key) between the sweep's candidate read and its object removal. After every
 * remove, re-stage the object for any key whose row is published again.
 */
async function restoreRepublishedObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const service = createServiceClient();
  const { data: rows, error } = await service
    .from("article_assets")
    .select("staging_key, published_key, assets!inner(mime_type)")
    .eq("state", "published")
    .in("published_key", keys);
  if (error || !rows?.length) return;

  for (const row of rows as {
    staging_key: string;
    published_key: string;
    assets: { mime_type: string } | { mime_type: string }[] | null;
  }[]) {
    const { data: blob } = await service.storage
      .from(ARTICLE_MEDIA_BUCKET)
      .download(row.staging_key);
    if (!blob) continue;
    await service.storage.from(ARTICLE_MEDIA_PUBLIC_BUCKET).upload(
      row.published_key,
      blob,
      {
        contentType:
          (Array.isArray(row.assets) ? row.assets[0] : row.assets)?.mime_type ||
          "application/octet-stream",
        upsert: true,
        cacheControl: "31536000, immutable",
      }
    );
  }
}

/** Flip published assets back to private, then delete their public objects.
 * published_key is cleared only after the object is confirmed gone — a failed
 * delete leaves the key on the row for the sweep to retry. */
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

  const payload = data as {
    revoked_ids?: string[];
    revoked_keys?: string[];
  } | null;
  const ids = payload?.revoked_ids ?? [];
  const keys = payload?.revoked_keys ?? [];
  if (keys.length === 0) return;

  const service = createServiceClient();
  const { error: removeError } = await service.storage
    .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
    .remove(keys);
  if (removeError) {
    // published_key stays on the rows — the sweep retries the object delete.
    console.error(
      "[revokeArticleMedia] object delete failed",
      articleId,
      removeError.message
    );
    return;
  }

  await restoreRepublishedObjects(keys);
  await service.rpc("confirm_article_media_revocation", {
    p_article_asset_ids: ids,
  });
}

/** PostgREST caps every response at its configured max-rows (1000 by
 * default). Any inventory the sweep depends on must be paginated — a
 * silent truncation would delete live media. */
const QUERY_PAGE = 1000;

/** Retry object deletion for rows revoked earlier whose published_key is
 * still set — covers failed deletes from revokeArticleMedia. */
export async function retryRevokedArticleMedia(): Promise<number> {
  const service = createServiceClient();
  const rows: { id: string; published_key: string }[] = [];
  for (let offset = 0; ; offset += QUERY_PAGE) {
    const { data, error } = await service
      .from("article_assets")
      .select("id, published_key")
      .neq("state", "published")
      .not("published_key", "is", null)
      .range(offset, offset + QUERY_PAGE - 1);
    if (error) {
      console.error(
        "[retryRevokedArticleMedia] query failed",
        error.message
      );
      return 0;
    }
    rows.push(...((data ?? []) as { id: string; published_key: string }[]));
    if (!data || data.length < QUERY_PAGE) break;
  }
  if (rows.length === 0) return 0;

  const keys = rows.map((r) => r.published_key);
  const { error: removeError } = await service.storage
    .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
    .remove(keys);
  if (removeError) {
    console.error(
      "[retryRevokedArticleMedia] object delete failed",
      removeError.message
    );
    return 0;
  }

  await restoreRepublishedObjects(keys);

  const { data: confirmed } = await service.rpc(
    "confirm_article_media_revocation",
    { p_article_asset_ids: rows.map((r) => r.id) }
  );
  return typeof confirmed === "number" ? confirmed : rows.length;
}

/** List every `articles/<id>` object prefix in the public bucket, paginated.
 * The bucket itself is the durable inventory: an orphan whose article_assets
 * rows were already deleted stays discoverable because its object prefix
 * still exists here — no DB association required. */
async function listPublicArticlePrefixes(
  service: ReturnType<typeof createServiceClient>
): Promise<string[]> {
  const prefixes: string[] = [];
  let offset = 0;
  for (;;) {
    const { data: entries, error } = await service.storage
      .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
      .list("articles", { limit: 1000, offset });
    if (error) {
      console.error(
        "[sweepOrphanedPublicObjects] prefix list failed",
        error.message
      );
      break;
    }
    if (!entries?.length) break;
    // Folders surface as entries with no object id.
    for (const entry of entries) {
      if (entry.id === null) prefixes.push(entry.name);
    }
    if (entries.length < 1000) break;
    offset += entries.length;
  }
  return prefixes;
}

/** Delete public-bucket objects that no published row points at — covers
 * orphans left by deleted assets, failed stage rollbacks and removed
 * articles. Prefixes are enumerated from the bucket, not the DB, so an
 * orphan survives losing its last article_assets row. */
export async function sweepOrphanedPublicObjects(): Promise<number> {
  const service = createServiceClient();

  // Published keys still legitimately live. FAIL CLOSED: the inventory
  // must be complete before anything is deleted — a truncated page would
  // make live published media look orphaned.
  const liveKeys = new Set<string>();
  for (let offset = 0; ; offset += QUERY_PAGE) {
    const { data, error } = await service
      .from("article_assets")
      .select("published_key")
      .eq("state", "published")
      .not("published_key", "is", null)
      .range(offset, offset + QUERY_PAGE - 1);
    if (error) {
      console.error(
        "[sweepOrphanedPublicObjects] live-inventory query failed",
        error.message
      );
      return 0;
    }
    for (const row of (data ?? []) as { published_key: string }[]) {
      liveKeys.add(row.published_key);
    }
    if (!data || data.length < QUERY_PAGE) break;
  }

  let removed = 0;
  for (const articleId of await listPublicArticlePrefixes(service)) {
    const prefix = `articles/${articleId}`;
    // Enumerate the whole prefix BEFORE deleting — removing objects
    // mid-pagination shifts later pages and would skip entries until the
    // next sweep.
    const orphans: string[] = [];
    let offset = 0;
    for (;;) {
      const { data: objects, error: listError } = await service.storage
        .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
        .list(prefix, { limit: 1000, offset });
      if (listError) {
        console.error(
          "[sweepOrphanedPublicObjects] list failed",
          prefix,
          listError.message
        );
        break;
      }
      if (!objects?.length) break;
      for (const o of objects) {
        if (o.id === null) continue;
        const key = `${prefix}/${o.name}`;
        if (!liveKeys.has(key)) orphans.push(key);
      }
      if (objects.length < 1000) break;
      offset += objects.length;
    }

    for (let i = 0; i < orphans.length; i += 1000) {
      const chunk = orphans.slice(i, i + 1000);
      const { error: removeError } = await service.storage
        .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
        .remove(chunk);
      if (removeError) {
        console.error(
          "[sweepOrphanedPublicObjects] remove failed",
          prefix,
          removeError.message
        );
      } else {
        removed += chunk.length;
        await restoreRepublishedObjects(chunk);
      }
    }
  }
  return removed;
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
