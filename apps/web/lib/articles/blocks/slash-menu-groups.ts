/**
 * Slash-menu grouping for the article editor.
 *
 * Default BlockNote slash items carry no block-type key once wrapped for
 * React, so grouping works on their (English) titles. Custom 5Pixels items
 * declare their group in the registry.
 *
 * Order is contractual (issue #125): 5Pixels → Text → Media → anything new
 * lands in "More" so an unexpected upstream item can never silently drop.
 */

export type SlashMenuGroup = "5Pixels" | "Text" | "Media" | "More";

export const SLASH_MENU_GROUP_ORDER: SlashMenuGroup[] = [
  "5Pixels",
  "Text",
  "Media",
  "More",
];

/** Default-item titles (en locale) belonging to the Text group. */
export const TEXT_ITEM_TITLES = new Set([
  "Paragraph",
  "Heading 1",
  "Heading 2",
  "Heading 3",
  "Heading 4",
  "Toggle Heading 1",
  "Toggle Heading 2",
  "Toggle Heading 3",
  "Bullet List",
  "Numbered List",
  "Check List",
  "Toggle List",
  "Quote",
  "Code Block",
]);

/** Default-item titles belonging to the Media group. */
export const MEDIA_ITEM_TITLES = new Set([
  "Image",
  "Video",
  "Audio",
  "File",
  "Table",
  "Divider",
  "Emoji",
  "Embed",
  "Page Break",
]);

export function groupForDefaultSlashItem(
  title: string
): Exclude<SlashMenuGroup, "5Pixels"> {
  if (TEXT_ITEM_TITLES.has(title)) return "Text";
  if (MEDIA_ITEM_TITLES.has(title)) return "Media";
  return "More";
}

/**
 * Stable group ordering — returns a copy sorted so every item sharing a group
 * is adjacent (BlockNote renders same-named groups separately unless their
 * items are contiguous). Original order is preserved inside each group.
 */
export function orderSlashItemsByGroup<
  T extends { group?: string }
>(items: T[]): T[] {
  const rank: Map<string, number> = new Map(
    SLASH_MENU_GROUP_ORDER.map((g, i) => [g, i] as const)
  );
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        (rank.get(a.item.group ?? "") ?? rank.size) -
          (rank.get(b.item.group ?? "") ?? rank.size) ||
        a.index - b.index
    )
    .map(({ item }) => item);
}
