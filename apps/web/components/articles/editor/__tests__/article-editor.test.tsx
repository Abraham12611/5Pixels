import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "@blocknote/core";
import { ArticleEditor } from "../article-editor";
import { buildArticleSlashMenuItems } from "../slash-menu";
import { articleSchema } from "../schema";
import { SAMPLE_ARTICLE_DOCUMENT } from "@/lib/articles/sample-document";
import { deserializeArticleDocument } from "@/lib/articles/document";

/**
 * Editor shell smoke tests — prove the BlockNote + shadcn stack mounts with
 * the fixture document, the custom schema registers, and the slash-menu
 * builder produces the spec'd grouping. Real-browser interaction is covered
 * by the staff-only dev harness (/admin/articles/dev).
 */
describe("ArticleEditor", () => {
  it("mounts the BlockNote editor with fixture content", () => {
    render(
      <ArticleEditor
        initialDocument={SAMPLE_ARTICLE_DOCUMENT}
        initialTitle="Fixture article"
        editVersion={3}
      />
    );

    expect(screen.getByLabelText("Article title")).toHaveValue(
      "Fixture article"
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(document.querySelector(".bn-editor")).toBeInTheDocument();
  });

  it("renders custom 5Pixels placeholder blocks from the fixture", async () => {
    render(
      <ArticleEditor initialDocument={SAMPLE_ARTICLE_DOCUMENT} editVersion={0} />
    );
    // Custom blocks render through React portals — they land a tick later.
    const placeholders = await screen.findAllByText(/Full editor ships with #/);
    // All 3 fixture custom blocks (callout, preset, workflow).
    expect(placeholders.length).toBe(3);
  });

  it("headless editor accepts the schema and round-trips documents", () => {
    const editor = BlockNoteEditor.create({
      schema: articleSchema,
      initialContent: SAMPLE_ARTICLE_DOCUMENT as never,
    });
    const json = JSON.parse(JSON.stringify(editor.document));
    // Persisted shape survives the canonical validation path.
    expect(() => deserializeArticleDocument(json)).not.toThrow();
    const types = new Set(
      (json as { type: string }[]).map((b) => b.type)
    );
    expect(types.has("preset")).toBe(true);
    expect(types.has("callout")).toBe(true);
  });

  it("slash menu lists all 8 5Pixels blocks first, in spec order", () => {
    const editor = BlockNoteEditor.create({ schema: articleSchema });
    const items = buildArticleSlashMenuItems(editor as never);

    const custom = items.filter((i) => i.group === "5Pixels");
    expect(custom.map((i) => i.title)).toEqual([
      "Preset",
      "Prompt Recipe",
      "Settings",
      "Generation",
      "Before/After",
      "Workflow",
      "Callout",
      "Call to Action",
    ]);

    // Group adjacency: first non-5Pixels group is Text; no 5Pixels item later.
    const firstNonCustom = items.findIndex((i) => i.group !== "5Pixels");
    expect(items[firstNonCustom]?.group).toBe("Text");
    expect(
      items.slice(firstNonCustom).some((i) => i.group === "5Pixels")
    ).toBe(false);
    expect(items.some((i) => i.group === "Media")).toBe(true);
  });
});
