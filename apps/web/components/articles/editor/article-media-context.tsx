"use client";

import { createContext, useContext } from "react";

/**
 * Media context for editor blocks (#129): the article being edited. Custom
 * blocks need it to scope uploads, the generation chooser and previews.
 */
export const ArticleMediaContext = createContext<{ articleId: string | null }>({
  articleId: null,
});

export function useArticleMediaContext() {
  return useContext(ArticleMediaContext);
}
