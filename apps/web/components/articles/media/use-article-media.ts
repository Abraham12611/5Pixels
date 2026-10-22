"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteArticleMedia,
  listArticleMedia,
  updateArticleMediaMetadata,
} from "@/lib/articles/media-actions";
import {
  uploadArticleMediaFile,
  type ArticleUploadStage,
} from "@/lib/articles/media-upload";
import type { ArticleMediaItem } from "@/lib/articles/media";

export interface ArticleUploadTask {
  key: string;
  name: string;
  stage: ArticleUploadStage;
  error?: string;
}

/**
 * State for the article media library (#129): existing items, in-flight
 * uploads with stage reporting, and failure surfaces. All mutations go
 * through the server actions; the hook owns nothing authoritative.
 */
export function useArticleMedia(articleId: string | null) {
  const [items, setItems] = useState<ArticleMediaItem[]>([]);
  const [uploads, setUploads] = useState<ArticleUploadTask[]>([]);
  const [loading, setLoading] = useState(Boolean(articleId));
  const [error, setError] = useState<string>();
  const counter = useRef(0);

  const refresh = useCallback(async () => {
    if (!articleId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const result = await listArticleMedia(articleId);
    if (result.ok) {
      setItems(result.data ?? []);
      setError(undefined);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    setLoading(Boolean(articleId));
    void refresh();
  }, [refresh, articleId]);

  const uploadFiles = useCallback(
    async (files: Iterable<File>) => {
      if (!articleId) return;
      const list = [...files];
      for (const file of list) {
        const key = `u${++counter.current}`;
        setUploads((u) => [
          ...u,
          { key, name: file.name, stage: "validating" },
        ]);
        try {
          const item = await uploadArticleMediaFile(articleId, file, (stage) =>
            setUploads((u) =>
              u.map((t) => (t.key === key ? { ...t, stage } : t))
            )
          );
          setItems((prev) => [item, ...prev]);
          setUploads((u) => u.filter((t) => t.key !== key));
        } catch (err) {
          setUploads((u) =>
            u.map((t) =>
              t.key === key
                ? {
                    ...t,
                    stage: "done",
                    error:
                      err instanceof Error ? err.message : "Upload failed",
                  }
                : t
            )
          );
        }
      }
    },
    [articleId]
  );

  const dismissUpload = useCallback((key: string) => {
    setUploads((u) => u.filter((t) => t.key !== key));
  }, []);

  const updateMeta = useCallback(
    async (id: string, patch: { altText?: string; caption?: string }) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                altText: patch.altText ?? it.altText,
                caption: patch.caption ?? it.caption,
              }
            : it
        )
      );
      const result = await updateArticleMediaMetadata(id, patch);
      if (!result.ok) {
        setError(result.error);
        await refresh();
      }
      return result.ok;
    },
    [refresh]
  );

  const remove = useCallback(async (id: string) => {
    const result = await deleteArticleMedia(id);
    if (result.ok) {
      setItems((prev) => prev.filter((it) => it.id !== id));
      return true;
    }
    setError(result.error);
    return false;
  }, []);

  return {
    items,
    uploads,
    loading,
    error,
    refresh,
    uploadFiles,
    dismissUpload,
    updateMeta,
    remove,
  };
}
