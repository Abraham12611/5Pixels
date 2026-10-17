import type { ArticleBlockJson } from "./document";

/**
 * Fixture document for the editor dev harness and tests — exercises standard
 * blocks and a couple of 5Pixels placeholders.
 */
export const SAMPLE_ARTICLE_DOCUMENT: ArticleBlockJson[] = [
  {
    id: "fixture-heading-1",
    type: "heading",
    props: { level: 1 },
    content: [
      { type: "text", text: "How this look was made", styles: {} },
    ],
    children: [],
  },
  {
    id: "fixture-p-1",
    type: "paragraph",
    props: {},
    content: [
      {
        type: "text",
        text: "This article walks through the preset, settings, and workflow used to create the final image.",
        styles: {},
      },
    ],
    children: [],
  },
  {
    id: "fixture-callout-1",
    type: "callout",
    props: { tone: "tip" },
    content: [
      { type: "text", text: "Tip: start with a well-lit source photo.", styles: {} },
    ],
    children: [],
  },
  {
    id: "fixture-preset-1",
    type: "preset",
    // Unconfigured — renders the "Choose a preset" prompt in the editor and
    // documents the persisted prop contract (#127).
    props: {
      presetId: "",
      slug: "",
      selectedPublicVersionId: "",
      displayVariant: "card",
    },
    content: undefined,
    children: [],
  },
  {
    id: "fixture-workflow-1",
    type: "workflow",
    props: {},
    content: undefined,
    children: [],
  },
];
