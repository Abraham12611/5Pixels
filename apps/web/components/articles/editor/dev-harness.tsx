"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_ARTICLE_DOCUMENT } from "@/lib/articles/sample-document";
import {
  ArticleEditor,
  type ArticleEditorChange,
  type ArticleSaveState,
} from "./index";

/**
 * Isolated dev harness for the article editor shell (#125). Mounts the editor
 * with fixture content and simulates the save lifecycle locally — real
 * persistence lands with the studio CRUD ticket (#126).
 */
export function ArticleEditorHarness() {
  const [saveState, setSaveState] = useState<ArticleSaveState>("clean");
  const [blockCount, setBlockCount] = useState(
    SAMPLE_ARTICLE_DOCUMENT.length
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const handleChange = useCallback(({ document }: ArticleEditorChange) => {
    setBlockCount(document.length);
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaveState("saving");
      timer.current = setTimeout(() => setSaveState("saved"), 400);
    }, 800);
  }, []);

  return (
    <div>
      <div className="border-cream-100/10 bg-charcoal-850 mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <div>
          <p className="text-cream-50 text-sm font-medium">
            Article editor — dev harness
          </p>
          <p className="text-text-muted text-xs">
            Fixture content only; persistence wires up in #126.
          </p>
        </div>
        <p className="text-text-muted text-xs tabular-nums">
          {blockCount} top-level block{blockCount === 1 ? "" : "s"}
        </p>
      </div>

      <ArticleEditor
        initialDocument={SAMPLE_ARTICLE_DOCUMENT}
        initialTitle="Fixture: how this look was made"
        editVersion={0}
        onDocumentChange={handleChange}
        saveState={saveState}
      />
    </div>
  );
}
