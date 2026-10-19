"use client";

import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichSelect } from "@/components/ui/rich-select";
import { optionalNumberInput } from "./form-utils";
import type { ProductCreateInput } from "@5pixels/shared";

type FieldItem = ProductCreateInput["fields"][number];

const FIELD_TYPES = [
  { value: "short_text", label: "Short text", description: "Free text input" },
  { value: "select", label: "Select", description: "Dropdown of options" },
  { value: "radio", label: "Radio", description: "Visible option pills" },
  { value: "toggle", label: "Toggle", description: "On/off switch" },
  { value: "color", label: "Color", description: "Hex color picker" },
  { value: "aspect_ratio", label: "Aspect ratio", description: "Output proportions" },
  { value: "intensity", label: "Intensity", description: "Numeric slider" },
  { value: "layout", label: "Layout", description: "Composition options" },
  { value: "background", label: "Background", description: "Backdrop options" },
  { value: "wardrobe", label: "Wardrobe", description: "Outfit options" },
  { value: "era", label: "Era", description: "Time-period options" },
  { value: "mood", label: "Mood", description: "Tone options" },
] as const;

const CHOICE_TYPES = ["select", "radio", "layout", "background", "wardrobe", "era", "mood"];
const RANGE_TYPES = ["intensity"];

/**
 * Next never-before-used `field_${n}` key (#223). Counting from
 * `fields.length + 1` collided after a remove-then-add; reusing the smallest
 * free number could resurrect a deleted key's stored values, so scan for the
 * largest numeric suffix instead and guarantee uniqueness.
 */
function nextFieldKey(existing: FieldItem[]): string {
  const used = new Set(
    existing.map((f) => (f.field_key ?? "").trim().toLowerCase())
  );
  let n =
    existing.reduce((max, f) => {
      const m = /^field_(\d+)$/.exec(f.field_key ?? "");
      return m ? Math.max(max, parseInt(m[1] ?? "0", 10)) : max;
    }, 0) + 1;
  while (used.has(`field_${n}`)) n += 1;
  return `field_${n}`;
}

export function FieldEditor() {
  const {
    control,
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<ProductCreateInput>();
  const { fields, append, remove, move, insert } = useFieldArray({
    control,
    name: "fields",
  });
  const [undo, setUndo] = useState<{ index: number; field: FieldItem } | null>(
    null
  );

  /** Position IS the persisted order: after every structural change,
   *  sort_order is rewritten to the row index so saved data reloads in the
   *  same sequence the admin sees. */
  const normalizeSortOrder = () => {
    (getValues("fields") ?? []).forEach((f, i) => {
      if (f.sort_order !== i) {
        setValue(`fields.${i}.sort_order`, i, { shouldDirty: true });
      }
    });
  };

  const addField = () => {
    setUndo(null);
    append({
      field_key: nextFieldKey(getValues("fields") ?? []),
      label: "New field",
      field_type: "short_text",
      required: false,
      sort_order: fields.length,
      config: {},
      validation: {},
      active: true,
    });
    normalizeSortOrder();
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setUndo(null);
    move(index, index + direction);
    normalizeSortOrder();
  };

  const removeField = (index: number) => {
    const snapshot = getValues(`fields.${index}`);
    remove(index);
    normalizeSortOrder();
    setUndo(snapshot ? { index, field: snapshot } : null);
  };

  const undoRemove = () => {
    if (!undo) return;
    insert(Math.min(undo.index, fields.length), undo.field);
    setUndo(null);
    normalizeSortOrder();
  };

  // Duplicate keys break option wiring — flag them inline (normalized, so
  // "Title" and "title" count as the same collision).
  const watchedFields = watch("fields") ?? [];
  const keyCounts = new Map<string, number>();
  for (const f of watchedFields) {
    const k = (f?.field_key ?? "").trim().toLowerCase();
    if (k) keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-cream-50 text-lg font-semibold">User controls</h2>
        <Button type="button" variant="secondary" onClick={addField}>
          Add field
        </Button>
      </div>

      {undo && (
        <div
          role="status"
          className="border-warning/40 bg-warning/10 text-warning flex items-center justify-between gap-3 rounded-xl border px-4 py-2 text-sm"
        >
          <span>
            Removed &ldquo;{undo.field.label || undo.field.field_key}&rdquo;.
          </span>
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={undoRemove}
              className="font-medium underline"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setUndo(null)}
              aria-label="Dismiss"
              className="text-warning/80 hover:text-warning"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {fields.length === 0 && (
        <p className="text-text-secondary text-sm">
          No fields configured. Users will see no adjustable controls for this preset.
        </p>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => {
          const normalized = (watchedFields[index]?.field_key ?? "")
            .trim()
            .toLowerCase();
          return (
            <FieldRow
              key={field.id}
              index={index}
              total={fields.length}
              onMove={(dir) => moveField(index, dir)}
              onRemove={() => removeField(index)}
              duplicateKey={
                normalized.length > 0 && (keyCounts.get(normalized) ?? 0) > 1
              }
              rowErrors={errors.fields?.[index]}
              register={register}
              watch={watch}
              setValue={setValue}
            />
          );
        })}
      </div>
    </div>
  );
}

interface FieldRowProps {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  duplicateKey: boolean;
  rowErrors?: {
    label?: { message?: string };
    field_key?: { message?: string };
  };
  register: ReturnType<typeof useFormContext<ProductCreateInput>>["register"];
  watch: ReturnType<typeof useFormContext<ProductCreateInput>>["watch"];
  setValue: ReturnType<typeof useFormContext<ProductCreateInput>>["setValue"];
}

function FieldRow({
  index,
  total,
  onMove,
  onRemove,
  duplicateKey,
  rowErrors,
  register,
  watch,
  setValue,
}: FieldRowProps) {
  const fieldType = watch(`fields.${index}.field_type`);
  const isChoiceType = CHOICE_TYPES.includes(fieldType);
  const isRangeType = RANGE_TYPES.includes(fieldType);

  return (
    <div className="border-cream-100/10 bg-charcoal-800 rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-text-muted text-xs">
          Control {index + 1} of {total}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            aria-label={`Move control ${index + 1} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Move control ${index + 1} down`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={14} />
          </Button>
          <Button type="button" variant="destructive" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      {/* Row 1: label, key, type */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label htmlFor={`fields.${index}.label`}>Label</Label>
          <Input
            id={`fields.${index}.label`}
            {...register(`fields.${index}.label`)}
            className="mt-1"
            aria-invalid={Boolean(rowErrors?.label)}
          />
          {rowErrors?.label?.message && (
            <p className="text-error mt-1 text-sm">{rowErrors.label.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor={`fields.${index}.field_key`}>Key</Label>
          <Input
            id={`fields.${index}.field_key`}
            {...register(`fields.${index}.field_key`)}
            className="mt-1"
            placeholder="e.g. background"
            aria-invalid={Boolean(rowErrors?.field_key) || duplicateKey}
          />
          {rowErrors?.field_key?.message && (
            <p className="text-error mt-1 text-sm">
              {rowErrors.field_key.message}
            </p>
          )}
          {duplicateKey && (
            <p className="text-error mt-1 text-sm">
              Another control already uses this key.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={`fields.${index}.field_type`}>Type</Label>
          <div className="mt-1">
            <RichSelect
              id={`fields.${index}.field_type`}
              aria-label={`Field type for ${watch(`fields.${index}.label`) || `field ${index + 1}`}`}
              value={fieldType}
              onValueChange={(v) =>
                setValue(
                  `fields.${index}.field_type`,
                  v as ProductCreateInput["fields"][number]["field_type"],
                  { shouldDirty: true }
                )
              }
              options={FIELD_TYPES.map((t) => ({
                value: t.value,
                label: t.label,
                description: t.description,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Row 2: help_text, required */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label htmlFor={`fields.${index}.help_text`}>Help text</Label>
          <Input
            id={`fields.${index}.help_text`}
            {...register(`fields.${index}.help_text`)}
            className="mt-1"
            placeholder="Optional guidance shown to users"
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="text-cream-50 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register(`fields.${index}.required`)}
              className="h-4 w-4 rounded text-lime-500"
            />
            Required
          </label>
        </div>
      </div>

      {/* Row 3: type-specific config */}
      {isChoiceType && (
        <ChoiceOptionsEditor index={index} watch={watch} setValue={setValue} />
      )}

      {isRangeType && (
        <RangeConfigEditor index={index} register={register} watch={watch} />
      )}

      {fieldType === "color" && (
        <div className="mt-4">
          <Label htmlFor={`fields.${index}.config.default`}>Default color</Label>
          <Input
            id={`fields.${index}.config.default`}
            type="text"
            {...register(`fields.${index}.config.default`)}
            className="mt-1"
            placeholder="#82ea3a"
          />
        </div>
      )}

      {fieldType === "aspect_ratio" && (
        <div className="mt-4">
          <Label htmlFor={`fields.${index}.config.default`}>
            Default aspect ratio
          </Label>
          <Input
            id={`fields.${index}.config.default`}
            type="text"
            {...register(`fields.${index}.config.default`)}
            className="mt-1"
            placeholder="1:1"
          />
        </div>
      )}

      {fieldType === "toggle" && (
        <div className="mt-4">
          <label className="text-cream-50 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...register(`fields.${index}.config.default`)}
              className="h-4 w-4 rounded text-lime-500"
            />
            Default on
          </label>
        </div>
      )}

      {fieldType === "short_text" && (
        <ShortTextValidationEditor index={index} register={register} />
      )}
    </div>
  );
}

function ChoiceOptionsEditor({
  index,
  watch,
  setValue,
}: {
  index: number;
  watch: FieldRowProps["watch"];
  setValue: FieldRowProps["setValue"];
}) {
  const config = watch(`fields.${index}.config`);
  const options = Array.isArray(config?.options) ? config.options : [];
  const defaultValue = config?.default ?? "";

  const updateOptions = (
    newOptions: Array<{ value: string; label: string }>
  ) => {
    setValue(`fields.${index}.config`, {
      ...config,
      options: newOptions,
    });
  };

  return (
    <div className="mt-4 space-y-3 border-cream-100/10 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-cream-50 text-sm font-medium">Options</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateOptions([
              ...options,
              { value: `option_${options.length + 1}`, label: "New option" },
            ])
          }
        >
          Add option
        </Button>
      </div>

      {options.length === 0 && (
        <p className="text-text-secondary text-xs">
          No options configured. Add at least one for this control to work.
        </p>
      )}

      {options.map((option, optIndex) => (
        <div key={optIndex} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={option.value}
            onChange={(e) => {
              const next = [...options];
              next[optIndex] = { ...next[optIndex], value: e.target.value };
              updateOptions(next);
            }}
            placeholder="value"
            className="text-xs"
          />
          <Input
            value={option.label}
            onChange={(e) => {
              const next = [...options];
              next[optIndex] = { ...next[optIndex], label: e.target.value };
              updateOptions(next);
            }}
            placeholder="Label"
            className="text-xs"
          />
          <Button
            type="button"
            variant="destructive"
            onClick={() => updateOptions(options.filter((_, i) => i !== optIndex))}
          >
            Remove
          </Button>
        </div>
      ))}

      {options.length > 0 && (
        <div>
          <Label htmlFor={`fields.${index}.config.default`}>
            Default value
          </Label>
          <div className="mt-1">
            <RichSelect
              id={`fields.${index}.config.default`}
              aria-label="Default value"
              value={String(defaultValue)}
              onValueChange={(v) =>
                setValue(`fields.${index}.config`, {
                  ...config,
                  default: v === "" ? undefined : v,
                })
              }
              noneLabel="None"
              searchable={options.length > 12}
              options={options.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RangeConfigEditor({
  index,
  register,
  watch,
}: {
  index: number;
  register: FieldRowProps["register"];
  watch: FieldRowProps["watch"];
}) {
  const config = watch(`fields.${index}.config`);

  return (
    <div className="mt-4 grid gap-4 border-cream-100/10 rounded-lg border p-3 md:grid-cols-4">
      <div>
        <Label htmlFor={`fields.${index}.config.min`}>Min</Label>
        <Input
          id={`fields.${index}.config.min`}
          type="number"
          {...register(`fields.${index}.config.min`, optionalNumberInput)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.config.max`}>Max</Label>
        <Input
          id={`fields.${index}.config.max`}
          type="number"
          {...register(`fields.${index}.config.max`, optionalNumberInput)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.config.step`}>Step</Label>
        <Input
          id={`fields.${index}.config.step`}
          type="number"
          step="any"
          {...register(`fields.${index}.config.step`, optionalNumberInput)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.config.default`}>Default</Label>
        <Input
          id={`fields.${index}.config.default`}
          type="number"
          {...register(`fields.${index}.config.default`, optionalNumberInput)}
          className="mt-1"
        />
      </div>
      {config?.min === undefined && (
        <p className="text-text-muted text-xs md:col-span-4">
          Defaults: min 0, max 100, step 1.
        </p>
      )}
    </div>
  );
}

function ShortTextValidationEditor({
  index,
  register,
}: {
  index: number;
  register: FieldRowProps["register"];
}) {
  return (
    <div className="mt-4 grid gap-4 border-cream-100/10 rounded-lg border p-3 md:grid-cols-3">
      <p className="text-cream-50 text-sm font-medium md:col-span-3">
        Validation
      </p>
      <div>
        <Label htmlFor={`fields.${index}.validation.minLength`}>
          Min length
        </Label>
        <Input
          id={`fields.${index}.validation.minLength`}
          type="number"
          {...register(`fields.${index}.validation.minLength`, optionalNumberInput)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.validation.maxLength`}>
          Max length
        </Label>
        <Input
          id={`fields.${index}.validation.maxLength`}
          type="number"
          {...register(`fields.${index}.validation.maxLength`, optionalNumberInput)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.validation.pattern`}>
          Pattern (regex)
        </Label>
        <Input
          id={`fields.${index}.validation.pattern`}
          {...register(`fields.${index}.validation.pattern`)}
          className="mt-1"
          placeholder="e.g. ^[a-zA-Z0-9 ]+$"
        />
      </div>
      <div className="md:col-span-3">
        <Label htmlFor={`fields.${index}.config.default`}>Default value</Label>
        <Input
          id={`fields.${index}.config.default`}
          {...register(`fields.${index}.config.default`)}
          className="mt-1"
          placeholder="Optional default text"
        />
      </div>
    </div>
  );
}
