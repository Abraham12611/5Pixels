"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  archiveArticleAction,
  duplicateArticleAction,
  publishArticleAction,
  unarchiveArticleAction,
  unpublishArticleAction,
} from "@/lib/articles/actions";
import type { StaffArticle } from "@/lib/articles/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { articleErrorMessage } from "./studio-errors";

type PendingAction =
  | "publish"
  | "unpublish"
  | "archive"
  | "unarchive"
  | "duplicate"
  | null;

/**
 * Per-row lifecycle actions for the staff articles table (#126). Publish from
 * the list reuses the row's current edit_version; deeper editing happens in
 * the studio where conflicts surface properly.
 */
export function ArticleRowActions({ article }: { article: StaffArticle }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string>();
  const [busy, startTransition] = useTransition();

  const run = (kind: Exclude<PendingAction, null>) => {
    setError(undefined);
    startTransition(async () => {
      const result =
        kind === "publish"
          ? await publishArticleAction(article.id, article.edit_version)
          : kind === "unpublish"
            ? await unpublishArticleAction(article.id)
            : kind === "archive"
              ? await archiveArticleAction(article.id)
              : kind === "unarchive"
                ? await unarchiveArticleAction(article.id)
                : await duplicateArticleAction(article.id);
      if (!result.ok) {
        setError(articleErrorMessage(result.code, result.error));
        return;
      }
      setPending(null);
      if (kind === "duplicate" && result.article) {
        router.push(`/admin/articles/${result.article.id}/edit`);
        return;
      }
      router.refresh();
    });
  };

  const btn = "text-text-secondary hover:text-cream-50 rounded-md px-2 py-1 text-xs font-medium transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <Link href={`/admin/articles/${article.id}/edit`} className={btn}>
        Edit
      </Link>
      <Link
        href={`/admin/articles/${article.id}/preview`}
        target="_blank"
        className={btn}
      >
        Preview
      </Link>
      <button type="button" className={btn} onClick={() => setPending("duplicate")}>
        Duplicate
      </button>
      {article.status === "archived" ? (
        <button type="button" className={btn} onClick={() => setPending("unarchive")}>
          Unarchive
        </button>
      ) : article.status === "published" ? (
        <button type="button" className={btn} onClick={() => setPending("unpublish")}>
          Unpublish
        </button>
      ) : (
        <button type="button" className={btn} onClick={() => setPending("publish")}>
          Publish
        </button>
      )}
      {article.status !== "archived" && (
        <button
          type="button"
          className="text-error/80 hover:text-error rounded-md px-2 py-1 text-xs font-medium transition-colors"
          onClick={() => setPending("archive")}
        >
          Archive
        </button>
      )}

      <Dialog open={pending !== null} onOpenChange={() => setPending(null)}>
        <DialogHeader>
          <DialogTitle>
            {pending === "publish"
              ? `Publish "${article.title}"?`
              : pending === "unpublish"
                ? `Unpublish "${article.title}"?`
                : pending === "archive"
                  ? `Archive "${article.title}"?`
                  : pending === "unarchive"
                    ? `Unarchive "${article.title}"?`
                    : `Duplicate "${article.title}"?`}
          </DialogTitle>
          <DialogDescription>
            {pending === "publish" &&
              "The saved draft goes live at its public URL immediately."}
            {pending === "unpublish" &&
              "The public page goes offline. Draft content stays intact."}
            {pending === "archive" &&
              "The article leaves all listings until unarchived."}
            {pending === "unarchive" &&
              "The article returns to draft status."}
            {pending === "duplicate" &&
              "Creates a new draft copy with its own media — the original is untouched."}
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          {error && (
            <p role="alert" className="text-error mb-3 text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => pending && run(pending)}
            >
              {busy ? "Working…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
