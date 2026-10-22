"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, X } from "@phosphor-icons/react";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { isArticleDocumentEmpty, validateArticleDocument } from "@/lib/articles/document";
import {
  articleMediaProxyUrl,
  type ArticleMediaItem,
} from "@/lib/articles/media";
import { uploadArticleMediaFile } from "@/lib/articles/media-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArticleMediaContext } from "./article-media-context";
import { ArticleMediaLibrary } from "../media/article-media-library";
import { articleSchema, type ArticleEditorInstance } from "./schema";
import { articleSlashMenuItems } from "./slash-menu";

export type ArticleSaveState =
  | "clean"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

export interface ArticleEditorChange {
  /** Lossless BlockNote document JSON — persist verbatim, never via markdown. */
  document: unknown[];
  /** The articles.edit_version this change set is based on. */
  editVersion: number;
}

export interface ArticleEditorProps {
  /** Previously persisted BlockNote document (validated; invalid → fresh doc). */
  initialDocument?: unknown;
  initialTitle?: string;
  /** The article being edited — required for media uploads and the cover. */
  articleId?: string | null;
  /** assets.id of the current cover (article media only). */
  coverAssetId?: string | null;
  /** Called when the author picks or clears a cover asset. */
  onCoverChange?: (assetId: string | null) => void;
  /** articles.edit_version — echoed back in every onDocumentChange call. */
  editVersion: number;
  onDocumentChange?: (change: ArticleEditorChange) => void;
  onTitleChange?: (title: string) => void;
  /** Owned by the persistence layer (#126); the shell just renders it. */
  saveState?: ArticleSaveState;
  readOnly?: boolean;
}

const SAVE_STATE_LABEL: Record<ArticleSaveState, string | null> = {
  clean: null,
  dirty: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save — retry",
};

const SAVE_STATE_CLASS: Record<ArticleSaveState, string> = {
  clean: "text-text-muted",
  dirty: "text-warning",
  saving: "text-text-secondary",
  saved: "text-lime-400",
  error: "text-error",
};

export function ArticleEditor({
  initialDocument,
  initialTitle = "",
  articleId = null,
  coverAssetId = null,
  onCoverChange,
  editVersion,
  onDocumentChange,
  onTitleChange,
  saveState = "clean",
  readOnly = false,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string>();

  const initialContent = useMemo(() => {
    if (initialDocument === undefined) return undefined;
    const result = validateArticleDocument(initialDocument);
    if (!result.ok) {
      // Fail soft for the editor shell — an invalid stored document must not
      // wedge the studio; the save path will re-validate before persisting.
      console.error("[ArticleEditor] invalid stored document", result.error);
      return undefined;
    }
    // BlockNote rejects initialContent: [] even though an empty array is a
    // valid freshly created draft in our persisted article schema. Let
    // BlockNote initialize its default empty paragraph instead.
    return result.document?.length ? result.document : undefined;
  }, [initialDocument]);

  const editor: ArticleEditorInstance = useCreateBlockNote({
    schema: articleSchema,
    // Validated above; the schema-generic PartialBlock bound is satisfied by
    // construction but can't be named without re-deriving it.
    initialContent: initialContent as PartialBlock[] | undefined as never,
    // Media uploads go through the article pipeline: signed staging URL ->
    // content verification -> asset reference. The returned proxy URL is
    // rewritten to asset://{id} before the document is persisted.
    uploadFile: articleId
      ? async (file: File) => {
          setUploadError(undefined);
          try {
            const item = await uploadArticleMediaFile(articleId, file);
            return articleMediaProxyUrl(item.assetId);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Upload failed";
            setUploadError(message);
            throw err;
          }
        }
      : async () => {
          const message = "Save the article before uploading media.";
          setUploadError(message);
          throw new Error(message);
        },
  });

  const isEmpty = isArticleDocumentEmpty(
    editor.document as unknown[] as never
  );

  const pickCover = (item: ArticleMediaItem) => {
    onCoverChange?.(item.assetId);
    setCoverPickerOpen(false);
  };

  return (
    <ArticleMediaContext.Provider value={{ articleId }}>
      <div className="article-editor mx-auto w-full max-w-3xl">
        {/* Cover picker (#129): pick from the article media library or upload.
            The cover stores an assets.id — never a URL — and promotes with the
            article at publish time. */}
        <div className="group relative mb-6">
          {coverAssetId ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={articleMediaProxyUrl(coverAssetId, { width: 1200 })}
                alt="Article cover"
                className="h-40 w-full rounded-2xl object-cover sm:h-56"
              />
              {!readOnly && (
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={() => setCoverPickerOpen(true)}
                  >
                    Replace cover
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-8 w-8 p-0"
                    aria-label="Remove cover"
                    onClick={() => onCoverChange?.(null)}
                  >
                    <X size={13} />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={cn(
                "border-cream-100/15 bg-charcoal-850/60 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed transition-colors",
                articleId && !readOnly
                  ? "hover:border-cream-100/30"
                  : "cursor-not-allowed opacity-60"
              )}
              aria-label="Add cover image"
              disabled={!articleId || readOnly}
              onClick={() => setCoverPickerOpen(true)}
            >
              <ImageIcon
                size={22}
                className="text-text-muted group-hover:text-cream-100 transition-colors"
              />
              <span className="text-text-muted text-xs">
                {articleId
                  ? "Add a cover image"
                  : "Save the article to add a cover"}
              </span>
            </button>
          )}
        </div>

        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            onTitleChange?.(e.target.value);
          }}
          placeholder="Untitled article"
          aria-label="Article title"
          readOnly={readOnly}
          className="text-cream-50 placeholder:text-text-muted/60 mb-2 w-full bg-transparent font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight outline-none sm:text-5xl"
        />

        <div className="mb-3 flex h-5 items-center justify-between">
          <p className="text-text-muted/70 text-xs">
            {readOnly ? "Preview" : "Press / for commands"}
          </p>
          <p
            role="status"
            aria-live="polite"
            className={cn("text-xs font-medium", SAVE_STATE_CLASS[saveState])}
          >
            {SAVE_STATE_LABEL[saveState]}
          </p>
        </div>

        {uploadError && (
          <p role="alert" className="text-error mb-2 text-xs">
            {uploadError}
          </p>
        )}

        <BlockNoteView
          editor={editor}
          theme="dark"
          editable={!readOnly}
          slashMenu={false}
          onChange={() =>
            onDocumentChange?.({
              document: editor.document as unknown[],
              editVersion,
            })
          }
          className={cn(isEmpty && "article-editor-empty")}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={articleSlashMenuItems(editor)}
          />
        </BlockNoteView>

        <Dialog open={coverPickerOpen} onOpenChange={setCoverPickerOpen}>
          <DialogHeader>
            <DialogTitle>Article cover</DialogTitle>
          </DialogHeader>
          <DialogContent className="max-w-2xl">
            <ArticleMediaLibrary
              articleId={articleId}
              onPick={pickCover}
              pickMediaType="image"
              pickedAssetId={coverAssetId}
            />
          </DialogContent>
        </Dialog>
      </div>
    </ArticleMediaContext.Provider>
  );
}
