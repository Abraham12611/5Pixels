"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Popover as PopoverPrimitive } from "radix-ui";
import type { z } from "zod";
import type { productCreateSchema } from "@5pixels/shared";
import { Input } from "@/components/ui/input";
import {
  CaretDown,
  Check,
  Crop,
  Plus,
  Rectangle,
  Square,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type FormValues = z.input<typeof productCreateSchema>;
type SizeValue = {
  name: string;
  width: number;
  height: number;
  match_source?: boolean;
  match_reference?: boolean;
};

/**
 * Curated output-size options. All stay under the schema's 4 MP cap; dims are
 * the contract — a preset row is "selected" when a field matches name + dims.
 */
const PRESET_SIZES: SizeValue[] = [
  { name: "Square (1:1)", width: 1024, height: 1024 },
  { name: "Portrait (4:5)", width: 1024, height: 1280 },
  { name: "Portrait (3:4)", width: 1152, height: 1536 },
  { name: "Portrait (9:16)", width: 1024, height: 1820 },
  { name: "Landscape (4:3)", width: 1536, height: 1152 },
  { name: "Landscape (3:2)", width: 1536, height: 1024 },
  { name: "Landscape (16:9)", width: 1820, height: 1024 },
];

/**
 * "Match photo" — output keeps the uploaded photo's aspect ratio. Dims are a
 * server-side fallback only; real dims resolve from the source image.
 */
const MATCH_SOURCE_SIZE: SizeValue = {
  name: "Match photo",
  width: 1024,
  height: 1024,
  match_source: true,
};

/**
 * "Match reference" — output keeps the preset's first reference asset's
 * aspect ratio. Falls back to the source photo's dims when no reference is
 * attached.
 */
const MATCH_REFERENCE_SIZE: SizeValue = {
  name: "Match reference",
  width: 1536,
  height: 1024,
  match_reference: true,
};

const MATCH_SIZES = [MATCH_SOURCE_SIZE, MATCH_REFERENCE_SIZE];

function aspectIcon(width: number, height: number) {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.01) return <Square size={15} />;
  return (
    <Rectangle size={15} className={ratio > 1 ? undefined : "rotate-90"} />
  );
}

function isPreset(v: Partial<SizeValue> | undefined): boolean {
  if (v?.match_source || v?.match_reference) return true;
  return PRESET_SIZES.some(
    (s) =>
      s.name === v?.name &&
      s.width === Number(v?.width) &&
      s.height === Number(v?.height)
  );
}

/**
 * Output-size picker — multi-select dropdown of curated presets plus a
 * "Custom size" escape hatch for anything else. Exactly one size is the
 * default; selecting the first preset marks it automatically.
 */
export function OutputSizesField() {
  const { control, register, setValue, formState } =
    useFormContext<FormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "version.output_sizes",
  });
  const live =
    useWatch({ control, name: "version.output_sizes" }) ?? [];
  const [open, setOpen] = useState(false);
  const sizeErrors = formState.errors.version?.output_sizes;

  const indexOfPreset = (s: SizeValue) =>
    s.match_source || s.match_reference
      ? live.findIndex(
          (v) =>
            v?.match_source === Boolean(s.match_source) &&
            v?.match_reference === Boolean(s.match_reference) &&
            Boolean(v?.match_source || v?.match_reference)
        )
      : live.findIndex(
          (v) =>
            v?.name === s.name &&
            Number(v?.width) === s.width &&
            Number(v?.height) === s.height
        );

  const setDefault = (index: number) => {
    live.forEach((_, i) =>
      setValue(`version.output_sizes.${i}.is_default`, i === index, {
        shouldDirty: true,
      })
    );
  };

  const togglePreset = (s: SizeValue) => {
    const i = indexOfPreset(s);
    if (i >= 0) {
      const wasDefault = Boolean(live[i]?.is_default);
      remove(i);
      // Keep a default assigned — promote the first remaining size.
      if (wasDefault && fields.length > 1) {
        setValue("version.output_sizes.0.is_default", true, {
          shouldDirty: true,
        });
      }
    } else {
      append({ ...s, is_default: fields.length === 0 });
    }
  };

  const addCustom = () => {
    append({
      name: "",
      width: 1024,
      height: 1024,
      is_default: fields.length === 0,
    });
    setOpen(false);
  };

  return (
    <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
      <div className="mb-4">
        <h2 className="text-cream-50 text-lg font-semibold">Output sizes</h2>
        <p className="text-text-secondary mt-1 text-sm">
          The sizes consumers can pick for this preset. One is the default.
        </p>
      </div>

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label="Output sizes"
            className="border-cream-100/10 bg-charcoal-800 text-cream-50 focus:border-lime-500 focus:ring-lime-500 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-1 sm:max-w-md"
          >
            <span
              className={cn(
                "truncate",
                fields.length === 0 && "text-text-muted"
              )}
            >
              {fields.length === 0
                ? "Select output sizes…"
                : `${fields.length} size${fields.length === 1 ? "" : "s"} selected`}
            </span>
            <CaretDown
              size={14}
              className={cn(
                "text-text-muted shrink-0 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            // Multi-select stays open while options are picked. Selecting a
            // preset mounts a Default radio outside the layer, which emits a
            // focus event Radix reads as focus-outside dismissal — keep the
            // panel open; trigger/Escape/outside-click still close it.
            onFocusOutside={(e) => e.preventDefault()}
            className="border-cream-100/10 bg-charcoal-850 z-50 w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden rounded-2xl border shadow-[0_16px_48px_rgba(0,0,0,0.55)] outline-none origin-(--radix-popover-content-transform-origin) data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <div className="max-h-72 overflow-y-auto p-1.5" role="listbox" aria-multiselectable>
              {PRESET_SIZES.map((s) => {
                const selected = indexOfPreset(s) >= 0;
                return (
                  <button
                    key={s.name}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => togglePreset(s)}
                    className={cn(
                      "hover:bg-cream-100/5 focus:bg-cream-100/5 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors",
                      selected && "bg-lime-500/[0.07]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]",
                        selected
                          ? "bg-lime-500/15 text-lime-300"
                          : "bg-charcoal-800 text-text-secondary"
                      )}
                    >
                      {aspectIcon(s.width, s.height)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-cream-50 block truncate text-sm font-medium">
                        {s.name}
                      </span>
                      <span className="text-text-muted mt-0.5 block font-mono text-[11px]">
                        {s.width} × {s.height}
                      </span>
                    </span>
                    <Check
                      size={15}
                      weight="bold"
                      className={cn(
                        "shrink-0 transition-opacity",
                        selected ? "text-lime-400 opacity-100" : "opacity-0"
                      )}
                    />
                  </button>
                );
              })}
              {/* Special options — output follows an attached image's aspect. */}
              {MATCH_SIZES.map((s) => {
                const matchSelected = indexOfPreset(s) >= 0;
                return (
                  <button
                    key={s.name}
                    type="button"
                    role="option"
                    aria-selected={matchSelected}
                    onClick={() => togglePreset(s)}
                    className={cn(
                      "hover:bg-cream-100/5 focus:bg-cream-100/5 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors",
                      matchSelected && "bg-lime-500/[0.07]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]",
                        matchSelected
                          ? "bg-lime-500/15 text-lime-300"
                          : "bg-charcoal-800 text-text-secondary"
                      )}
                    >
                      <Crop size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-cream-50 block text-sm font-medium">
                        {s.name}
                      </span>
                      <span className="text-text-muted mt-0.5 block text-xs">
                        {s.match_source
                          ? "Output keeps the uploaded photo's aspect ratio"
                          : "Output keeps the preset reference's aspect ratio"}
                      </span>
                    </span>
                    <Check
                      size={15}
                      weight="bold"
                      className={cn(
                        "shrink-0 transition-opacity",
                        matchSelected
                          ? "text-lime-400 opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <div className="border-cream-100/10 border-t p-1.5">
              <button
                type="button"
                onClick={addCustom}
                className="hover:bg-cream-100/5 focus:bg-cream-100/5 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left outline-none transition-colors"
              >
                <span className="bg-charcoal-800 text-text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]">
                  <Plus size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-cream-50 block text-sm font-medium">
                    Custom size…
                  </span>
                  <span className="text-text-muted mt-0.5 block text-xs">
                    Enter a name and exact dimensions
                  </span>
                </span>
              </button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* Selected sizes */}
      {fields.length > 0 && (
        <div className="mt-4 space-y-2">
          {fields.map((field, index) => {
            const v = live[index];
            const preset = isPreset(v);
            const isMatch = Boolean(v?.match_source || v?.match_reference);
            return (
              <div
                key={field.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-cream-100/10 bg-charcoal-800/60 px-3 py-2.5",
                  !preset && "flex-wrap sm:flex-nowrap"
                )}
              >
                {preset ? (
                  <>
                    <span className="bg-charcoal-800 text-text-secondary flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]">
                      {isMatch ? (
                        <Crop size={15} />
                      ) : (
                        aspectIcon(Number(v?.width), Number(v?.height))
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-cream-50 block truncate text-sm font-medium">
                        {v?.name}
                      </span>
                      <span className="text-text-muted font-mono text-[11px]">
                        {v?.match_source
                          ? "Matches the uploaded photo"
                          : v?.match_reference
                            ? "Matches the preset reference"
                            : `${Number(v?.width)} × ${Number(v?.height)}`}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <Input
                        aria-label={`Size ${index + 1} name`}
                        placeholder="Size name"
                        {...register(`version.output_sizes.${index}.name`)}
                        className="h-9"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`Size ${index + 1} width`}
                        type="number"
                        placeholder="W"
                        {...register(`version.output_sizes.${index}.width`, {
                          valueAsNumber: true,
                        })}
                        className="h-9 w-24"
                      />
                      <span className="text-text-muted text-xs">×</span>
                      <Input
                        aria-label={`Size ${index + 1} height`}
                        type="number"
                        placeholder="H"
                        {...register(`version.output_sizes.${index}.height`, {
                          valueAsNumber: true,
                        })}
                        className="h-9 w-24"
                      />
                    </div>
                  </>
                )}

                <label className="text-text-secondary flex shrink-0 cursor-pointer items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name="output-size-default"
                    checked={Boolean(v?.is_default)}
                    onChange={() => setDefault(index)}
                    className="accent-lime-500 h-3.5 w-3.5"
                  />
                  Default
                </label>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${v?.name || `size ${index + 1}`}`}
                  className="text-text-muted hover:text-error shrink-0 rounded-md p-1 transition-colors"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {fields.length === 0 && (
        <p className="text-text-secondary mt-3 text-sm">
          No output sizes defined — consumers will get a default 1024×1024
          option.
        </p>
      )}
      {typeof sizeErrors?.message === "string" && (
        <p className="text-error mt-3 text-sm">{sizeErrors.message}</p>
      )}
    </section>
  );
}
