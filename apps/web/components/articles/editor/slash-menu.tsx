"use client";

import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import {
  ArrowsLeftRight,
  Bell,
  Image as ImageIcon,
  Lightning,
  ListChecks,
  MagicWand,
  TextT,
  Toolbox,
} from "@phosphor-icons/react";
import { CUSTOM_ARTICLE_BLOCKS } from "@/lib/articles/blocks/registry";
import {
  groupForDefaultSlashItem,
  orderSlashItemsByGroup,
} from "@/lib/articles/blocks/slash-menu-groups";
import type { ArticleEditorInstance } from "./schema";

const SLASH_ICONS: Record<string, typeof MagicWand> = {
  preset: MagicWand,
  promptRecipe: TextT,
  settings: Toolbox,
  generation: ImageIcon,
  comparison: ArrowsLeftRight,
  workflow: ListChecks,
  callout: Bell,
  cta: Lightning,
};

/**
 * Full ordered slash-menu item list for the article editor:
 *   5Pixels custom blocks → Text → Media → More.
 * Custom items insert a typed block via insertOrUpdateBlockForSlashMenu (the
 * helper that replaces the trigger text and respects cursor position).
 */
export function buildArticleSlashMenuItems(
  editor: ArticleEditorInstance
): DefaultReactSuggestionItem[] {
  const custom: DefaultReactSuggestionItem[] = CUSTOM_ARTICLE_BLOCKS.map(
    (reg) => {
      const Icon = SLASH_ICONS[reg.type] ?? MagicWand;
      return {
        title: reg.title,
        subtext: reg.subtext,
        aliases: reg.aliases,
        group: reg.group,
        badge: reg.status === "placeholder" ? "Soon" : reg.badge,
        icon: <Icon size={18} weight="duotone" />,
        onItemClick: () =>
          insertOrUpdateBlockForSlashMenu(editor, { type: reg.type }),
      };
    }
  );

  const defaults = getDefaultReactSlashMenuItems(editor).map((item) => ({
    ...item,
    group: groupForDefaultSlashItem(item.title),
  }));

  return orderSlashItemsByGroup([...custom, ...defaults]);
}

/** getItems signature expected by SuggestionMenuController. */
export function articleSlashMenuItems(editor: ArticleEditorInstance) {
  return async (query: string) =>
    filterSuggestionItems(buildArticleSlashMenuItems(editor), query);
}
