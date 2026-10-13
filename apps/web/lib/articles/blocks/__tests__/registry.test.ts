import { describe, expect, it } from "vitest";
import {
  ARTICLE_CUSTOM_PROP_SCHEMAS,
  CUSTOM_ARTICLE_BLOCKS,
  isCustomArticleBlockType,
} from "../registry";
import {
  groupForDefaultSlashItem,
  MEDIA_ITEM_TITLES,
  orderSlashItemsByGroup,
  SLASH_MENU_GROUP_ORDER,
  TEXT_ITEM_TITLES,
} from "../slash-menu-groups";

describe("article block registry", () => {
  it("registers every MVP 5Pixels block in the spec'd slash order", () => {
    const titles = CUSTOM_ARTICLE_BLOCKS.map((b) => b.title);
    expect(titles).toEqual([
      "Preset",
      "Prompt Recipe",
      "Settings",
      "Generation",
      "Before/After",
      "Workflow",
      "Callout",
      "Call to Action",
    ]);
    for (const b of CUSTOM_ARTICLE_BLOCKS) {
      expect(b.group).toBe("5Pixels");
      expect(ARTICLE_CUSTOM_PROP_SCHEMAS[b.type]).toBeDefined();
      expect(b.implementedIn).toMatch(/^#\d+$/);
    }
  });

  it("marks custom types and leaves standard blocks alone", () => {
    expect(isCustomArticleBlockType("preset")).toBe(true);
    expect(isCustomArticleBlockType("paragraph")).toBe(false);
  });
});

describe("slash menu grouping", () => {
  it("puts spec'd groups in the required order", () => {
    expect(SLASH_MENU_GROUP_ORDER).toEqual([
      "5Pixels",
      "Text",
      "Media",
      "More",
    ]);
  });

  it("classifies the standard text blocks", () => {
    for (const t of [
      "Paragraph",
      "Heading 1",
      "Heading 4",
      "Bullet List",
      "Numbered List",
      "Check List",
      "Quote",
      "Code Block",
    ]) {
      expect(TEXT_ITEM_TITLES.has(t)).toBe(true);
      expect(groupForDefaultSlashItem(t)).toBe("Text");
    }
  });

  it("classifies media-ish defaults and falls back to More for unknown items", () => {
    for (const t of ["Image", "Video", "Table", "Divider"]) {
      expect(MEDIA_ITEM_TITLES.has(t)).toBe(true);
      expect(groupForDefaultSlashItem(t)).toBe("Media");
    }
    expect(groupForDefaultSlashItem("Some Future Block")).toBe("More");
  });

  it("orders items so same-group entries are adjacent", () => {
    const items = [
      { title: "a", group: "Text" },
      { title: "b", group: "5Pixels" },
      { title: "c", group: "Media" },
      { title: "d", group: "Text" },
      { title: "e", group: "5Pixels" },
    ];
    const ordered = orderSlashItemsByGroup(items);
    expect(ordered.map((i) => i.title)).toEqual(["b", "e", "a", "d", "c"]);
    // every group's items form one contiguous run
    const groups = ordered.map((i) => i.group);
    expect(new Set(groups.slice(0, 2)).size).toBe(1);
    expect(new Set(groups.slice(2, 4)).size).toBe(1);
    expect(groups[4]).toBe("Media");
  });
});
