import type { ArticleWriteErrorCode } from "@/lib/articles/types";

/**
 * Map RPC error codes to actionable copy for the studio (#126).
 * The rule: the message must tell the author what to DO, not just what
 * failed — "Choose a cover", not "invalid_cover_asset".
 */
export function articleErrorMessage(
  code: ArticleWriteErrorCode | undefined,
  fallback?: string
): string {
  switch (code) {
    case "title_required":
      return "Give the article a title before publishing.";
    case "content_required":
      return "The article body is empty — add some content before publishing.";
    case "invalid_cover_asset":
      return "Choose a cover image from this article's media library.";
    case "media_not_ready":
      return "Some media is still uploading — wait for it to finish, or remove the block.";
    case "media_not_promoted":
      return "Publishing failed while preparing media — the live article was not changed. Try again.";
    case "media_in_use":
      return "That media is still used by the published article — change the cover or block first.";
    case "slug_conflict":
      return "That slug is already in use — pick a different one.";
    case "invalid_slug":
      return "Slugs can only contain lowercase letters, numbers and hyphens.";
    case "slug_locked":
      return "The URL is locked because this article has been published. It can't be changed.";
    case "invalid_tags":
      return "Tags can only use lowercase letters, numbers and hyphens (max 12).";
    case "edit_version_conflict":
      return "A newer version was saved elsewhere — reload the article before editing.";
    case "article_not_found":
      return "This article no longer exists.";
    case "article_not_published":
      return "This article isn't published.";
    case "cannot_publish_archived":
      return "Unarchive the article before publishing it.";
    case "preset_unavailable":
      return "A preset block links to a preset that isn't published anymore — pick a different preset or remove the block.";
    case "preset_version_unavailable":
      return "A preset block is pinned to a version that is no longer public — re-pick the preset to pin its current version.";
    case "forbidden":
      return "You don't have permission to edit articles.";
    default:
      return fallback ?? "Something went wrong — try again.";
  }
}
