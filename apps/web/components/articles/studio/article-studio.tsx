"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react";
import {
  archiveArticleAction,
  duplicateArticleAction,
  getArticleForStudioAction,
  publishArticleAction,
  saveArticleDraftAction,
  unarchiveArticleAction,
  unpublishArticleAction,
} from "@/lib/articles/actions";
import type { Article } from "@/lib/articles/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArticleEditor, type ArticleEditorChange } from "../editor/index";
import {
  consumeDuplicateWarning,
  stashDuplicateWarning,
} from "@/lib/articles/duplicate-flash";
import {
  SavePipeline,
  type StudioSaveResult,
  type StudioSaveState,
} from "./save-pipeline";
import { articleErrorMessage } from "./studio-errors";

interface StudioSnapshot {
  title: string;
  summary: string;
  slug: string;
  topic: string;
  tags: string[];
  coverAssetId: string | null;
  document: unknown[];
}

type ConfirmKind =
  | "publish"
  | "unpublish"
  | "archive"
  | "unarchive"
  | "reload"
  | null;

const STATUS_LABEL: Record<Article["status"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const STATUS_CLASS: Record<Article["status"], string> = {
  draft: "bg-charcoal-700 text-cream-100",
  published: "bg-lime-500/15 text-lime-400 border-lime-500/40",
  archived: "bg-charcoal-800 text-text-muted",
};

function formatSavedAt(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Full studio shell for one article (#126): autosave via the serialized
 * SavePipeline, optimistic edit_version concurrency, lifecycle actions with
 * confirmation, conflict recovery and the unsaved-changes guard.
 */
export function ArticleStudio({
  article,
  publicBaseUrl,
}: {
  article: Article;
  publicBaseUrl: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(article);
  const [editorKey, setEditorKey] = useState(0);
  const [saveState, setSaveState] = useState<StudioSaveState>("clean");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  /** Warning carried across the duplicate→new-editor navigation. */
  const [flashWarning, setFlashWarning] = useState<string>();
  const [version, setVersion] = useState(article.edit_version);
  const [initialDoc, setInitialDoc] = useState<unknown[]>(
    article.draft_content
  );

  const [meta, setMeta] = useState({
    title: article.title,
    summary: article.summary,
    slug: article.slug,
    topic: article.topic ?? "",
    tagsText: article.tags.join(", "),
    coverAssetId: article.cover_asset_id as string | null,
  });
  // Mutable mirrors for callbacks — never read during render.
  const docRef = useRef<unknown[]>(article.draft_content);
  const editVersionRef = useRef(article.edit_version);
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  const snapshot = useCallback((): StudioSnapshot => {
    const m = metaRef.current;
    return {
      title: m.title,
      summary: m.summary,
      slug: m.slug,
      topic: m.topic,
      tags: m.tagsText
        .split(",")
        .map(normalizeTag)
        .filter(Boolean),
      coverAssetId: m.coverAssetId,
      document: docRef.current,
    };
  }, []);

  const runSave = useCallback(
    async (
      snap: StudioSnapshot,
      source: "autosave" | "manual"
    ): Promise<StudioSaveResult> => {
      const result = await saveArticleDraftAction({
        articleId: current.id,
        expectedEditVersion: editVersionRef.current,
        title: snap.title,
        summary: snap.summary,
        slug: snap.slug,
        topic: snap.topic,
        tags: snap.tags,
        coverAssetId: snap.coverAssetId ?? undefined,
        clearCover: snap.coverAssetId === null,
        content: snap.document,
        source,
      });
      if (!result.ok || !result.article) {
        return {
          ok: false,
          conflict: result.code === "edit_version_conflict",
          error: articleErrorMessage(result.code, result.error),
        };
      }
      return { ok: true, editVersion: result.article.edit_version };
    },
    [current.id]
  );

  const handleSaved = useCallback((editVersion: number) => {
    editVersionRef.current = editVersion;
    setVersion(editVersion);
  }, []);
  const handleSaveState = useCallback((state: StudioSaveState) => {
    setSaveState(state);
    if (state === "saved") setLastSavedAt(new Date());
  }, []);

  // Lazily created inside callbacks — refs never touch render. After a
  // conflict the stopped pipeline is dropped and a fresh one is built.
  const pipelineRef = useRef<SavePipeline<StudioSnapshot> | null>(null);
  const getPipeline = useCallback(() => {
    pipelineRef.current ??= new SavePipeline<StudioSnapshot>({
      save: runSave,
      onStateChange: handleSaveState,
      onSaved: handleSaved,
    });
    return pipelineRef.current;
  }, [runSave, handleSaveState, handleSaved]);

  useEffect(
    () => () => {
      pipelineRef.current?.destroy();
    },
    []
  );

  // Navigation guard: unsaved or in-flight work must warn before unload.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pipelineRef.current?.hasUnsaved()) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // A duplicate lands here with any media-copy warning in sessionStorage —
  // surface it once. Deferred to a microtask so hydration isn't a mismatch
  // and the effect stays a pure external-system read.
  useEffect(() => {
    const warning = consumeDuplicateWarning();
    if (warning) queueMicrotask(() => setFlashWarning(warning));
  }, []);

  const markChanged = useCallback(() => {
    setActionError(undefined);
    getPipeline().queue(snapshot());
  }, [snapshot, getPipeline]);

  const handleDocumentChange = useCallback(
    ({ document }: ArticleEditorChange) => {
      docRef.current = document;
      markChanged();
    },
    [markChanged]
  );

  const handleMeta = useCallback(
    (patch: Partial<typeof meta>) => {
      const next = { ...metaRef.current, ...patch };
      metaRef.current = next;
      setMeta(next);
      markChanged();
    },
    [markChanged]
  );

  const handleCover = useCallback(
    (assetId: string | null) => handleMeta({ coverAssetId: assetId }),
    [handleMeta]
  );

  /* ------------------------- lifecycle actions ------------------------- */

  const doPublish = useCallback(async () => {
    setBusy(true);
    setActionError(undefined);
    // Flush pending edits first so the publication snapshots the latest doc.
    const flushed = await getPipeline().flushNow("manual");
    if (!flushed) {
      setBusy(false);
      setConfirm(null);
      return;
    }
    const result = await publishArticleAction(
      current.id,
      editVersionRef.current
    );
    setBusy(false);
    setConfirm(null);
    if (!result.ok || !result.article) {
      setActionError(articleErrorMessage(result.code, result.error));
      return;
    }
    setCurrent(result.article);
    editVersionRef.current = result.article.edit_version;
    setNotice(`Published — live at ${publicBaseUrl}/articles/${result.article.slug}`);
  }, [current.id, publicBaseUrl, getPipeline]);

  const doLifecycle = useCallback(
    async (kind: Exclude<ConfirmKind, "publish" | "reload" | null>) => {
      const actions = {
        unpublish: unpublishArticleAction,
        archive: archiveArticleAction,
        unarchive: unarchiveArticleAction,
      } as const;
      setBusy(true);
      setActionError(undefined);
      const result = await actions[kind](current.id);
      setBusy(false);
      setConfirm(null);
      if (!result.ok || !result.article) {
        setActionError(articleErrorMessage(result.code, result.error));
        return;
      }
      setCurrent(result.article);
      setNotice(
        kind === "unpublish"
          ? "Unpublished — the public page is offline."
          : kind === "archive"
            ? "Archived."
            : "Restored from archive."
      );
    },
    [current.id]
  );

  const doDuplicate = useCallback(async () => {
    setBusy(true);
    const result = await duplicateArticleAction(current.id);
    setBusy(false);
    if (!result.ok || !result.article) {
      setActionError(articleErrorMessage(result.code, result.error));
      return;
    }
    // The new editor mounts fresh — hand the media-copy warning over so it
    // isn't silently swallowed by the navigation.
    stashDuplicateWarning(result.warning);
    router.push(`/admin/articles/${result.article.id}/edit`);
  }, [current.id, router]);

  /** Export the unsaved on-screen draft before a conflict reload drops it. */
  const downloadMyEdits = useCallback(() => {
    const snap = snapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `article-${current.id}-unsaved-edits.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [snapshot, current.id]);

  const reloadAfterConflict = useCallback(async () => {
    setConfirm(null);
    const result = await getArticleForStudioAction(current.id);
    if (!result.ok || !result.article) {
      setActionError("Couldn't reload the article — refresh the page.");
      return;
    }
    setCurrent(result.article);
    const freshMeta = {
      title: result.article.title,
      summary: result.article.summary,
      slug: result.article.slug,
      topic: result.article.topic ?? "",
      tagsText: result.article.tags.join(", "),
      coverAssetId: result.article.cover_asset_id,
    };
    metaRef.current = freshMeta;
    setMeta(freshMeta);
    docRef.current = result.article.draft_content;
    setInitialDoc(result.article.draft_content);
    editVersionRef.current = result.article.edit_version;
    setVersion(result.article.edit_version);
    // The conflict-stopped pipeline can't be revived — discard it so the
    // next change builds a fresh one.
    pipelineRef.current?.destroy();
    pipelineRef.current = null;
    setEditorKey((k) => k + 1); // remount BlockNote
    setSaveState("clean");
  }, [current.id]);

  const slugLocked = current.first_published_at !== null;
  const publicUrl = `${publicBaseUrl}/articles/${current.slug}`;
  const isBusy = busy || saveState === "saving";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="border-cream-100/10 bg-charcoal-850 sticky top-16 z-30 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
        <Link
          href="/admin/articles"
          className="text-text-secondary hover:text-cream-50 flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={15} />
          Articles
        </Link>
        <span
          className={cn(
            "rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium",
            STATUS_CLASS[current.status]
          )}
        >
          {current.status === "draft" && !current.first_published_at
            ? "Not published yet"
            : STATUS_LABEL[current.status]}
        </span>
        <span className="text-text-muted text-xs">
          {saveState === "saved" && lastSavedAt
            ? `Last saved ${formatSavedAt(lastSavedAt)}`
            : saveState === "dirty"
              ? "Unsaved changes"
              : saveState === "conflict"
                ? "Version conflict"
                : `v${version}`}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-8 text-xs"
            disabled={saveState === "conflict"}
            onClick={() => void getPipeline().flushNow("manual")}
          >
            Save draft
          </Button>
          <Link
            href={`/admin/articles/${current.id}/preview`}
            target="_blank"
            className="text-text-secondary hover:text-cream-50 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium"
          >
            Preview
            <ArrowSquareOut size={12} />
          </Link>
          <Button
            type="button"
            variant="secondary"
            className="h-8 text-xs"
            disabled={isBusy}
            onClick={() => void doDuplicate()}
          >
            Duplicate
          </Button>
          {current.status === "archived" ? (
            <Button
              type="button"
              className="h-8 text-xs"
              disabled={isBusy}
              onClick={() => setConfirm("unarchive")}
            >
              Unarchive
            </Button>
          ) : current.status === "published" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="h-8 text-xs"
                disabled={isBusy}
                onClick={() => setConfirm("unpublish")}
              >
                Unpublish
              </Button>
              <Button
                type="button"
                className="h-8 text-xs"
                disabled={isBusy}
                onClick={() => setConfirm("publish")}
              >
                Republish
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="h-8 text-xs"
              disabled={isBusy || saveState === "conflict"}
              onClick={() => setConfirm("publish")}
            >
              Publish
            </Button>
          )}
          {current.status !== "archived" && (
            <Button
              type="button"
              variant="secondary"
              className="text-error h-8 text-xs"
              disabled={isBusy}
              onClick={() => setConfirm("archive")}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {saveState === "conflict" && (
        <div
          role="alert"
          className="border-warning/40 bg-warning/10 text-cream-50 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
        >
          <span>
            A newer version of this article was saved elsewhere. Your latest
            edits are kept on screen but can&rsquo;t be saved over it.
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-8 text-xs"
              onClick={downloadMyEdits}
            >
              Download my edits
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => setConfirm("reload")}
            >
              Reload latest version
            </Button>
          </div>
        </div>
      )}
      {flashWarning && (
        <div
          role="alert"
          className="border-warning/40 bg-warning/10 text-cream-50 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
        >
          <span>{flashWarning}</span>
          <Button
            type="button"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() => setFlashWarning(undefined)}
          >
            Dismiss
          </Button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="text-error text-sm">
          {actionError}
        </p>
      )}
      {notice && (
        <p role="status" className="text-lime-400 text-sm">
          {notice}
        </p>
      )}
      {current.status === "published" && (
        <p className="text-text-muted text-xs">
          Live at{" "}
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-lime-400 underline-offset-2 hover:underline"
          >
            {publicUrl}
          </a>
        </p>
      )}

      {/* Metadata */}
      <details className="border-cream-100/10 bg-charcoal-850/50 group rounded-xl border">
        <summary className="text-text-secondary hover:text-cream-50 cursor-pointer px-4 py-3 text-sm font-medium">
          Article settings — slug, summary, topic, tags
        </summary>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-text-muted mb-1 block text-xs">
              URL slug {slugLocked && "(locked after publishing)"}
            </span>
            <input
              value={meta.slug}
              disabled={slugLocked}
              onChange={(e) => handleMeta({ slug: e.target.value })}
              className="border-cream-100/15 bg-charcoal-800 text-cream-50 w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-muted mb-1 block text-xs">Topic</span>
            <input
              value={meta.topic}
              onChange={(e) => handleMeta({ topic: e.target.value })}
              placeholder="e.g. tutorials"
              className="border-cream-100/15 bg-charcoal-800 text-cream-50 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-text-muted mb-1 block text-xs">Summary</span>
            <textarea
              value={meta.summary}
              onChange={(e) => handleMeta({ summary: e.target.value })}
              rows={2}
              placeholder="One or two sentences shown on the article card."
              className="border-cream-100/15 bg-charcoal-800 text-cream-50 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-text-muted mb-1 block text-xs">
              Tags (comma-separated)
            </span>
            <input
              value={meta.tagsText}
              onChange={(e) => handleMeta({ tagsText: e.target.value })}
              placeholder="portrait, cinematic, workflow"
              className="border-cream-100/15 bg-charcoal-800 text-cream-50 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
        </div>
      </details>

      <ArticleEditor
        key={editorKey}
        articleId={current.id}
        initialDocument={initialDoc}
        initialTitle={meta.title}
        coverAssetId={meta.coverAssetId}
        onCoverChange={handleCover}
        editVersion={version}
        onDocumentChange={handleDocumentChange}
        onTitleChange={(t) => handleMeta({ title: t })}
        saveState={saveState === "conflict" ? "error" : saveState}
        readOnly={saveState === "conflict"}
      />

      {/* Confirmation dialogs */}
      <Dialog open={confirm !== null} onOpenChange={() => setConfirm(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirm === "publish"
              ? current.status === "published"
                ? "Republish article?"
                : "Publish article?"
              : confirm === "unpublish"
                ? "Unpublish article?"
                : confirm === "archive"
                  ? "Archive article?"
                  : confirm === "reload"
                    ? "Reload latest version?"
                    : "Unarchive article?"}
          </DialogTitle>
          <DialogDescription>
            {confirm === "publish" &&
              `The public page will serve this draft at ${publicUrl}. Its current live version stays up until the new one commits.`}
            {confirm === "unpublish" &&
              "The public page goes offline immediately. The draft and its media stay intact — you can republish later."}
            {confirm === "archive" &&
              "Archived articles leave the public listing and can't be published until unarchived. Draft content is kept."}
            {confirm === "unarchive" &&
              "The article returns to draft status and can be edited and published again."}
            {confirm === "reload" &&
              "Reloading replaces everything on screen with the newest saved version. Your unsaved edits will be discarded — download them first if you need to keep or re-apply them."}
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <DialogFooter>
            {confirm === "reload" && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={downloadMyEdits}
              >
                Download my edits
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                confirm === "publish"
                  ? void doPublish()
                  : confirm === "reload"
                    ? void reloadAfterConflict()
                    : confirm
                      ? void doLifecycle(confirm)
                      : undefined
              }
            >
              {busy
                ? "Working…"
                : confirm === "publish"
                  ? current.status === "published"
                    ? "Republish"
                    : "Publish"
                  : confirm === "reload"
                    ? "Discard edits and reload"
                    : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
