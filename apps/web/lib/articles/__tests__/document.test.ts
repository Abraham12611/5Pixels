import { describe, expect, it } from "vitest";
import {
  ARTICLE_MAX_BLOCKS,
  deserializeArticleDocument,
  isArticleDocumentEmpty,
  serializeArticleDocument,
  validateArticleDocument,
} from "../document";
import { SAMPLE_ARTICLE_DOCUMENT } from "../sample-document";

describe("article document validation", () => {
  it("accepts the fixture document and applies prop defaults", () => {
    const result = validateArticleDocument(SAMPLE_ARTICLE_DOCUMENT);
    expect(result.ok).toBe(true);
    const callout = result.document!.find((b) => b.type === "callout")!;
    expect(callout.props?.tone).toBe("tip");
  });

  it("round-trips serialize → deserialize without losing ids/props/blocks", () => {
    const json = serializeArticleDocument(SAMPLE_ARTICLE_DOCUMENT);
    const restored = deserializeArticleDocument(JSON.parse(json));
    expect(restored).toEqual(
      validateArticleDocument(SAMPLE_ARTICLE_DOCUMENT).document
    );
    // IDs, custom block types and props survive the round trip.
    expect(restored.map((b) => b.id)).toEqual(
      SAMPLE_ARTICLE_DOCUMENT.map((b) => b.id)
    );
    expect(restored.find((b) => b.type === "preset")!.props).toEqual({
      productSlug: "film-grain-portrait",
    });
  });

  it("rejects invalid custom-block props at the validation boundary", () => {
    const bad = [
      {
        type: "comparison",
        props: { mode: "hologram" }, // not in the enum
        children: [],
      },
    ];
    const result = validateArticleDocument(bad);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("comparison");
  });

  it("lets unknown block types pass through structurally (safe degradation)", () => {
    const doc = [
      {
        type: "futureBlockFromATicket",
        props: { anything: true },
        children: [],
      },
    ];
    expect(validateArticleDocument(doc).ok).toBe(true);
  });

  it("accepts BlockNote TableContent objects and rejects malformed content", () => {
    const table = [
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [null, null],
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [{ type: "text", text: "a", styles: {} }],
                  props: { colspan: 1, rowspan: 1 },
                },
                {
                  type: "tableCell",
                  content: [{ type: "text", text: "b", styles: {} }],
                  props: { colspan: 1, rowspan: 1 },
                },
              ],
            },
          ],
        },
        children: [],
      },
    ];
    expect(validateArticleDocument(table).ok).toBe(true);
    // Object content that isn't a TableContent must still fail.
    expect(
      validateArticleDocument([
        { type: "paragraph", content: { type: "weirdObject" }, children: [] },
      ]).ok
    ).toBe(false);
    expect(
      validateArticleDocument([
        {
          type: "table",
          content: { type: "tableContent", rows: [{ noCells: true }] },
          children: [],
        },
      ]).ok
    ).toBe(false);
    expect(
      validateArticleDocument([
        { type: "paragraph", content: "a string", children: [] },
      ]).ok
    ).toBe(false);
  });

  it("rejects non-array content and missing block types", () => {
    expect(validateArticleDocument({ type: "paragraph" }).ok).toBe(false);
    expect(validateArticleDocument([{ children: [] }]).ok).toBe(false);
    expect(validateArticleDocument([{ type: "" }]).ok).toBe(false);
  });

  it("enforces the block-count bound", () => {
    const big = Array.from({ length: ARTICLE_MAX_BLOCKS + 1 }, (_, i) => ({
      id: `b${i}`,
      type: "paragraph",
      content: [],
      children: [],
    }));
    expect(validateArticleDocument(big).ok).toBe(false);
  });

  it("enforces the nesting-depth bound", () => {
    let deep: Record<string, unknown> = { type: "paragraph", content: [] };
    for (let i = 0; i < 10; i++) {
      deep = { type: "paragraph", content: [], children: [deep] };
    }
    const result = validateArticleDocument([deep]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("nesting depth");
  });

  it("detects empty vs non-empty documents", () => {
    expect(isArticleDocumentEmpty([])).toBe(true);
    expect(
      isArticleDocumentEmpty([
        { type: "paragraph", content: [], children: [] },
        { type: "paragraph", content: undefined, children: [] },
      ])
    ).toBe(true);
    expect(
      isArticleDocumentEmpty([
        {
          type: "paragraph",
          content: [{ type: "text", text: "hi", styles: {} }],
          children: [],
        },
      ])
    ).toBe(false);
  });
});
