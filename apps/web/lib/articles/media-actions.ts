"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { supabaseUrl } from "@/lib/supabase/env";
import {
  ARTICLE_MEDIA_BUCKET,
  ARTICLE_MEDIA_PUBLIC_BUCKET,
  ARTICLE_MEDIA_MAX_DIMENSION,
  ARTICLE_MEDIA_MIN_DIMENSION,
  articleMediaExtension,
  buildArticleStagingPath,
  mediaTypeForMime,
  sniffArticleMediaMime,
  UUID_RE,
  validateArticleMediaFile,
  type ArticleMediaItem,
} from "./media";

/**
 * Server actions for the article media pipeline (#129). Every mutation goes
 * through a SECURITY DEFINER RPC — the DB is the authority for staff checks,
 * quota and ownership. Storage-object verification (magic bytes, real
 * dimensions via sharp) happens here before the RPC is asked to finalize.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";
const SNIFF_HEAD_BYTES = 32;

export interface ArticleMediaResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface ArticleAssetJoinRow {
  id: string;
  article_id: string;
  asset_id: string;
  kind: "upload" | "generation_derivative";
  state: "pending" | "ready" | "published";
  staging_key: string;
  published_key: string | null;
  alt_text: string;
  caption: string;
  source_generation_id: string | null;
  created_at: string;
  published_at: string | null;
  assets: {
    media_type: string;
    mime_type: string;
    bytes: number | null;
    width: number | null;
    height: number | null;
    duration_ms: number | null;
    deleted_at: string | null;
  } | null;
}

function mapArticleAssetRow(row: ArticleAssetJoinRow): ArticleMediaItem | null {
  if (!row.assets || row.assets.deleted_at) return null;
  return {
    id: row.id,
    articleId: row.article_id,
    assetId: row.asset_id,
    kind: row.kind,
    state: row.state,
    mediaType: mediaTypeForMime(row.assets.mime_type),
    mimeType: row.assets.mime_type,
    bytes: row.assets.bytes ?? 0,
    width: row.assets.width,
    height: row.assets.height,
    durationMs: row.assets.duration_ms,
    altText: row.alt_text,
    caption: row.caption,
    sourceGenerationId: row.source_generation_id,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

const MEDIA_SELECT =
  "id, article_id, asset_id, kind, state, staging_key, published_key, alt_text, caption, source_generation_id, created_at, published_at, assets!inner(media_type, mime_type, bytes, width, height, duration_ms, deleted_at)";

/* --------------------------------------------------------------------------
 * Upload: create signed URL -> client PUTs -> finalize verifies content.
 * ------------------------------------------------------------------------ */

export interface ArticleUploadInit {
  assetId: string;
  path: string;
  signedUrl: string;
  token: string;
}

export async function createArticleMediaUpload(input: {
  articleId: string;
  mimeType: string;
  bytes: number;
}): Promise<ArticleMediaResult<ArticleUploadInit>> {
  await requireAdminOrOwner();

  try {
    validateArticleMediaFile(input.mimeType, input.bytes);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_article_media_upload", {
    p_article_id: input.articleId,
    p_mime_type: input.mimeType,
    p_bytes: input.bytes,
  });
  if (error || !data) {
    console.error("[createArticleMediaUpload] RPC failed", error?.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const { asset_id: assetId, path } = data as {
    asset_id: string;
    path: string;
  };

  const service = createServiceClient();
  const { data: signed, error: signError } = await service.storage
    .from(ARTICLE_MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (signError || !signed?.token) {
    console.error(
      "[createArticleMediaUpload] signed URL failed",
      signError?.message
    );
    return { ok: false, error: GENERIC_ERROR };
  }

  const signedUrl = signed.signedUrl.startsWith("http")
    ? signed.signedUrl
    : new URL(signed.signedUrl, supabaseUrl()).toString();

  return { ok: true, data: { assetId, path, signedUrl, token: signed.token } };
}

async function deleteFailedUpload(
  articleAssetId: string,
  stagingKey: string
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("delete_article_media", {
      p_article_asset_id: articleAssetId,
    });
    const service = createServiceClient();
    await service.storage.from(ARTICLE_MEDIA_BUCKET).remove([stagingKey]);
  } catch (err) {
    console.error("[deleteFailedUpload] cleanup failed", err);
  }
}

/**
 * Verifies the uploaded object's real content (magic bytes + dimensions via
 * sharp) then finalizes through the RPC. Idempotent — re-finalizing a ready
 * asset returns the same row.
 */
export async function finalizeArticleMediaUpload(
  assetId: string
): Promise<ArticleMediaResult<ArticleMediaItem>> {
  await requireAdminOrOwner();
  if (!UUID_RE.test(assetId)) {
    return { ok: false, error: "Invalid asset" };
  }

  const supabase = await createClient();
  const { data: row, error: lookupError } = await supabase
    .from("article_assets")
    .select(MEDIA_SELECT)
    .eq("asset_id", assetId)
    .maybeSingle();
  if (lookupError || !row) {
    return { ok: false, error: "Upload not found" };
  }
  const join = row as unknown as ArticleAssetJoinRow;

  // Idempotent: already finalized.
  if (join.state !== "pending") {
    const item = mapArticleAssetRow(join);
    return item
      ? { ok: true, data: item }
      : { ok: false, error: GENERIC_ERROR };
  }

  if (!join.assets) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const declaredMime = join.assets.mime_type;
  const declaredBytes = join.assets.bytes ?? 0;

  // Download the actual object and verify its real content.
  const service = createServiceClient();
  const { data: blob, error: downloadError } = await service.storage
    .from(ARTICLE_MEDIA_BUCKET)
    .download(join.staging_key);
  if (downloadError || !blob) {
    return { ok: false, error: "Upload not found in storage" };
  }
  const buffer = Buffer.from(await blob.arrayBuffer());
  if (buffer.length !== declaredBytes) {
    await deleteFailedUpload(join.id, join.staging_key);
    return { ok: false, error: "Uploaded file does not match the request" };
  }

  const sniffed = sniffArticleMediaMime(
    new Uint8Array(buffer.subarray(0, SNIFF_HEAD_BYTES))
  );
  if (!sniffed || sniffed !== declaredMime) {
    await deleteFailedUpload(join.id, join.staging_key);
    return {
      ok: false,
      error: "File content does not match an allowed image/video format",
    };
  }

  // Real dimensions for images (sharp parses the actual file, not metadata).
  let width: number | null = null;
  let height: number | null = null;
  if (sniffed.startsWith("image/")) {
    try {
      const meta = await sharp(buffer, { failOn: "none" }).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      await deleteFailedUpload(join.id, join.staging_key);
      return { ok: false, error: "Image could not be decoded" };
    }
    if (
      !width ||
      !height ||
      width < ARTICLE_MEDIA_MIN_DIMENSION ||
      height < ARTICLE_MEDIA_MIN_DIMENSION ||
      width > ARTICLE_MEDIA_MAX_DIMENSION ||
      height > ARTICLE_MEDIA_MAX_DIMENSION
    ) {
      await deleteFailedUpload(join.id, join.staging_key);
      return { ok: false, error: "Image dimensions are outside allowed bounds" };
    }
  }

  const { data: finalized, error: rpcError } = await supabase.rpc(
    "finalize_article_media_upload",
    {
      p_asset_id: assetId,
      p_verified_mime_type: sniffed,
      p_verified_bytes: buffer.length,
      p_width: width,
      p_height: height,
      p_duration_ms: null,
    }
  );
  if (rpcError) {
    console.error(
      "[finalizeArticleMediaUpload] RPC failed",
      rpcError.message
    );
    return { ok: false, error: GENERIC_ERROR };
  }

  const finalizedRow = finalized as unknown as { id: string } | null;
  const { data: refreshed } = await supabase
    .from("article_assets")
    .select(MEDIA_SELECT)
    .eq("id", finalizedRow?.id ?? join.id)
    .single();
  const item = refreshed
    ? mapArticleAssetRow(refreshed as unknown as ArticleAssetJoinRow)
    : null;
  return item
    ? { ok: true, data: item }
    : { ok: false, error: GENERIC_ERROR };
}

/* --------------------------------------------------------------------------
 * Library reads + metadata + delete.
 * ------------------------------------------------------------------------ */

export async function listArticleMedia(
  articleId: string
): Promise<ArticleMediaResult<ArticleMediaItem[]>> {
  await requireAdminOrOwner();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("article_assets")
    .select(MEDIA_SELECT)
    .eq("article_id", articleId)
    .neq("state", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listArticleMedia] query failed", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const items = ((data ?? []) as unknown as ArticleAssetJoinRow[])
    .map(mapArticleAssetRow)
    .filter((x): x is ArticleMediaItem => x !== null);
  return { ok: true, data: items };
}

export async function updateArticleMediaMetadata(
  articleAssetId: string,
  input: { altText?: string; caption?: string }
): Promise<ArticleMediaResult<null>> {
  await requireAdminOrOwner();
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_article_media", {
    p_article_asset_id: articleAssetId,
    p_alt_text: input.altText ?? null,
    p_caption: input.caption ?? null,
  });
  if (error) {
    console.error("[updateArticleMediaMetadata] RPC failed", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}

export async function deleteArticleMedia(
  articleAssetId: string
): Promise<ArticleMediaResult<null>> {
  await requireAdminOrOwner();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_article_media", {
    p_article_asset_id: articleAssetId,
  });
  if (error || !data) {
    if (error?.message?.includes("media_in_use")) {
      return {
        ok: false,
        error:
          "This media is still referenced by the article — remove it from the content or cover first.",
      };
    }
    console.error("[deleteArticleMedia] RPC failed", error?.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const { staging_key, published_key } = data as {
    staging_key: string;
    published_key: string | null;
  };
  const service = createServiceClient();
  await service.storage.from(ARTICLE_MEDIA_BUCKET).remove([staging_key]);
  if (published_key) {
    await service.storage
      .from(ARTICLE_MEDIA_PUBLIC_BUCKET)
      .remove([published_key]);
  }
  return { ok: true };
}

/* --------------------------------------------------------------------------
 * Generation chooser — author's own completed generations + shared links.
 * ------------------------------------------------------------------------ */

export interface PickerGeneration {
  generationId: string;
  productName: string;
  completedAt: string | null;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
  /** True when already derived into this article. */
  attached: boolean;
}

export async function listOwnGenerationsForArticle(
  articleId: string
): Promise<ArticleMediaResult<PickerGeneration[]>> {
  const { user } = await requireAdminOrOwner();
  const service = createServiceClient();

  const { data, error } = await service
    .from("generations")
    .select(
      "id, status, completed_at, created_at, products(name), generation_outputs(asset_id, is_primary, assets!inner(bucket, storage_key, mime_type, width, height, deleted_at, media_type))"
    )
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[listOwnGenerationsForArticle] query failed", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  const { data: attachedRows } = await service
    .from("article_assets")
    .select("source_generation_id")
    .eq("article_id", articleId)
    .eq("kind", "generation_derivative");
  const attached = new Set(
    ((attachedRows ?? []) as { source_generation_id: string | null }[])
      .map((r) => r.source_generation_id)
      .filter(Boolean) as string[]
  );

  const items: PickerGeneration[] = [];
  for (const g of (data ?? []) as unknown as Array<{
    id: string;
    completed_at: string | null;
    created_at: string;
    products: { name: string }[] | { name: string } | null;
    generation_outputs: Array<{
      asset_id: string;
      is_primary: boolean;
      assets:
        | {
            bucket: string;
            storage_key: string;
            mime_type: string;
            width: number | null;
            height: number | null;
            deleted_at: string | null;
            media_type: string;
          }[]
        | {
            bucket: string;
            storage_key: string;
            mime_type: string;
            width: number | null;
            height: number | null;
            deleted_at: string | null;
            media_type: string;
          }
        | null;
    }>;
  }>) {
    const outputs = [...(g.generation_outputs ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary)
    );
    const primary = outputs[0];
    const asset = Array.isArray(primary?.assets)
      ? primary?.assets[0]
      : primary?.assets;
    if (!primary || !asset || asset.deleted_at || asset.media_type !== "image") {
      continue;
    }
    let previewUrl: string | null = null;
    const { data: signed } = await service.storage
      .from(asset.bucket)
      .createSignedUrl(asset.storage_key, 600);
    previewUrl = signed?.signedUrl ?? null;

    const products = Array.isArray(g.products) ? g.products[0] : g.products;
    items.push({
      generationId: g.id,
      productName: products?.name ?? "Untitled",
      completedAt: g.completed_at,
      previewUrl,
      width: asset.width,
      height: asset.height,
      attached: attached.has(g.id),
    });
  }
  return { ok: true, data: items };
}

export interface SharedGenerationInfo {
  generationId: string;
  shareId: string;
  productName: string;
  productSlug: string;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
}

/** Resolve a pasted /s/{id} link or bare share/generation id via the RPC. */
export async function resolveSharedGeneration(
  input: string
): Promise<ArticleMediaResult<SharedGenerationInfo | null>> {
  await requireAdminOrOwner();

  const trimmed = input.trim();
  const shareMatch = /(?:\/s\/)?([0-9a-f-]{36})/i.exec(trimmed);
  const candidate = shareMatch?.[1] ?? null;
  if (!candidate) {
    return { ok: false, error: "Paste a valid share link or id" };
  }

  const supabase = await createClient();
  let { data, error } = await supabase.rpc(
    "resolve_article_generation_by_share_id",
    { p_share_id: candidate }
  );
  if (error || !data) {
    const retry = await supabase.rpc("resolve_article_generation", {
      p_generation_id: candidate,
    });
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    console.error("[resolveSharedGeneration] RPC failed", error.message);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (!data) {
    // Not found / unshared — indistinguishable by design.
    return { ok: true, data: null };
  }

  const resolved = data as {
    generationId: string;
    shareId: string;
    productName: string;
    productSlug: string;
    outputAssetId: string | null;
    mimeType: string | null;
    width: number | null;
    height: number | null;
  };

  let previewUrl: string | null = null;
  if (resolved.outputAssetId) {
    const service = createServiceClient();
    const { data: asset } = await service
      .from("assets")
      .select("bucket, storage_key")
      .eq("id", resolved.outputAssetId)
      .maybeSingle();
    if (asset) {
      const { data: signed } = await service.storage
        .from(asset.bucket)
        .createSignedUrl(asset.storage_key, 600);
      previewUrl = signed?.signedUrl ?? null;
    }
  }

  return {
    ok: true,
    data: {
      generationId: resolved.generationId,
      shareId: resolved.shareId,
      productName: resolved.productName,
      productSlug: resolved.productSlug,
      previewUrl,
      width: resolved.width,
      height: resolved.height,
    },
  };
}

/**
 * The affirmative "Publish this output in the article" action for the author's
 * OWN private generation. Copies the output object into article staging and
 * registers a derivative — the original private output is never repointed or
 * made public.
 */
export async function publishGenerationToArticle(input: {
  articleId: string;
  generationId: string;
  confirmPublish: boolean;
}): Promise<ArticleMediaResult<ArticleMediaItem>> {
  const { user } = await requireAdminOrOwner();
  if (input.confirmPublish !== true) {
    return { ok: false, error: "Publishing requires explicit confirmation" };
  }

  const supabase = await createClient();
  const service = createServiceClient();

  // Own-generation lookup through the user client — RLS restricts to the
  // caller's rows; anything else is simply "not found".
  const { data: generation, error: genError } = await supabase
    .from("generations")
    .select(
      "id, status, generation_outputs(asset_id, is_primary, assets!inner(bucket, storage_key, mime_type, bytes, width, height, deleted_at, media_type))"
    )
    .eq("id", input.generationId)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .maybeSingle();
  if (genError || !generation) {
    return { ok: false, error: "Generation is not available for publishing" };
  }

  const outputs = (
    generation.generation_outputs as unknown as Array<{
      asset_id: string;
      is_primary: boolean;
      assets:
        | {
            bucket: string;
            storage_key: string;
            mime_type: string;
            bytes: number | null;
            width: number | null;
            height: number | null;
            deleted_at: string | null;
            media_type: string;
          }
        | null;
    }>
  ).sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const sourceAsset = outputs[0]?.assets ?? null;
  if (!sourceAsset || sourceAsset.deleted_at || sourceAsset.media_type !== "image") {
    return { ok: false, error: "Generation output is not available" };
  }
  const ext = articleMediaExtension(sourceAsset.mime_type);
  if (!ext) {
    return { ok: false, error: "Generation output format is not supported" };
  }

  // Copy the private output into the article staging namespace. The source
  // object itself stays untouched in user-assets.
  const assetId = randomUUID();
  const stagingKey = buildArticleStagingPath(
    user.id,
    input.articleId,
    assetId,
    sourceAsset.mime_type
  );
  const { data: blob, error: downloadError } = await service.storage
    .from(sourceAsset.bucket)
    .download(sourceAsset.storage_key);
  if (downloadError || !blob) {
    console.error(
      "[publishGenerationToArticle] source download failed",
      downloadError?.message
    );
    return { ok: false, error: GENERIC_ERROR };
  }
  const { error: stageError } = await service.storage
    .from(ARTICLE_MEDIA_BUCKET)
    .upload(stagingKey, blob, {
      contentType: sourceAsset.mime_type,
      upsert: false,
    });
  if (stageError) {
    console.error(
      "[publishGenerationToArticle] stage failed",
      stageError.message
    );
    return { ok: false, error: GENERIC_ERROR };
  }

  const { data: registered, error: rpcError } = await supabase.rpc(
    "register_article_generation_derivative",
    {
      p_article_id: input.articleId,
      p_generation_id: input.generationId,
      p_asset_id: assetId,
      p_mime_type: sourceAsset.mime_type,
      p_bytes: sourceAsset.bytes ?? blob.size,
      p_width: sourceAsset.width,
      p_height: sourceAsset.height,
    }
  );
  if (rpcError) {
    console.error(
      "[publishGenerationToArticle] register failed",
      rpcError.message
    );
    await service.storage.from(ARTICLE_MEDIA_BUCKET).remove([stagingKey]);
    return { ok: false, error: GENERIC_ERROR };
  }

  const registeredId = (registered as unknown as { id: string }).id;
  const { data: refreshed } = await supabase
    .from("article_assets")
    .select(MEDIA_SELECT)
    .eq("id", registeredId)
    .single();
  const item = refreshed
    ? mapArticleAssetRow(refreshed as unknown as ArticleAssetJoinRow)
    : null;
  return item
    ? { ok: true, data: item }
    : { ok: false, error: GENERIC_ERROR };
}
