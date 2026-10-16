"use client";

import { createClient } from "@/lib/supabase/client";
import {
  createArticleMediaUpload,
  finalizeArticleMediaUpload,
} from "./media-actions";
import {
  ARTICLE_MEDIA_BUCKET,
  validateArticleMediaFile,
  type ArticleMediaItem,
} from "./media";

/**
 * Client-side upload sequence for article media (#129):
 *   1. client validates the file (the server re-verifies everything later)
 *   2. create RPC returns the staging path + pending rows
 *   3. browser PUTs the file to the signed upload URL
 *   4. finalize RPC verifies stored + real content, flips pending -> ready
 *
 * Used by the media library, the cover picker and the editor's uploadFile
 * hook. `onStage` reports progress-friendly phase changes.
 */
export type ArticleUploadStage =
  | "validating"
  | "preparing"
  | "uploading"
  | "verifying"
  | "done";

const UPLOAD_TIMEOUT_MS = 180_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function uploadArticleMediaFile(
  articleId: string,
  file: File,
  onStage?: (stage: ArticleUploadStage) => void
): Promise<ArticleMediaItem> {
  onStage?.("validating");
  validateArticleMediaFile(file.type, file.size);

  onStage?.("preparing");
  const init = await createArticleMediaUpload({
    articleId,
    mimeType: file.type,
    bytes: file.size,
  });
  if (!init.ok || !init.data) {
    throw new Error(init.error ?? "Unable to start upload");
  }

  onStage?.("uploading");
  const supabase = createClient();
  const { error: uploadError } = await withTimeout(
    supabase.storage
      .from(ARTICLE_MEDIA_BUCKET)
      .uploadToSignedUrl(init.data.path, init.data.token, file, {
        contentType: file.type,
        upsert: false,
      }),
    UPLOAD_TIMEOUT_MS,
    "Upload timed out. Check your connection and try again."
  );
  if (uploadError) {
    throw new Error(uploadError.message || "Upload failed");
  }

  onStage?.("verifying");
  const finalized = await finalizeArticleMediaUpload(init.data.assetId);
  if (!finalized.ok || !finalized.data) {
    throw new Error(finalized.error ?? "Upload verification failed");
  }

  onStage?.("done");
  return finalized.data;
}
