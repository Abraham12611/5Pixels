"use client";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  type BlockNoteEditor,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import {
  getArticleBlockRegistration,
  type ArticleBlockRegistration,
} from "@/lib/articles/blocks/registry";
import { PlaceholderBlock } from "./placeholder-block";

/**
 * The article editor schema: all default BlockNote blocks plus the 5Pixels
 * custom block types from lib/articles/blocks/registry.ts.
 *
 * Custom blocks render as typed placeholders until their owning tickets land
 * (see each registration's `implementedIn`). Block TYPE and prop names are
 * stable now — persisted documents stay valid when real renderers replace the
 * placeholders.
 *
 * Keep editor propSchema in sync with ARTICLE_CUSTOM_PROP_SCHEMAS in
 * lib/articles/blocks/registry.ts: BlockNote drops props it does not declare,
 * so any primitive prop the zod schema persists must be declared here.
 * Non-primitive props (e.g. workflow steps) arrive with the owning ticket.
 */

function spec(type: string) {
  const reg = getArticleBlockRegistration(type) as ArticleBlockRegistration;
  return reg;
}

const customBlockSpecs = {
  preset: createReactBlockSpec(
    {
      type: "preset",
      propSchema: { productSlug: { default: "" } },
      content: "none",
    },
    { render: () => <PlaceholderBlock registration={spec("preset")} /> }
  )(),
  promptRecipe: createReactBlockSpec(
    {
      type: "promptRecipe",
      propSchema: {
        recipe: { default: "" },
        presetSlug: { default: "" },
      },
      content: "none",
    },
    { render: () => <PlaceholderBlock registration={spec("promptRecipe")} /> }
  )(),
  settings: createReactBlockSpec(
    {
      type: "settings",
      propSchema: { productSlug: { default: "" } },
      content: "none",
    },
    { render: () => <PlaceholderBlock registration={spec("settings")} /> }
  )(),
  generation: createReactBlockSpec(
    {
      type: "generation",
      propSchema: {
        generationId: { default: "" },
        assetId: { default: "" },
        caption: { default: "" },
      },
      content: "none",
    },
    { render: () => <PlaceholderBlock registration={spec("generation")} /> }
  )(),
  comparison: createReactBlockSpec(
    {
      type: "comparison",
      propSchema: {
        beforeAssetId: { default: "" },
        afterAssetId: { default: "" },
        mode: {
          default: "side-by-side",
          values: ["side-by-side", "slider"],
        },
      },
      content: "none",
    },
    { render: () => <PlaceholderBlock registration={spec("comparison")} /> }
  )(),
  workflow: createReactBlockSpec(
    { type: "workflow", propSchema: {}, content: "none" },
    { render: () => <PlaceholderBlock registration={spec("workflow")} /> }
  )(),
  callout: createReactBlockSpec(
    {
      type: "callout",
      propSchema: {
        tone: { default: "info", values: ["info", "tip", "warning"] },
      },
      content: "inline",
    },
    {
      render: ({ contentRef }) => (
        <PlaceholderBlock
          registration={spec("callout")}
          contentRef={contentRef}
        />
      ),
    }
  )(),
  cta: createReactBlockSpec(
    {
      type: "cta",
      propSchema: {
        label: { default: "" },
        href: { default: "" },
        presetSlug: { default: "" },
      },
      content: "none",
    },
    { render: () => <PlaceholderBlock registration={spec("cta")} /> }
  )(),
};

export const articleSchema = BlockNoteSchema.create().extend({
  blockSpecs: customBlockSpecs,
});

export type ArticleEditorInstance = BlockNoteEditor<
  typeof articleSchema.blockSchema,
  typeof articleSchema.inlineContentSchema,
  typeof articleSchema.styleSchema
>;

// Re-exported for the public renderer ticket (#131) so it can enumerate the
// standard block types it must support.
export { defaultBlockSpecs };
