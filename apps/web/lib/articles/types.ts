import type { ArticleBlockJson } from "./document";

export type ArticleStatus = "draft" | "published" | "archived";

export type ArticleRevisionSource = "autosave" | "manual" | "publish";

/** Row shape of public.articles (staff-only table). */
export interface Article {
  id: string;
  author_id: string | null;
  title: string;
  slug: string;
  summary: string;
  cover_asset_id: string | null;
  topic: string | null;
  tags: string[];
  status: ArticleStatus;
  draft_content: ArticleBlockJson[];
  schema_version: number;
  edit_version: number;
  last_edited_by: string | null;
  current_publication_id: string | null;
  first_published_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape of public.article_revisions (staff-only table). */
export interface ArticleRevision {
  id: string;
  article_id: string;
  editor_user_id: string | null;
  version: number;
  source: ArticleRevisionSource;
  title: string;
  summary: string;
  content: ArticleBlockJson[];
  schema_version: number;
  saved_at: string;
}

/** Row shape of public.article_publications (staff-only SELECT). */
export interface ArticlePublication {
  id: string;
  article_id: string;
  revision_id: string;
  publication_number: number;
  slug: string;
  title: string;
  summary: string;
  topic: string | null;
  tags: string[];
  cover_asset_id: string | null;
  content: ArticleBlockJson[];
  schema_version: number;
  author_display_name: string;
  author_avatar_asset_id: string | null;
  published_by: string | null;
  published_at: string;
}

/** Public-safe asset reference produced by public_asset_json(). */
export interface PublicAssetRef {
  assetId: string;
  bucket: string;
  storageKey: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

/** Public list row from get_public_articles(). */
export interface PublicArticleSummary {
  article_id: string;
  slug: string;
  title: string;
  summary: string;
  topic: string | null;
  tags: string[];
  cover: PublicAssetRef | null;
  author_display_name: string;
  author_avatar: PublicAssetRef | null;
  published_at: string;
  total_count?: number;
}

/** Public detail row from get_public_article_by_slug(). */
export interface PublicArticle extends Omit<PublicArticleSummary, "total_count"> {
  content: ArticleBlockJson[];
  schema_version: number;
  publication_number: number;
}

/** Error codes raised by the articles RPCs (RAISE ... ERRCODE/message). */
export type ArticleWriteErrorCode =
  | "forbidden"
  | "article_not_found"
  | "article_not_published"
  | "article_not_archived"
  | "edit_version_conflict"
  | "slug_locked"
  | "invalid_slug"
  | "slug_conflict"
  | "invalid_tags"
  | "invalid_content"
  | "invalid_cover_asset"
  | "media_not_ready"
  | "media_not_promoted"
  | "media_in_use"
  | "title_required"
  | "content_required"
  | "cannot_publish_archived"
  | "unknown";

export interface ArticleWriteResult {
  ok: boolean;
  article?: Article;
  code?: ArticleWriteErrorCode;
  error?: string;
  /** Non-fatal notice, e.g. a media clone that stayed pending on duplicate. */
  warning?: string;
}

/** Staff list row — the article plus resolved author/editor identities. */
export interface StaffArticle extends Article {
  author_email: string | null;
  editor_email: string | null;
}
