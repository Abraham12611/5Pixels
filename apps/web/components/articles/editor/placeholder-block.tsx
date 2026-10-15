"use client";

import type { Ref } from "react";
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
import type { ArticleBlockRegistration } from "@/lib/articles/blocks/registry";

const BLOCK_ICONS: Record<string, typeof MagicWand> = {
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
 * Typed placeholder card rendered for every 5Pixels custom block until the
 * owning ticket ships the real editor/renderer. The block type + props already
 * persist — only the visual/interaction layer is pending.
 */
export function PlaceholderBlock({
  registration,
  contentRef,
}: {
  registration: ArticleBlockRegistration;
  contentRef?: Ref<HTMLElement>;
}) {
  const Icon = BLOCK_ICONS[registration.type] ?? MagicWand;
  return (
    <div className="border-lime-500/30 bg-charcoal-850 pointer-events-auto my-1 flex w-full items-start gap-3 rounded-[15px] border border-dashed px-4 py-3 select-none">
      <span className="bg-charcoal-800 text-lime-400 mt-0.5 rounded-[10px] p-2">
        <Icon size={18} weight="duotone" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-cream-50 text-sm font-medium">
          {registration.title}
        </p>
        {contentRef ? (
          <div ref={contentRef as Ref<HTMLDivElement>} className="mt-1" />
        ) : (
          <p className="text-text-muted mt-0.5 text-xs">
            {registration.subtext}
          </p>
        )}
        <p className="text-text-muted/70 mt-1 text-[11px]">
          Full editor ships with {registration.implementedIn}
        </p>
      </div>
    </div>
  );
}
