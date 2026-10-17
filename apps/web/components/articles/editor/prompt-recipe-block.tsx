"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwise,
  Paperclip,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { PromptRecipeCard } from "../blocks/prompt-recipe-card";
import { PresetPicker, type PresetPick } from "../blocks/preset-picker";
import { GenerationChooser } from "../media/generation-chooser";
import {
  fetchCatalogPage,
  fetchProductEditorial,
  type ProductEditorial,
} from "@/lib/catalog/browser";
import {
  presetCardDataFromProduct,
  type PresetCardData,
} from "@/lib/articles/preset-card";
import {
  buildRecipeTemplate,
  parsePromptReferences,
  PROMPT_RECIPE_MAX_LENGTH,
  serializePromptReferences,
  type PromptReference,
} from "@/lib/articles/blocks/prompt-settings";
import { useArticleMediaContext } from "./article-media-context";

interface PromptRecipeBlockProps {
  block: {
    id: string;
    props: {
      presetId: string;
      slug: string;
      recipeText: string;
      source: string;
      capturedAt: string;
      references: string;
      // Legacy props from pre-#128 documents.
      recipe: string;
      presetSlug: string;
    };
  };
  editor: BlockNoteEditor;
}

/**
 * Prompt-recipe block renderer for the article editor (#128).
 *
 * The block stores an article-local recipe snapshot — prefilled ONLY from
 * the preset's approved `public_prompt_recipe` (or a labelled public-safe
 * template), then freely editable. Private generation prompts never touch
 * this component: the only catalog read is the anon-safe editorial RPC.
 */
export function PromptRecipeBlock({ block, editor }: PromptRecipeBlockProps) {
  const { articleId } = useArticleMediaContext();
  const {
    presetId,
    recipeText,
    source,
    capturedAt,
    references,
    recipe: legacyRecipe,
    presetSlug,
  } = block.props;
  const editable = editor.isEditable;
  // Pre-#128 documents stored the text in `recipe` — surface it until the
  // author edits, at which point recipeText takes over.
  const effectiveText = recipeText || legacyRecipe || "";

  const [pickerOpen, setPickerOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [card, setCard] = useState<PresetCardData | null>(null);
  const [editorial, setEditorial] = useState<ProductEditorial | null>(null);

  const updateProps = useCallback(
    (props: Partial<PromptRecipeBlockProps["block"]["props"]>) => {
      editor.updateBlock(block, { props: { ...block.props, ...props } });
    },
    [editor, block]
  );

  // Resolve the linked preset's card + editorial payload from public RPCs.
  useEffect(() => {
    if (!presetId) return;
    let alive = true;
    void (async () => {
      const [{ products }, editorialResult] = await Promise.all([
        fetchCatalogPage({ productIds: [presetId], pageSize: 1 }),
        fetchProductEditorial(presetId),
      ]);
      if (!alive) return;
      const product = products[0];
      setCard(product ? presetCardDataFromProduct(product) : null);
      setEditorial(editorialResult.editorial);
    })();
    return () => {
      alive = false;
    };
  }, [presetId]);

  const refs = parsePromptReferences(references);

  const applyPrefill = useCallback(
    (next: { presetId: string; slug: string }, ed: ProductEditorial | null) => {
      const approved = ed?.publicPromptRecipe?.trim();
      const text = approved
        ? approved
        : ed
          ? buildRecipeTemplate({
              name: ed.name,
              shortDescription: ed.shortDescription,
              fields: ed.activeFields,
            })
          : "";
      updateProps({
        ...next,
        ...(text
          ? {
              recipeText: text,
              source: "approved_template",
              capturedAt: new Date().toISOString(),
            }
          : {}),
      });
    },
    [updateProps]
  );

  const onPick = useCallback(
    async (pick: PresetPick) => {
      const result = await fetchProductEditorial(pick.presetId);
      setEditorial(result.editorial);
      applyPrefill({ presetId: pick.presetId, slug: pick.slug }, result.editorial);
    },
    [applyPrefill]
  );

  const addReference = useCallback(
    (ref: PromptReference) => {
      const next = [...refs, ref].slice(0, 10);
      updateProps({ references: serializePromptReferences(next) });
    },
    [refs, updateProps]
  );

  const removeReference = useCallback(
    (index: number) => {
      const next = refs.filter((_, i) => i !== index);
      updateProps({ references: serializePromptReferences(next) });
    },
    [refs, updateProps]
  );

  const renameReference = useCallback(
    (index: number, label: string) => {
      const next = refs.map((r, i) => (i === index ? { ...r, label } : r));
      updateProps({ references: serializePromptReferences(next) });
    },
    [refs, updateProps]
  );

  const approvedRecipe = editorial?.publicPromptRecipe?.trim();
  const recipeDiffers =
    Boolean(approvedRecipe) && effectiveText.trim() !== approvedRecipe;

  const picker = pickerOpen ? (
    <PresetPicker open onOpenChange={setPickerOpen} onPick={onPick} />
  ) : null;
  const chooser = chooserOpen ? (
    <GenerationChooser
      open
      onOpenChange={setChooserOpen}
      articleId={articleId}
      onPick={(pick) => {
        const id = pick.assetId ?? pick.generationId;
        addReference({
          id,
          kind: pick.assetId ? "asset" : "generation",
          label: `Reference ${refs.length + 1}`,
        });
      }}
    />
  ) : null;

  return (
    <div className="pointer-events-auto my-1 w-full select-none">
      <PromptRecipeCard
        recipeText={effectiveText}
        source={source === "approved_template" ? "approved_template" : "manual"}
        capturedAt={capturedAt || undefined}
        presetName={card?.name ?? null}
        presetHref={
          card?.href ??
          (/^[a-z0-9-]{1,120}$/.test(presetSlug) ? `/presets/${presetSlug}` : null)
        }
        references={refs}
      />

      {editable && (
        <div className="border-cream-100/10 bg-charcoal-850/60 -mt-px rounded-b-xl border border-t-0 px-4 py-3">
          {/* Editable recipe text — the article-local snapshot. */}
          <label className="text-text-muted block text-xs font-medium">
            Recipe text
            <textarea
              value={effectiveText}
              maxLength={PROMPT_RECIPE_MAX_LENGTH}
              onChange={(e) =>
                updateProps({ recipeText: e.target.value, source: "manual" })
              }
              rows={Math.min(10, Math.max(3, effectiveText.split("\n").length))}
              placeholder="Write the steps/creative prompt you used."
              className="border-cream-100/10 bg-ink-900 text-cream-100 focus:border-lime-500/50 mt-1.5 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none"
            />
          </label>
          <div className="text-text-muted mt-1 flex items-center justify-between text-[11px]">
            <span>
              {source === "approved_template"
                ? "Prefilled from the preset's public recipe — edits mark it as written for this article."
                : "Written for this article."}
            </span>
            <span className="tabular-nums">
              {effectiveText.length}/{PROMPT_RECIPE_MAX_LENGTH}
            </span>
          </div>

          {/* Reference chips */}
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              {refs.map((ref, i) => (
                <span
                  key={`${ref.kind}-${ref.id}-${i}`}
                  className="border-cream-100/10 bg-charcoal-800 inline-flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-xs"
                >
                  <Paperclip size={11} className="text-text-muted" aria-hidden />
                  <input
                    value={ref.label}
                    onChange={(e) => renameReference(i, e.target.value)}
                    aria-label={`Reference ${i + 1} label`}
                    className="text-text-secondary w-24 bg-transparent text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeReference(i)}
                    aria-label={`Remove reference ${i + 1}`}
                    className="text-text-muted hover:text-cream-100 rounded-full p-0.5"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {refs.length < 10 && (
                <button
                  type="button"
                  onClick={() => setChooserOpen(true)}
                  disabled={!articleId}
                  className="border-cream-100/10 text-text-muted hover:text-cream-100 hover:border-lime-500/40 inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
                >
                  <Plus size={11} aria-hidden />
                  {articleId ? "Add reference" : "Save article to add references"}
                </button>
              )}
            </div>
            <p className="text-text-muted mt-1.5 text-[11px]">
              References are your published images or shared generations —
              readers see them as labelled chips, never private storage links.
            </p>
          </div>

          {/* Actions row */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1"
            >
              <PencilSimple size={12} aria-hidden />
              {presetId ? "Change linked preset" : "Link a preset"}
            </button>
            {recipeDiffers && (
              <button
                type="button"
                onClick={() =>
                  updateProps({
                    recipeText: approvedRecipe!,
                    source: "approved_template",
                    capturedAt: new Date().toISOString(),
                  })
                }
                className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1"
              >
                <ArrowClockwise size={12} aria-hidden />
                Reset to preset recipe
              </button>
            )}
            <button
              type="button"
              onClick={() => editor.removeBlocks([block])}
              className="text-text-muted hover:text-cream-100 ml-auto inline-flex items-center gap-1"
            >
              <Trash size={12} aria-hidden /> Remove
            </button>
          </div>
          {presetId && !card && (
            <p className="text-text-muted mt-2 text-[11px]">
              The linked preset is no longer public — readers see the recipe
              without a preset link.
            </p>
          )}
        </div>
      )}
      {picker}
      {chooser}
    </div>
  );
}
