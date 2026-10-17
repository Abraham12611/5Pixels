"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cube,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { Button } from "@/components/ui/button";
import { ArticlePresetCard } from "../blocks/preset-card";
import {
  PresetPicker,
  type PresetPick,
} from "../blocks/preset-picker";
import { fetchCatalogPage } from "@/lib/catalog/browser";
import {
  isPinnedVersionStale,
  presetCardDataFromProduct,
  type PresetCardData,
} from "@/lib/articles/preset-card";

interface PresetBlockProps {
  block: {
    id: string;
    props: {
      presetId: string;
      slug: string;
      selectedPublicVersionId: string;
      displayVariant: string;
    };
  };
  editor: BlockNoteEditor;
}

/**
 * Preset block renderer for the article editor (#127).
 *
 * The block stores only references (products.id, cached slug, optional
 * version pin, display variant). Card data always resolves live from the
 * public catalog RPC — so a retired preset degrades to the safe fallback
 * and a stale slug can never surface wrong copy. Readers get the same
 * ArticlePresetCard; this component adds the authoring chrome around it.
 */
export function PresetBlock({ block, editor }: PresetBlockProps) {
  const { presetId, selectedPublicVersionId, displayVariant } = block.props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [card, setCard] = useState<PresetCardData | null>(null);
  const [missing, setMissing] = useState(false);
  // Staff preview renders this same block read-only — the authoring chrome
  // (Choose/Change/Remove) must disappear; the reader card stays identical.
  const editable = editor.isEditable;

  useEffect(() => {
    if (!presetId) return;
    let alive = true;
    void (async () => {
      const { products } = await fetchCatalogPage({
        productIds: [presetId],
        pageSize: 1,
      });
      if (!alive) return;
      const product = products[0];
      setCard(product ? presetCardDataFromProduct(product) : null);
      setMissing(!product);
    })();
    return () => {
      alive = false;
    };
  }, [presetId]);

  const updateProps = useCallback(
    (props: Partial<PresetBlockProps["block"]["props"]>) => {
      editor.updateBlock(block, { props: { ...block.props, ...props } });
    },
    [editor, block]
  );

  const onPick = useCallback(
    (pick: PresetPick) => {
      updateProps({
        presetId: pick.presetId,
        slug: pick.slug,
        selectedPublicVersionId: pick.publicVersionId ?? "",
      });
      setMissing(false);
    },
    [updateProps]
  );

  // The picker mounts only while open — every open is a fresh instance,
  // so pick state, search and in-flight fetches never leak between opens.
  const picker = pickerOpen ? (
    <PresetPicker open onOpenChange={setPickerOpen} onPick={onPick} />
  ) : null;

  if (!presetId) {
    return (
      <div className="border-cream-100/15 bg-charcoal-850 pointer-events-auto my-1 w-full rounded-[15px] border border-dashed px-4 py-6 select-none">
        <div className="flex flex-col items-center gap-2">
          <Cube size={22} className="text-text-muted" weight="duotone" />
          {editable ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
              >
                Choose a preset
              </Button>
              <p className="text-text-muted text-xs">
                Readers see a Try this look card for the preset you pick.
              </p>
            </>
          ) : (
            <p className="text-text-muted text-xs">No preset selected.</p>
          )}
        </div>
        {picker}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto my-1 w-full select-none">
      <ArticlePresetCard
        preset={card}
        variant={displayVariant === "compact" ? "compact" : "card"}
        pinnedVersionStale={
          card ? isPinnedVersionStale(card, selectedPublicVersionId) : false
        }
      />
      {editable && (
        <div className="text-text-muted mt-1.5 flex items-center justify-between text-xs">
          <span>
            {missing
              ? "This preset is no longer published — it renders as a safe placeholder until you change or remove it."
              : "Preset embed"}
          </span>
          <span className="inline-flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1"
            >
              <PencilSimple size={12} /> Change preset
            </button>
            <button
              type="button"
              onClick={() => editor.removeBlocks([block])}
              className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1"
            >
              <Trash size={12} /> Remove
            </button>
          </span>
        </div>
      )}
      {picker}
    </div>
  );
}
