"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import {
  Check,
  File as FileIcon,
  Trash,
  UploadSimple,
  Video as VideoIcon,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ARTICLE_MEDIA_MIME_TYPES,
  articleMediaProxyUrl,
  type ArticleMediaItem,
} from "@/lib/articles/media";
import {
  useArticleMedia,
  type ArticleUploadTask,
} from "./use-article-media";

const STAGE_LABEL: Record<ArticleUploadTask["stage"], string> = {
  validating: "Validating…",
  preparing: "Preparing…",
  uploading: "Uploading…",
  verifying: "Verifying…",
  done: "Done",
};

interface ArticleMediaLibraryProps {
  /** Required — media is always article-scoped. */
  articleId: string | null;
  /** When provided, each item shows a "Use" button that calls back its item. */
  onPick?: (item: ArticleMediaItem) => void;
  /** Restrict picking to a media kind (e.g. covers are images only). */
  pickMediaType?: "image" | "video";
  /** Id of the currently picked asset (highlighted). */
  pickedAssetId?: string | null;
}

function MediaThumb({ item }: { item: ArticleMediaItem }) {
  if (item.mediaType === "video") {
    return (
      <div className="bg-charcoal-800 flex h-28 w-full items-center justify-center rounded-lg">
        <VideoIcon size={24} className="text-text-muted" weight="duotone" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={articleMediaProxyUrl(item.assetId, { width: 400 })}
      alt={item.altText || "Article media"}
      loading="lazy"
      className="bg-charcoal-800 h-28 w-full rounded-lg object-cover"
    />
  );
}

function UploadTaskRow({
  task,
  onDismiss,
}: {
  task: ArticleUploadTask;
  onDismiss: (key: string) => void;
}) {
  return (
    <div className="border-cream-100/10 bg-charcoal-800 flex items-center gap-3 rounded-lg border px-3 py-2">
      {task.error ? (
        <Warning size={16} className="text-error shrink-0" weight="fill" />
      ) : (
        <FileIcon size={16} className="text-text-muted shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-cream-100 truncate text-xs">{task.name}</p>
        <p
          role={task.error ? "alert" : "status"}
          className={cn("text-[11px]", task.error ? "text-error" : "text-text-muted")}
        >
          {task.error ?? STAGE_LABEL[task.stage]}
        </p>
      </div>
      {task.error && (
        <button
          type="button"
          aria-label="Dismiss failed upload"
          onClick={() => onDismiss(task.key)}
          className="text-text-muted hover:text-cream-100"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Article media library (#129): dropzone upload + grid of article-scoped
 * media with thumbnails, state, alt/caption editing, replace/remove, and an
 * optional pick mode for the cover chooser. Private staging objects render
 * through the staff-gated proxy route — no signed URLs in markup.
 */
export function ArticleMediaLibrary({
  articleId,
  onPick,
  pickMediaType,
  pickedAssetId,
}: ArticleMediaLibraryProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const {
    items,
    uploads,
    loading,
    error,
    uploadFiles,
    dismissUpload,
    updateMeta,
    remove,
  } = useArticleMedia(articleId);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    void uploadFiles(event.dataTransfer.files);
  };

  const onPasteFiles = (files: FileList | File[]) => {
    void uploadFiles(files);
  };

  if (!articleId) {
    return (
      <p className="text-text-muted text-sm">
        Save the article first — media uploads attach to a draft.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload article media — drop files or browse"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onPaste={(e) => {
          const files = e.clipboardData.files;
          if (files.length > 0) {
            e.preventDefault();
            onPasteFiles(files);
          }
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "border-cream-100/15 bg-charcoal-850/60 hover:border-cream-100/30 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 transition-colors",
          dragActive && "border-lime-400/60 bg-charcoal-800"
        )}
      >
        <UploadSimple size={20} className="text-text-muted" weight="duotone" />
        <p className="text-text-muted text-xs">
          Drop, paste or browse — JPEG/PNG/WebP/GIF ≤ 25 MB · MP4/WebM ≤ 100 MB
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          accept={ARTICLE_MEDIA_MIME_TYPES.join(",")}
          onChange={(e) => {
            void uploadFiles(e.target.files ?? []);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((task) => (
            <UploadTaskRow key={task.key} task={task} onDismiss={dismissUpload} />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-text-muted text-sm">Loading media…</p>
      ) : items.length === 0 ? (
        <p className="text-text-muted text-sm">
          No article media yet — uploads stay private until the article is
          published.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const pickable = !pickMediaType || item.mediaType === pickMediaType;
            const picked = pickedAssetId === item.assetId;
            return (
              <li
                key={item.id}
                className={cn(
                  "border-cream-100/10 bg-charcoal-850 space-y-2 rounded-xl border p-3",
                  picked && "border-lime-400/60",
                  onPick && !pickable && "opacity-50"
                )}
              >
                <MediaThumb item={item} />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-text-muted truncate text-[11px]">
                    {item.kind === "generation_derivative"
                      ? "Generation"
                      : item.mediaType === "video"
                        ? "Video"
                        : "Image"}
                    {" · "}
                    {(item.bytes / 1024 / 1024).toFixed(1)} MB
                    {item.state === "published" ? " · live" : " · draft"}
                  </p>
                  {picked && (
                    <Check size={14} className="text-lime-400" weight="bold" />
                  )}
                </div>
                <Input
                  aria-label="Alt text"
                  placeholder="Alt text (accessibility)"
                  defaultValue={item.altText}
                  maxLength={300}
                  onBlur={(e) => {
                    if (e.target.value !== item.altText) {
                      void updateMeta(item.id, { altText: e.target.value });
                    }
                  }}
                  className="h-8 text-xs"
                />
                <Textarea
                  aria-label="Caption"
                  placeholder="Caption (optional)"
                  defaultValue={item.caption}
                  maxLength={1000}
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value !== item.caption) {
                      void updateMeta(item.id, { caption: e.target.value });
                    }
                  }}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  {onPick && pickable && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 flex-1 text-xs"
                      onClick={() => onPick(item)}
                    >
                      Use
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-8 text-xs"
                    aria-label="Remove media"
                    onClick={() => void remove(item.id)}
                  >
                    <Trash size={13} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
