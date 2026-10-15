"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { isArticleDocumentEmpty, validateArticleDocument } from "@/lib/articles/document";
import { articleSchema, type ArticleEditorInstance } from "./schema";
import { articleSlashMenuItems } from "./slash-menu";
import { cn } from "@/lib/utils";

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
  editVersion,
  onDocumentChange,
  onTitleChange,
  saveState = "clean",
  readOnly = false,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(initialTitle);

  const initialContent = useMemo(() => {
    if (initialDocument === undefined) return undefined;
    const result = validateArticleDocument(initialDocument);
    if (!result.ok) {
      // Fail soft for the editor shell — an invalid stored document must not
      // wedge the studio; the save path will re-validate before persisting.
      console.error("[ArticleEditor] invalid stored document", result.error);
      return undefined;
    }
    return result.document;
  }, [initialDocument]);

  const editor: ArticleEditorInstance = useCreateBlockNote({
    schema: articleSchema,
    // Validated above; the schema-generic PartialBlock bound is satisfied by
    // construction but can't be named without re-deriving it.
    initialContent: initialContent as PartialBlock[] | undefined as never,
  });

  const isEmpty = isArticleDocumentEmpty(
    editor.document as unknown[] as never
  );

  return (
    <div className="article-editor mx-auto w-full max-w-3xl">
      {/* Cover region — upload lands in #129; region + state exist now. */}
      <button
        type="button"
        className="border-cream-100/15 bg-charcoal-850/60 hover:border-cream-100/30 group mb-6 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed transition-colors"
        aria-label="Add cover image (coming soon)"
        disabled
      >
        <ImageIcon
          size={22}
          className="text-text-muted group-hover:text-cream-100 transition-colors"
        />
        <span className="text-text-muted text-xs">
          Cover image · uploads arrive with media support
        </span>
      </button>

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
    </div>
  );
}
