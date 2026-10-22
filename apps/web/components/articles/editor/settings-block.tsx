"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwise,
  PencilSimple,
  Toolbox,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "../blocks/settings-card";
import { PresetPicker, type PresetPick } from "../blocks/preset-picker";
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
  parseSettingsFields,
  serializeSettingsFields,
  settingsFieldsFromPublic,
  settingsValueError,
} from "@/lib/articles/blocks/prompt-settings";
import { getFieldOptions } from "@/lib/catalog/fields";
import type { PublicProductField } from "@/types/catalog";

interface SettingsBlockProps {
  block: {
    id: string;
    props: {
      presetId: string;
      slug: string;
      fields: string;
    };
  };
  editor: BlockNoteEditor;
}

const CHOICE_TYPES = new Set([
  "select",
  "radio",
  "layout",
  "background",
  "wardrobe",
  "era",
  "mood",
]);

function ValueInput({
  row,
  field,
  onChange,
}: {
  row: { key: string; label: string; value: string };
  field: PublicProductField | undefined;
  onChange: (value: string) => void;
}) {
  const inputClass =
    "border-cream-100/10 bg-ink-900 text-cream-100 focus:border-lime-500/50 rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none w-full sm:w-44";

  if (field && CHOICE_TYPES.has(field.field_type)) {
    const options = getFieldOptions(field);
    if (options.length > 0) {
      return (
        <select
          value={row.value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${row.label} value`}
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
  }

  if (field?.field_type === "toggle") {
    return (
      <select
        value={row.value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${row.label} value`}
        className={inputClass}
      >
        <option value="On">On</option>
        <option value="Off">Off</option>
      </select>
    );
  }

  if (field?.field_type === "intensity") {
    return (
      <input
        type="number"
        value={row.value}
        min={field.config?.min as number | undefined}
        max={field.config?.max as number | undefined}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${row.label} value`}
        className={inputClass}
      />
    );
  }

  return (
    <input
      type="text"
      value={row.value}
      maxLength={200}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`${row.label} value`}
      className={inputClass}
    />
  );
}

/**
 * Settings block renderer for the article editor (#128).
 *
 * Captures an immutable, article-local snapshot of the preset's PUBLICLY
 * documented controls — rows prefill from `active_fields` via the anon-safe
 * editorial RPC and each author override is validated against that same
 * public control schema. Nothing private can enter the snapshot.
 */
export function SettingsBlock({ block, editor }: SettingsBlockProps) {
  const { presetId, fields } = block.props;
  const editable = editor.isEditable;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [card, setCard] = useState<PresetCardData | null>(null);
  const [editorial, setEditorial] = useState<ProductEditorial | null>(null);

  const updateProps = useCallback(
    (props: Partial<SettingsBlockProps["block"]["props"]>) => {
      editor.updateBlock(block, { props: { ...block.props, ...props } });
    },
    [editor, block]
  );

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

  const rows = parseSettingsFields(fields);
  const fieldByKey = new Map(
    (editorial?.activeFields ?? []).map((f) => [f.field_key, f])
  );

  const onPick = useCallback(
    async (pick: PresetPick) => {
      const result = await fetchProductEditorial(pick.presetId);
      const ed = result.editorial;
      setEditorial(ed);
      updateProps({
        presetId: pick.presetId,
        slug: pick.slug,
        fields: ed ? serializeSettingsFields(settingsFieldsFromPublic(ed.activeFields)) : "",
      });
    },
    [updateProps]
  );

  const setRowValue = useCallback(
    (key: string, value: string) => {
      const next = rows.map((r) => (r.key === key ? { ...r, value } : r));
      updateProps({ fields: serializeSettingsFields(next) });
    },
    [rows, updateProps]
  );

  const resetRows = useCallback(() => {
    if (!editorial) return;
    updateProps({
      fields: serializeSettingsFields(
        settingsFieldsFromPublic(editorial.activeFields)
      ),
    });
  }, [editorial, updateProps]);

  const picker = pickerOpen ? (
    <PresetPicker open onOpenChange={setPickerOpen} onPick={onPick} />
  ) : null;

  if (!presetId) {
    return (
      <div className="border-cream-100/15 bg-charcoal-850 pointer-events-auto my-1 w-full rounded-[15px] border border-dashed px-4 py-6 select-none">
        <div className="flex flex-col items-center gap-2">
          <Toolbox size={22} className="text-text-muted" weight="duotone" />
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
                Readers see a table of that preset&rsquo;s documented
                controls with example values.
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
      <SettingsCard
        presetName={card?.name ?? editorial?.name ?? null}
        presetHref={card?.href ?? null}
        rows={rows}
      />

      {editable && (
        <div className="border-cream-100/10 bg-charcoal-850/60 -mt-px rounded-b-xl border border-t-0 px-4 py-3">
          {rows.length > 0 ? (
            <div className="space-y-2">
              {rows.map((row) => {
                const field = fieldByKey.get(row.key);
                const error = field
                  ? settingsValueError(field, row.value)
                  : null;
                return (
                  <div
                    key={row.key}
                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="text-cream-100 w-40 shrink-0 text-sm font-medium">
                      {row.label}
                    </span>
                    <div className="flex-1">
                      <ValueInput
                        row={row}
                        field={field}
                        onChange={(v) => setRowValue(row.key, v)}
                      />
                      {!field ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-300">
                          <Warning size={11} aria-hidden />
                          No longer a documented control — kept as written.
                        </p>
                      ) : error ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-300">
                          <Warning size={11} aria-hidden />
                          {error}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text-muted text-xs">
              This preset exposes no documented controls — the card shows a
              &ldquo;default settings&rdquo; note to readers.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1"
            >
              <PencilSimple size={12} aria-hidden /> Change preset
            </button>
            {editorial && rows.length > 0 && (
              <button
                type="button"
                onClick={resetRows}
                className="text-text-muted hover:text-cream-100 inline-flex items-center gap-1"
              >
                <ArrowClockwise size={12} aria-hidden /> Reset to documented
                defaults
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
              The linked preset is no longer public — the settings snapshot
              still renders, without a preset link.
            </p>
          )}
        </div>
      )}
      {picker}
    </div>
  );
}
