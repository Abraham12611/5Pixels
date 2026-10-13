"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveArticleDraftAction,
  publishArticleAction,
  unpublishArticleAction,
} from "@/lib/articles/actions";
import type { Article } from "@/lib/articles/types";
import { Button } from "@/components/ui/button";
import { ArticleMediaLibrary } from "../media/article-media-library";
import {
  ArticleEditor,
  type ArticleEditorChange,
  type ArticleSaveState,
} from "./index";

/**
 * Dev harness for the article editor (#125, extended for #129 media).
 * Mounts the editor against a REAL article row — draft saves go through
 * save_article_draft and the cover/media pipeline is exercised for real.
 */
export function ArticleEditorHarness({ article }: { article: Article }) {
  const [saveState, setSaveState] = useState<ArticleSaveState>("clean");
  const [blockCount, setBlockCount] = useState(article.draft_content.length);
  const [title, setTitle] = useState(article.title);
  const [editVersion, setEditVersion] = useState(article.edit_version);
  const [coverAssetId, setCoverAssetId] = useState(article.cover_asset_id);
  const [status, setStatus] = useState(article.status);
  const [mediaOpen, setMediaOpen] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, coverAssetId, document: article.draft_content });

  useEffect(() => {
    latest.current.title = title;
    latest.current.coverAssetId = coverAssetId;
  }, [title, coverAssetId]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    []
  );

  const save = useCallback(async () => {
    setSaveState("saving");
    const result = await saveArticleDraftAction({
      articleId: article.id,
      expectedEditVersion: editVersion,
      title: latest.current.title,
      coverAssetId: latest.current.coverAssetId ?? undefined,
      clearCover: latest.current.coverAssetId === null,
      content: latest.current.document,
      source: "autosave",
    });
    if (result.ok && result.article) {
      setEditVersion(result.article.edit_version);
      setSaveState("saved");
    } else {
      setSaveState("error");
      console.error("[harness] save failed", result.error);
    }
  }, [article.id, editVersion]);

  const scheduleSave = useCallback(() => {
    setSaveState("dirty");
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => void save(), 800);
  }, [save]);

  const handleChange = useCallback(
    ({ document }: ArticleEditorChange) => {
      latest.current.document = document as never;
      setBlockCount(document.length);
      scheduleSave();
    },
    [scheduleSave]
  );

  return (
    <div className="space-y-8">
      <div className="border-cream-100/10 bg-charcoal-850 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <div>
          <p className="text-cream-50 text-sm font-medium">
            Article editor — dev harness
          </p>
          <p className="text-text-muted text-xs">
            Real draft <code>{article.slug}</code> · media pipeline live (#129)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-text-muted mr-2 text-xs tabular-nums">
            {blockCount} top-level block{blockCount === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() => setMediaOpen((o) => !o)}
          >
            {mediaOpen ? "Hide media library" : "Media library"}
          </Button>
          {status === "published" ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() =>
                void unpublishArticleAction(article.id).then((r) => {
                  if (r.ok) setStatus("draft");
                })
              }
            >
              Unpublish
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() =>
                void publishArticleAction(article.id, editVersion).then((r) => {
                  if (r.ok) setStatus("published");
                })
              }
            >
              Publish
            </Button>
          )}
        </div>
      </div>

      <ArticleEditor
        articleId={article.id}
        initialDocument={article.draft_content}
        initialTitle={article.title}
        coverAssetId={coverAssetId}
        onCoverChange={(id) => {
          setCoverAssetId(id);
          scheduleSave();
        }}
        editVersion={editVersion}
        onDocumentChange={handleChange}
        onTitleChange={(t) => {
          setTitle(t);
          scheduleSave();
        }}
        saveState={saveState}
      />

      {mediaOpen && (
        <section className="border-cream-100/10 bg-charcoal-850/40 rounded-2xl border p-4">
          <h2 className="text-cream-50 mb-3 text-sm font-medium">
            Article media library
          </h2>
          <ArticleMediaLibrary articleId={article.id} />
        </section>
      )}
    </div>
  );
}
