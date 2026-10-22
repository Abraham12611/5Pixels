"use client";

import dynamic from "next/dynamic";

/**
 * Client-only mount for the article editor — BlockNote cannot render on the
 * server (ProseMirror needs DOM APIs), so the dynamic import with ssr:false
 * lives here; server components import this module, never ./article-editor.
 */
export const ArticleEditor = dynamic(
  () => import("./article-editor").then((m) => m.ArticleEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto w-full max-w-3xl animate-pulse"
        aria-label="Loading editor"
      >
        <div className="bg-charcoal-850/60 mb-6 h-40 w-full rounded-2xl" />
        <div className="bg-charcoal-800 mb-6 h-12 w-2/3 rounded-lg" />
        <div className="bg-charcoal-850/40 h-64 w-full rounded-xl" />
      </div>
    ),
  }
);

export type { ArticleEditorProps, ArticleEditorChange, ArticleSaveState } from "./article-editor";
