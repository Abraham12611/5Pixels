import { cache } from "react";
import { requireAdminOrOwner } from "@/lib/db/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  Article,
  ArticleRevision,
  ArticleStatus,
  PublicArticle,
  PublicArticleSummary,
} from "./types";

const GENERIC_ERROR = "Unable to load articles. Please try again.";

export interface ArticlesResult<T> {
  data: T;
  error?: string;
  totalCount?: number;
}

/* --------------------------------------------------------------------------
 * Staff reads — gated by requireAdminOrOwner() AND the staff SELECT policy.
 * The RLS policy is the real boundary; requireAdminOrOwner gives the app's
 * redirect behaviour on top.
 * ------------------------------------------------------------------------ */

export async function listArticlesForStaff(options?: {
  status?: ArticleStatus;
  page?: number;
  pageSize?: number;
}): Promise<ArticlesResult<Article[]>> {
  await requireAdminOrOwner();
  const supabase = await createClient();

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20));

  let query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (options?.status) query = query.eq("status", options.status);

  const { data, error, count } = await query;
  if (error) {
    console.error("[listArticlesForStaff] query failed", error);
    return { data: [], error: GENERIC_ERROR };
  }
  return {
    data: (data ?? []) as Article[],
    totalCount: count ?? 0,
  };
}

/** Full working row for the editor. Staff-only (draft content never leaves). */
export async function getArticleForEditor(
  articleId: string
): Promise<ArticlesResult<Article | null>> {
  await requireAdminOrOwner();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .maybeSingle();

  if (error) {
    console.error("[getArticleForEditor] query failed", error);
    return { data: null, error: GENERIC_ERROR };
  }
  return { data: (data as Article | null) ?? null };
}

export async function listArticleRevisions(
  articleId: string,
  limit = 50
): Promise<ArticlesResult<ArticleRevision[]>> {
  await requireAdminOrOwner();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("article_revisions")
    .select("*")
    .eq("article_id", articleId)
    .order("saved_at", { ascending: false })
    .limit(Math.min(200, Math.max(1, limit)));

  if (error) {
    console.error("[listArticleRevisions] query failed", error);
    return { data: [], error: GENERIC_ERROR };
  }
  return { data: (data ?? []) as ArticleRevision[] };
}

/* --------------------------------------------------------------------------
 * Public reads — anonymous-safe, fixed-projection SECURITY DEFINER RPCs.
 * Only published snapshots are reachable; anything else returns no rows.
 * ------------------------------------------------------------------------ */

export const getPublishedArticles = cache(async function getPublishedArticles(options?: {
  page?: number;
  pageSize?: number;
  topic?: string;
}): Promise<ArticlesResult<PublicArticleSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_articles", {
    p_page: options?.page ?? 1,
    p_page_size: options?.pageSize ?? 12,
    p_topic: options?.topic ?? null,
  });

  if (error) {
    console.error("[getPublishedArticles] RPC failed", error);
    return { data: [], error: GENERIC_ERROR };
  }

  const rows = (data ?? []) as PublicArticleSummary[];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  return {
    data: rows.map((row) => {
      const clone = { ...row };
      delete clone.total_count;
      return clone;
    }),
    totalCount,
  };
});

/**
 * Published article by slug. Returns null for unpublished, archived or
 * missing slugs — callers render a 404.
 */
export const getPublishedArticleBySlug = cache(
  async function getPublishedArticleBySlug(
    slug: string
  ): Promise<PublicArticle | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_article_by_slug", {
      p_slug: slug,
    });

    if (error) {
      console.error("[getPublishedArticleBySlug] RPC failed", error);
      return null;
    }
    const rows = (data ?? []) as PublicArticle[];
    return rows[0] ?? null;
  }
);
