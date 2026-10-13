import { z } from "zod";

/**
 * Typed block registry for the 5Pixels article editor.
 *
 * This is the single source of truth shared by:
 *   - the BlockNote schema (components/articles/editor/schema.ts)
 *   - the slash menu grouping (components/articles/editor/slash-menu.ts)
 *   - persistence validation (lib/articles/document.ts)
 *   - the public renderer contract (#131)
 *
 * Every entry lands as a typed placeholder today; the "implementedIn" issue
 * owns the real per-block logic. Adding a new block type = one entry here.
 */

export const ARTICLE_BLOCK_GROUP_ORDER = ["5Pixels", "Text", "Media"] as const;
export type ArticleBlockGroup = (typeof ARTICLE_BLOCK_GROUP_ORDER)[number];

/** Literal union of the 5Pixels custom block type names. */
export type ArticleCustomBlockType =
  | "preset"
  | "promptRecipe"
  | "settings"
  | "generation"
  | "comparison"
  | "workflow"
  | "callout"
  | "cta";

export interface ArticleBlockRegistration {
  /** BlockNote block type name (camelCase, stable — persisted in documents). */
  type: ArticleCustomBlockType;
  /** Slash-menu title. */
  title: string;
  group: ArticleBlockGroup;
  subtext: string;
  aliases: string[];
  badge?: string;
  /** Blocks without real logic yet still insert a typed placeholder. */
  status: "placeholder" | "implemented";
  /** Issue that owns the full implementation. */
  implementedIn: string;
}

export const CUSTOM_ARTICLE_BLOCKS: ArticleBlockRegistration[] = [
  {
    type: "preset",
    title: "Preset",
    group: "5Pixels",
    subtext: "Embed a 5Pixels preset with a Try This Look link",
    aliases: ["preset", "filter", "poster", "try this look"],
    status: "placeholder",
    implementedIn: "#127",
  },
  {
    type: "promptRecipe",
    title: "Prompt Recipe",
    group: "5Pixels",
    subtext: "Public-safe editorial prompt recipe (never the private system prompt)",
    aliases: ["prompt", "recipe", "prompt recipe"],
    status: "placeholder",
    implementedIn: "#128",
  },
  {
    type: "settings",
    title: "Settings",
    group: "5Pixels",
    subtext: "Preset settings/controls table for a preset",
    aliases: ["settings", "controls", "parameters"],
    status: "placeholder",
    implementedIn: "#128",
  },
  {
    type: "generation",
    title: "Generation",
    group: "5Pixels",
    subtext: "Embed an approved generated image/video",
    aliases: ["generation", "output", "result"],
    status: "placeholder",
    implementedIn: "#129",
  },
  {
    type: "comparison",
    title: "Before/After",
    group: "5Pixels",
    subtext: "Side-by-side before/after comparison",
    aliases: ["before", "after", "comparison", "beforeafter"],
    status: "placeholder",
    implementedIn: "#130",
  },
  {
    type: "workflow",
    title: "Workflow",
    group: "5Pixels",
    subtext: "Numbered multi-step creative workflow",
    aliases: ["workflow", "steps", "tutorial"],
    status: "placeholder",
    implementedIn: "#130",
  },
  {
    type: "callout",
    title: "Callout",
    group: "5Pixels",
    subtext: "Highlighted note, tip or warning",
    aliases: ["callout", "note", "tip", "warning"],
    status: "placeholder",
    implementedIn: "#130",
  },
  {
    type: "cta",
    title: "Call to Action",
    group: "5Pixels",
    subtext: "Button/link block driving readers to a preset or page",
    aliases: ["cta", "call to action", "button", "link"],
    status: "placeholder",
    implementedIn: "#130",
  },
];

const customTypes = new Set<string>(
  CUSTOM_ARTICLE_BLOCKS.map((b) => b.type)
);

export function isCustomArticleBlockType(type: string): boolean {
  return customTypes.has(type);
}

/**
 * Prop schemas per custom block — validated at persistence time by
 * validateArticleDocument(). Keep permissive while the owning tickets land;
 * tighten there, not ad hoc.
 */
export const ARTICLE_CUSTOM_PROP_SCHEMAS: Record<string, z.ZodTypeAny> = {
  preset: z
    .object({ productSlug: z.string().max(120).default("") })
    .strip(),
  promptRecipe: z
    .object({
      recipe: z.string().max(4000).default(""),
      presetSlug: z.string().max(120).default(""),
    })
    .strip(),
  settings: z
    .object({ productSlug: z.string().max(120).default("") })
    .strip(),
  generation: z
    .object({
      generationId: z.string().max(64).default(""),
      assetId: z.string().max(64).default(""),
      caption: z.string().max(500).default(""),
    })
    .strip(),
  comparison: z
    .object({
      beforeAssetId: z.string().max(64).default(""),
      afterAssetId: z.string().max(64).default(""),
      mode: z.enum(["side-by-side", "slider"]).default("side-by-side"),
    })
    .strip(),
  workflow: z
    .object({
      steps: z.array(z.string().max(2000)).max(50).default([]),
    })
    .strip(),
  callout: z
    .object({
      tone: z.enum(["info", "tip", "warning"]).default("info"),
    })
    .strip(),
  cta: z
    .object({
      label: z.string().max(80).default(""),
      href: z.string().max(500).default(""),
      presetSlug: z.string().max(120).default(""),
    })
    .strip(),
};

/** Registry entry lookup by block type. */
export function getArticleBlockRegistration(
  type: string
): ArticleBlockRegistration | undefined {
  return CUSTOM_ARTICLE_BLOCKS.find((b) => b.type === type);
}
