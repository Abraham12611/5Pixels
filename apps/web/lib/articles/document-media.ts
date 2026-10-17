import {
  ARTICLE_MEDIA_PROXY_BASE,
  articleMediaProxyUrl,
  extractAssetIdFromMediaUrl,
  isAllowedExternalMediaUrl,
  parseAssetUri,
} from "./media";
import { parsePromptReferences } from "./blocks/prompt-settings";
import type { ArticleBlockJson } from "./document";

/**
 * Media-reference handling for article documents (#129).
 *
 * Persisted documents NEVER carry storage URLs, signed URLs, private bucket
 * paths or arbitrary remote `src` values for media blocks:
 *   - Internal media is stored as `asset://{assetId}` in the block's url prop.
 *   - External URLs survive only when they are https + host-allowlisted.
 *   - Anything else is stripped to "" so the block renders empty rather than
 *     smuggling a payload or a private path into published HTML.
 *
 * The editor works with fetchable URLs, so loading a document expands
 * asset:// back to the staff-gated proxy route (/api/articles/media/{id}).
 */

/** BlockNote default block types that carry a `url` prop. */
const MEDIA_URL_BLOCK_TYPES = new Set(["image", "video", "audio", "file"]);

export interface DocumentMediaTransform {
  document: ArticleBlockJson[];
  /** Asset ids referenced by media blocks + generation blocks. */
  assetIds: string[];
  /** Urls stripped because they were neither ours nor allowlisted. */
  strippedUrls: number;
}

function normalizeMediaBlock(
  block: ArticleBlockJson
): { block: ArticleBlockJson; stripped: boolean } {
  const props = block.props;
  if (!props || typeof props.url !== "string" || props.url === "") {
    return { block, stripped: false };
  }

  const url = props.url;
  const internalId = extractAssetIdFromMediaUrl(url);
  if (internalId) {
    return {
      block: {
        ...block,
        props: { ...props, url: `asset://${internalId.toLowerCase()}` },
      },
      stripped: false,
    };
  }

  if (isAllowedExternalMediaUrl(url)) {
    return { block, stripped: false };
  }

  // Unresolvable or non-allowlisted remote URL — strip the src but keep the
  // block so the author sees an empty media slot instead of a silent drop.
  return {
    block: { ...block, props: { ...props, url: "" } },
    stripped: true,
  };
}

function walkTransform(
  blocks: ArticleBlockJson[],
  fn: (b: ArticleBlockJson) => { block: ArticleBlockJson; stripped: boolean },
  assetIds: Set<string>
): { blocks: ArticleBlockJson[]; stripped: number } {
  let stripped = 0;
  const out = blocks.map((b) => {
    let next = b;
    const res = fn(b);
    next = res.block;
    if (res.stripped) stripped += 1;
    // generation blocks reference assets by id prop, not url.
    if (b.type === "generation" && b.props) {
      const gid = parseAssetUri(`asset://${String(b.props.assetId ?? "")}`);
      if (gid) assetIds.add(gid);
    }
    // promptRecipe 'asset'-kind references are article media ids too (#128).
    if (b.type === "promptRecipe" && b.props) {
      for (const ref of parsePromptReferences(
        String(b.props.references ?? "")
      )) {
        if (ref.kind === "asset") assetIds.add(ref.id);
      }
    }
    if (next.children?.length) {
      const child = walkTransform(next.children, fn, assetIds);
      stripped += child.stripped;
      next = { ...next, children: child.blocks };
    }
    return next;
  });
  return { blocks: out, stripped };
}

/**
 * Normalize a document for persistence: convert any fetchable/internal media
 * URL to a canonical `asset://` reference, strip non-allowlisted remote src.
 * Run BEFORE validateArticleDocument on the save path.
 */
export function prepareDocumentForStorage(input: unknown): DocumentMediaTransform {
  const blocks = Array.isArray(input) ? (input as ArticleBlockJson[]) : [];
  const assetIds = new Set<string>();
  const { blocks: out, stripped } = walkTransform(
    blocks,
    (b) => {
      const res = MEDIA_URL_BLOCK_TYPES.has(b.type)
        ? normalizeMediaBlock(b)
        : { block: b, stripped: false };
      const id = extractAssetIdFromMediaUrl(
        typeof res.block.props?.url === "string" ? res.block.props.url : ""
      );
      if (id) assetIds.add(id);
      return res;
    },
    assetIds
  );
  return { document: out, assetIds: [...assetIds], strippedUrls: stripped };
}

/**
 * Expand `asset://` urls into proxy URLs for the editor (private staging is
 * served through the staff-gated route; allowlisted externals pass through).
 */
export function prepareDocumentForEditing(
  blocks: ArticleBlockJson[]
): ArticleBlockJson[] {
  const expand = (b: ArticleBlockJson): ArticleBlockJson => {
    let next = b;
    if (
      MEDIA_URL_BLOCK_TYPES.has(b.type) &&
      b.props &&
      typeof b.props.url === "string"
    ) {
      const assetId = parseAssetUri(b.props.url);
      if (assetId) {
        next = {
          ...b,
          props: { ...b.props, url: articleMediaProxyUrl(assetId) },
        };
      }
    }
    if (next.children?.length) {
      next = { ...next, children: next.children.map(expand) };
    }
    return next;
  };
  return blocks.map(expand);
}

/** All asset ids referenced by a document (media url props + generation blocks). */
export function collectDocumentAssetIds(blocks: ArticleBlockJson[]): string[] {
  const ids = new Set<string>();
  const walk = (list: ArticleBlockJson[]) => {
    for (const b of list) {
      if (MEDIA_URL_BLOCK_TYPES.has(b.type) && b.props) {
        const id = parseAssetUri(b.props.url);
        if (id) ids.add(id);
      }
      if (b.type === "generation" && b.props) {
        const raw = String(b.props.assetId ?? "");
        if (/^[0-9a-f-]{36}$/i.test(raw)) ids.add(raw);
      }
      // promptRecipe 'asset'-kind references count as media references —
      // they must be staged and promoted exactly like asset:// urls (#128).
      if (b.type === "promptRecipe" && b.props) {
        for (const ref of parsePromptReferences(
          String(b.props.references ?? "")
        )) {
          if (ref.kind === "asset") ids.add(ref.id);
        }
      }
      if (b.children) walk(b.children);
    }
  };
  walk(blocks);
  return [...ids];
}

/** True if a url prop string points at the article media proxy. */
export function isArticleMediaProxyUrl(url: string): boolean {
  return url.startsWith(ARTICLE_MEDIA_PROXY_BASE);
}
