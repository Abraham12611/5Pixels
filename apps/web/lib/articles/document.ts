import { z } from "zod";
import {
  ARTICLE_CUSTOM_PROP_SCHEMAS,
  isCustomArticleBlockType,
} from "./blocks/registry";

/**
 * Canonical persisted document shape for Articles.
 *
 * draft_content / publication content is the raw BlockNote document — an
 * ordered array of block objects — serialised losslessly as JSONB. It is
 * deliberately NOT markdown/HTML (custom blocks cannot round-trip through
 * markdown). `schema_version` on the row tracks ARTICLE_SCHEMA_VERSION.
 */

export const ARTICLE_SCHEMA_VERSION = 1;
/** Matches the pg_column_size CHECK in the articles migration (256KB). */
export const ARTICLE_DOC_MAX_BYTES = 256 * 1024;
export const ARTICLE_MAX_BLOCKS = 500;
export const ARTICLE_MAX_BLOCK_DEPTH = 8;

export interface ArticleBlockJson {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: ArticleBlockJson[];
  [key: string]: unknown;
}

const articleBlockJsonSchema: z.ZodType<ArticleBlockJson> = z.lazy(() =>
  z.looseObject({
    id: z.string().min(1).max(64).optional(),
    type: z.string().min(1).max(64),
    props: z.record(z.string(), z.unknown()).optional(),
    content: z.unknown().optional(),
    children: z.array(articleBlockJsonSchema).optional(),
  })
);

const baseDocumentSchema = z
  .array(articleBlockJsonSchema)
  .max(ARTICLE_MAX_BLOCKS);

export interface DocumentValidation {
  ok: boolean;
  document?: ArticleBlockJson[];
  error?: string;
}

function countBlocks(
  blocks: ArticleBlockJson[],
  depth: number
): { count: number; maxDepth: number } | { error: string } {
  if (depth > ARTICLE_MAX_BLOCK_DEPTH) {
    return { error: `Document exceeds max nesting depth of ${ARTICLE_MAX_BLOCK_DEPTH}` };
  }
  let count = 0;
  let maxDepth = depth;
  for (const block of blocks) {
    count += 1;
    if (block.children) {
      const child = countBlocks(block.children, depth + 1);
      if ("error" in child) return child;
      count += child.count;
      maxDepth = Math.max(maxDepth, child.maxDepth);
    }
  }
  return { count, maxDepth };
}

/**
 * Validate + normalise an untrusted block array into the persisted shape.
 * - Structural bounds: block count, nesting depth, byte size.
 * - Custom 5Pixels blocks get their props checked against the registry
 *   schema; unknown block types pass through structurally so future blocks
 *   degrade safely instead of failing to load.
 */
export function validateArticleDocument(input: unknown): DocumentValidation {
  const parsed = baseDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid document" };
  }
  const document = parsed.data;

  const stats = countBlocks(document, 1);
  if ("error" in stats) return { ok: false, error: stats.error };
  if (stats.count > ARTICLE_MAX_BLOCKS) {
    return {
      ok: false,
      error: `Document exceeds max block count of ${ARTICLE_MAX_BLOCKS}`,
    };
  }

  const bytes = new TextEncoder().encode(JSON.stringify(document)).length;
  if (bytes > ARTICLE_DOC_MAX_BYTES) {
    return { ok: false, error: `Document exceeds max size of ${ARTICLE_DOC_MAX_BYTES} bytes` };
  }

  for (const block of walkBlocks(document)) {
    if (!isCustomArticleBlockType(block.type)) continue;
    const propsSchema = ARTICLE_CUSTOM_PROP_SCHEMAS[block.type];
    if (!propsSchema) continue;
    const result = propsSchema.safeParse(block.props ?? {});
    if (!result.success) {
      return {
        ok: false,
        error: `Invalid props for "${block.type}" block: ${result.error.issues[0]?.message ?? "invalid"}`,
      };
    }
    block.props = result.data as Record<string, unknown>;
  }

  return { ok: true, document };
}

function* walkBlocks(blocks: ArticleBlockJson[]): Generator<ArticleBlockJson> {
  for (const block of blocks) {
    yield block;
    if (block.children) yield* walkBlocks(block.children);
  }
}

/** Throws on invalid input — use when callers should fail loudly. */
export function deserializeArticleDocument(input: unknown): ArticleBlockJson[] {
  const result = validateArticleDocument(input);
  if (!result.ok || !result.document) {
    throw new Error(result.error ?? "Invalid article document");
  }
  return result.document;
}

/**
 * Validate then JSON-serialise for persistence. Returns the string form; the
 * JSONB column stores the same value re-parsed.
 */
export function serializeArticleDocument(blocks: unknown): string {
  return JSON.stringify(deserializeArticleDocument(blocks));
}

/** True when the document has no meaningful content (empty or all-empty paragraphs). */
export function isArticleDocumentEmpty(blocks: ArticleBlockJson[]): boolean {
  if (blocks.length === 0) return true;
  return blocks.every(
    (b) =>
      b.type === "paragraph" &&
      (b.content === undefined ||
        (Array.isArray(b.content) && b.content.length === 0)) &&
      (!b.children || b.children.length === 0)
  );
}
