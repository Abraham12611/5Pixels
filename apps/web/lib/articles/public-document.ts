import { publicAssetUrl } from "@/lib/catalog/media";
import type { ArticleBlockJson } from "./document";
import { isAllowedExternalMediaUrl, parseAssetUri } from "./media";
import { isValidSlug, normalizeSlug } from "./slug";
import type { PublicAssetRef } from "./types";

/**
 * Public-document helpers for the Articles reader (#131).
 *
 * Everything here is pure and deliberately conservative: the published
 * snapshot is staff-authored but still untrusted input at render time, so
 * every URL, slug and count is validated before it reaches the page.
 */

/* --------------------------------------------------------------------------
 * Links
 * ------------------------------------------------------------------------ */

const MAX_LINK_HREF_LENGTH = 2048;

/**
 * Allowed inline-link targets: internal paths, http(s) and mailto.
 * Returns null for anything else (javascript:, data:, vbscript:, protocol-
 * relative //host, empty/overlong) — the renderer then emits plain text.
 */
export function sanitizeLinkHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.length > MAX_LINK_HREF_LENGTH) return null;
  if (trimmed.startsWith("/")) {
    // Internal path — but "//evil.com" is protocol-relative, not a path.
    return trimmed.startsWith("//") ? null : trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (
      url.protocol === "https:" ||
      url.protocol === "http:" ||
      url.protocol === "mailto:"
    ) {
      return trimmed;
    }
  } catch {
    // Not parseable — reject.
  }
  return null;
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith("mailto:");
}

/**
 * CTA buttons may only point inside 5Pixels — a published CTA must never send
 * readers to an arbitrary external domain from a button-styled element.
 */
export function sanitizeCtaHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.length > MAX_LINK_HREF_LENGTH) return null;
  return trimmed;
}

/** Preset references in blocks must be a well-formed slug. */
export function sanitizePresetSlug(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  const normalized = normalizeSlug(slug);
  return normalized && isValidSlug(normalized) ? normalized : null;
}

/* --------------------------------------------------------------------------
 * Media resolution
 * ------------------------------------------------------------------------ */

export interface ResolvedMedia {
  src: string;
  asset: PublicAssetRef | null;
}

/**
 * Resolve a persisted media `url` prop:
 *   asset://{id}     -> published media map entry -> public bucket URL
 *   https://…        -> only hosts on ARTICLE_EXTERNAL_MEDIA_HOSTS
 *   anything else    -> null (renders an empty media slot, never a payload)
 */
export function resolveMediaSrc(
  url: unknown,
  media: Record<string, PublicAssetRef>
): ResolvedMedia | null {
  if (typeof url !== "string" || !url) return null;
  const assetId = parseAssetUri(url);
  if (assetId) {
    const ref = media[assetId.toLowerCase()];
    if (!ref) return null;
    return { src: publicAssetUrl(ref.bucket, ref.storageKey), asset: ref };
  }
  if (isAllowedExternalMediaUrl(url)) {
    return { src: url, asset: null };
  }
  return null;
}

/** Resolve a custom-block assetId prop (generation, comparison) via the map. */
export function resolveAssetMedia(
  assetId: unknown,
  media: Record<string, PublicAssetRef>
): ResolvedMedia | null {
  if (typeof assetId !== "string" || !assetId) return null;
  const ref = media[assetId.toLowerCase()];
  if (!ref) return null;
  return { src: publicAssetUrl(ref.bucket, ref.storageKey), asset: ref };
}

/* --------------------------------------------------------------------------
 * Inline content → plain text
 * ------------------------------------------------------------------------ */

/** Concatenate the visible text of a BlockNote InlineContent[] payload. */
export function inlineContentToText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const node = item as Record<string, unknown>;
    if (typeof node.text === "string") out += node.text;
    if (Array.isArray(node.content)) out += inlineContentToText(node.content);
  }
  return out;
}

function blockPlainText(block: ArticleBlockJson): string {
  const parts: string[] = [];
  // content is InlineContent[] for most blocks; tables carry a
  // {type:'tableContent', rows:[{cells:[tableCell objects]}]} object.
  if (Array.isArray(block.content)) {
    parts.push(inlineContentToText(block.content));
  } else if (block.content && typeof block.content === "object") {
    const table = block.content as { rows?: { cells?: unknown[] }[] };
    for (const row of table.rows ?? []) {
      for (const cell of row.cells ?? []) {
        if (Array.isArray(cell)) parts.push(inlineContentToText(cell));
        else if (cell && typeof cell === "object") {
          parts.push(
            inlineContentToText((cell as { content?: unknown }).content)
          );
        }
      }
    }
  }
  const props = block.props;
  if (props && typeof props === "object") {
    for (const key of ["recipe", "caption", "name", "label"]) {
      const v = (props as Record<string, unknown>)[key];
      if (typeof v === "string") parts.push(v);
    }
    const steps = (props as Record<string, unknown>).steps;
    if (Array.isArray(steps)) {
      for (const s of steps) if (typeof s === "string") parts.push(s);
    }
  }
  return parts.filter(Boolean).join(" ");
}

/** All visible text in document order (reading time, meta description). */
export function extractPlainText(blocks: ArticleBlockJson[]): string {
  const parts: string[] = [];
  const walk = (list: ArticleBlockJson[]) => {
    for (const b of list) {
      const text = blockPlainText(b);
      if (text) parts.push(text);
      if (b.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  return parts.join(" ");
}

const WORDS_PER_MINUTE = 200;

/** Approximate reading time in whole minutes (always ≥ 1). */
export function estimateReadingTimeMinutes(blocks: ArticleBlockJson[]): number {
  const words = extractPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/* --------------------------------------------------------------------------
 * Headings + table of contents
 * ------------------------------------------------------------------------ */

export interface ArticleTocEntry {
  /** Deterministic unique anchor id assigned to the heading element. */
  id: string;
  text: string;
  /** BlockNote heading level (1–3). */
  level: number;
  /** Identity key matching the source block — used internally for ids. */
  blockKey: string;
}

export interface HeadingIndex {
  entries: ArticleTocEntry[];
  /** block object → anchor id (same traversal the renderer uses). */
  byBlock: Map<ArticleBlockJson, string>;
}

function headingLevel(block: ArticleBlockJson): number {
  const raw = Number(block.props?.level);
  return raw >= 1 && raw <= 3 ? Math.floor(raw) : 1;
}

function uniqueAnchorId(base: string, used: Set<string>): string {
  let candidate = base || "section";
  let n = 2;
  while (used.has(candidate)) candidate = `${base || "section"}-${n++}`;
  used.add(candidate);
  return candidate;
}

/**
 * Walk the document once and assign each heading block a deterministic,
 * unique anchor id derived from its visible text. The returned `byBlock` map
 * is what the renderer reads when emitting `id` attributes, so the TOC can
 * never drift out of sync with the rendered anchors.
 */
export function indexHeadings(blocks: ArticleBlockJson[]): HeadingIndex {
  const used = new Set<string>();
  const entries: ArticleTocEntry[] = [];
  const byBlock = new Map<ArticleBlockJson, string>();
  const walk = (list: ArticleBlockJson[]) => {
    for (const block of list) {
      if (block.type === "heading") {
        const text = inlineContentToText(block.content).trim();
        if (text) {
          const id = uniqueAnchorId(normalizeSlug(text), used);
          const entry = {
            id,
            text,
            level: headingLevel(block),
            blockKey: String(block.id ?? entries.length),
          };
          entries.push(entry);
          byBlock.set(block, id);
        }
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(blocks);
  return { entries, byBlock };
}

/** Anchor id for a heading block, if it was indexed. */
export function anchorIdFor(
  index: HeadingIndex,
  block: ArticleBlockJson
): string | undefined {
  return index.byBlock.get(block);
}

/* --------------------------------------------------------------------------
 * Preset references
 * ------------------------------------------------------------------------ */

/**
 * Slug-keyed preset references, resolved through the public catalog RPC.
 * `preset`, `promptRecipe` and `settings` blocks (#127/#128) carry a
 * canonical `presetId` — their slug props are only a fallback for
 * documents authored before the canonical contract existed.
 */
const PRESET_REF_PROP_KEYS: Record<string, string[]> = {
  preset: ["slug", "productSlug"],
  promptRecipe: ["slug", "presetSlug"],
  settings: ["slug", "productSlug"],
  cta: ["presetSlug"],
};

const PRESET_ID_BLOCK_TYPES = new Set(["preset", "promptRecipe", "settings"]);

function hasCanonicalPresetId(block: ArticleBlockJson): boolean {
  return (
    PRESET_ID_BLOCK_TYPES.has(block.type) &&
    typeof block.props?.presetId === "string" &&
    block.props.presetId !== ""
  );
}

/** Unique, sanitized preset slugs referenced by any block (document order). */
export function collectPresetSlugs(blocks: ArticleBlockJson[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const walk = (list: ArticleBlockJson[]) => {
    for (const block of list) {
      // presetId-bearing blocks resolve via collectEditorialPresetIds /
      // collectDocumentPresetIds — never through the slug path.
      if (!hasCanonicalPresetId(block)) {
        for (const key of PRESET_REF_PROP_KEYS[block.type] ?? []) {
          const slug = sanitizePresetSlug(block.props?.[key]);
          if (slug && !seen.has(slug)) {
            seen.add(slug);
            out.push(slug);
            break;
          }
        }
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(blocks);
  return out;
}

/**
 * Canonical presetIds carried by the #128 editorial blocks
 * (promptRecipe, settings). `preset` blocks are covered upstream by
 * collectDocumentPresetIds — the page unions both.
 */
export function collectEditorialPresetIds(
  blocks: ArticleBlockJson[]
): string[] {
  const ids: string[] = [];
  const walk = (list: ArticleBlockJson[]) => {
    for (const block of list) {
      if (
        (block.type === "promptRecipe" || block.type === "settings") &&
        hasCanonicalPresetId(block)
      ) {
        ids.push(block.props!.presetId as string);
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(blocks);
  return [...new Set(ids)];
}
