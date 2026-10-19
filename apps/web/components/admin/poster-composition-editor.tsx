"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormRichSelect } from "./form-rich-select";
import { cn } from "@/lib/utils";
import type { ProductCreateInput } from "@5pixels/shared";

const hintClass = "text-text-muted mt-1.5 text-xs";

const LAYOUTS = [
  {
    value: "portrait",
    label: "Portrait",
    description: "Tall composition — covers and feeds",
    ratioClass: "aspect-[3/4]",
  },
  {
    value: "square",
    label: "Square",
    description: "1:1 composition — grid-friendly",
    ratioClass: "aspect-square",
  },
  {
    value: "landscape",
    label: "Landscape",
    description: "Wide composition — banners and headers",
    ratioClass: "aspect-[4/3]",
  },
] as const;

const KEY_PATTERN = /^[a-z0-9_]+$/;
const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Expand #abc → #aabbcc so the native color picker gets a valid value. */
function normalizeHexForPicker(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return "#F7F2E8";
}

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = normalizeHexForPicker(hex).slice(1);
  const n = parseInt(normalized, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Representative generated-imagery backdrop — poster text usually sits on
 *  a mid-dark composition. Used only for an advisory contrast hint. */
const REFERENCE_BACKDROP = "#242622";

function contrastRatio(hex: string, backdrop: string): number | null {
  const a = hexToRgb(hex);
  const b = hexToRgb(backdrop);
  if (!a || !b) return null;
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Poster composition editor (#223, Engineer B). Exposes every existing
 * `poster_config` contract — layout, background, text-layer styling and the
 * `text_fields` overlay declarations — through the surrounding RHF
 * `FormProvider`. No new persistence: values round-trip through
 * `products.metadata.poster_config`.
 *
 * Semantics note: each `text_fields[].key` names the submitted option key
 * whose value the renderer overlays (`buildPosterOverlays` reads
 * `requestedOptions[key]`). A matching `fields[].field_key` short_text
 * control is what lets a customer supply that value; without one the
 * renderer falls back to `default_value` — legitimate for fixed taglines,
 * surfaced as a hint rather than an error.
 */
export function PosterCompositionEditor() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ProductCreateInput>();

  const layout = useWatch({ control, name: "poster_config.layout_template" });
  const textColor = useWatch({
    control,
    name: "poster_config.text_layer_config.color",
  });
  const userFields =
    (useWatch({ control, name: "fields" }) as
      ProductCreateInput["fields"] | undefined) ?? [];

  const textFields = useFieldArray({
    control,
    name: "poster_config.text_fields",
  });
  const userFieldArray = useFieldArray({ control, name: "fields" });

  const watchedTextFields =
    (useWatch({ control, name: "poster_config.text_fields" }) as
      Array<{ key?: string }> | undefined) ?? [];

  const userFieldKeys = new Set(
    userFields
      .map((f) => (f?.field_key ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  for (const f of watchedTextFields) {
    const normalized = (f?.key ?? "").trim().toLowerCase();
    if (!normalized) continue;
    if (seenKeys.has(normalized)) duplicateKeys.add(normalized);
    seenKeys.add(normalized);
  }

  const contrast =
    typeof textColor === "string" && HEX_PATTERN.test(textColor.trim())
      ? contrastRatio(textColor.trim(), REFERENCE_BACKDROP)
      : null;

  const addMatchingUserControl = (key: string, label: string) => {
    userFieldArray.append({
      field_key: key,
      label: label || key,
      field_type: "short_text",
      required: false,
      sort_order: userFields.length,
      config: {},
      validation: {},
      active: true,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <Label>Layout</Label>
        <p className={cn(hintClass, "mt-0 mb-3")}>
          Composition orientation for the poster. This is separate from{" "}
          <strong>Output sizes</strong> below — pick a layout whose shape
          matches the pixel sizes you offer there.
        </p>
        <div
          role="radiogroup"
          aria-label="Poster layout"
          className="grid gap-3 sm:grid-cols-3"
        >
          {LAYOUTS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="poster_config.layout_template"
                value={option.value}
                checked={layout === option.value}
                onChange={() =>
                  setValue("poster_config.layout_template", option.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="peer sr-only"
              />
              <div className="border-cream-100/10 bg-charcoal-800 rounded-xl border p-4 transition-colors peer-checked:border-lime-500 peer-checked:bg-lime-500/5 peer-focus-visible:ring-2 peer-focus-visible:ring-lime-500">
                <div className="flex h-16 items-center justify-center">
                  <div
                    aria-hidden
                    className={cn(
                      "border-cream-100/40 h-full max-h-14 w-auto rounded border-2",
                      option.ratioClass
                    )}
                  />
                </div>
                <p className="text-cream-50 mt-3 text-sm font-medium">
                  {option.label}
                </p>
                <p className="text-text-muted mt-0.5 text-xs">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
        {errors.poster_config?.layout_template && (
          <p className="text-error mt-1 text-sm">
            {errors.poster_config.layout_template.message}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="poster_config.background_handling">Background</Label>
          <div className="mt-2">
            <FormRichSelect
              name="poster_config.background_handling"
              label="Background"
              options={[
                {
                  value: "replace",
                  label: "Replace",
                  description: "AI regenerates the backdrop",
                },
                {
                  value: "preserve",
                  label: "Preserve",
                  description: "Keep the source background",
                },
              ]}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="poster_config.font_family">Font family</Label>
          <Input
            id="poster_config.font_family"
            {...register("poster_config.font_family")}
            className="mt-2"
            placeholder="e.g. Inter, Georgia"
            list="poster-font-suggestions"
          />
          <datalist id="poster-font-suggestions">
            <option value="sans-serif" />
            <option value="serif" />
            <option value="monospace" />
            <option value="Inter" />
            <option value="Georgia" />
          </datalist>
          <p className={hintClass}>
            Preferred typeface for overlaid text. Stored with the preset — the
            current renderer draws all text in its default typeface, so treat
            this as a declared intent until custom fonts ship.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="text-cream-50 text-sm font-medium">
          Text layer
        </legend>
        <p className={cn(hintClass, "mt-0 mb-3")}>
          Positioning applied to every text field below — rendered
          deterministically onto the generated image.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="poster_config.text_layer_config.position">
              Position
            </Label>
            <div className="mt-2">
              <FormRichSelect
                name="poster_config.text_layer_config.position"
                label="Text position"
                options={[
                  { value: "top", label: "Top" },
                  { value: "center", label: "Center" },
                  { value: "bottom", label: "Bottom" },
                ]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="poster_config.text_layer_config.size">Size</Label>
            <div className="mt-2">
              <FormRichSelect
                name="poster_config.text_layer_config.size"
                label="Text size"
                options={[
                  {
                    value: "small",
                    label: "Small",
                    description: "Subtle caption",
                  },
                  {
                    value: "medium",
                    label: "Medium",
                    description: "Standard overlay",
                  },
                  {
                    value: "large",
                    label: "Large",
                    description: "Headline scale",
                  },
                ]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="poster_config.text_layer_config.alignment">
              Alignment
            </Label>
            <div className="mt-2">
              <FormRichSelect
                name="poster_config.text_layer_config.alignment"
                label="Text alignment"
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                  { value: "right", label: "Right" },
                ]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="poster_config.text_layer_config.color">Color</Label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                aria-label="Text color swatch"
                value={normalizeHexForPicker(textColor)}
                onChange={(e) =>
                  setValue(
                    "poster_config.text_layer_config.color",
                    e.target.value,
                    { shouldDirty: true, shouldValidate: true }
                  )
                }
                className="border-cream-100/20 bg-charcoal-800 h-10 w-12 shrink-0 cursor-pointer rounded-md border p-1"
              />
              <Input
                id="poster_config.text_layer_config.color"
                {...register("poster_config.text_layer_config.color", {
                  validate: (v) =>
                    (typeof v === "string" && HEX_PATTERN.test(v.trim())) ||
                    "Use a hex color like #F7F2E8",
                })}
                placeholder="#F7F2E8"
                className="font-mono"
              />
            </div>
            {errors.poster_config?.text_layer_config?.color ? (
              <p className="text-error mt-1 text-sm">
                {errors.poster_config.text_layer_config.color.message}
              </p>
            ) : contrast !== null && contrast < 3 ? (
              <p className="text-warning mt-1 text-xs">
                Low contrast against typical dark imagery — consider a lighter
                color for legibility.
              </p>
            ) : (
              <p className={hintClass}>
                Text color for overlays. Check contrast against your sample
                imagery.
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <div>
        <div className="flex items-center justify-between">
          <Label>Text fields</Label>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              textFields.append({
                key: "",
                label: "",
                required: false,
                default_value: "",
              })
            }
          >
            <Plus size={14} className="mr-1" />
            Add text field
          </Button>
        </div>
        <p className={cn(hintClass, "mb-3")}>
          Text rendered onto the poster. Each <code>key</code> names the option
          whose value is overlaid — pair it with a <strong>short text</strong>{" "}
          user control below so customers can fill it, or set a default to
          render fixed text.
        </p>

        {textFields.fields.length === 0 && (
          <p className="text-text-secondary border-cream-100/10 rounded-lg border border-dashed p-4 text-sm">
            No text fields — the poster renders without overlaid text.
          </p>
        )}

        <div className="space-y-3">
          {textFields.fields.map((field, index) => {
            const rowErrors = errors.poster_config?.text_fields?.[index];
            const watched = watchedTextFields[index];
            const normalizedKey = (watched?.key ?? "").trim().toLowerCase();
            const keyInvalid =
              normalizedKey.length > 0 && !KEY_PATTERN.test(normalizedKey);
            const keyDuplicate =
              normalizedKey.length > 0 && duplicateKeys.has(normalizedKey);
            const hasUserControl =
              normalizedKey.length > 0 && userFieldKeys.has(normalizedKey);
            return (
              <div
                key={field.id}
                className="border-cream-100/10 bg-charcoal-800 rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-cream-50 text-sm font-medium">
                    {watched?.key || `Text field ${index + 1}`}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Move text field ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => textFields.move(index, index - 1)}
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Move text field ${index + 1} down`}
                      disabled={index === textFields.fields.length - 1}
                      onClick={() => textFields.move(index, index + 1)}
                    >
                      <ArrowDown size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove text field ${index + 1}`}
                      onClick={() => textFields.remove(index)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`poster_config.text_fields.${index}.key`}>
                      Key
                    </Label>
                    <Input
                      id={`poster_config.text_fields.${index}.key`}
                      {...register(`poster_config.text_fields.${index}.key`)}
                      className="mt-1 font-mono"
                      placeholder="e.g. headline"
                      aria-invalid={
                        Boolean(rowErrors?.key) || keyDuplicate || keyInvalid
                      }
                    />
                    {rowErrors?.key && (
                      <p className="text-error mt-1 text-sm">
                        {rowErrors.key.message}
                      </p>
                    )}
                    {keyDuplicate && (
                      <p className="text-error mt-1 text-sm">
                        Another text field already uses this key.
                      </p>
                    )}
                    {!keyDuplicate && keyInvalid && (
                      <p className="text-error mt-1 text-sm">
                        Use lowercase letters, numbers, and underscores — the
                        key must match a user-control key to be fillable.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor={`poster_config.text_fields.${index}.label`}>
                      Label
                    </Label>
                    <Input
                      id={`poster_config.text_fields.${index}.label`}
                      {...register(`poster_config.text_fields.${index}.label`)}
                      className="mt-1"
                      placeholder="e.g. Headline"
                    />
                    {rowErrors?.label && (
                      <p className="text-error mt-1 text-sm">
                        {rowErrors.label.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor={`poster_config.text_fields.${index}.default_value`}
                    >
                      Default value
                    </Label>
                    <Input
                      id={`poster_config.text_fields.${index}.default_value`}
                      {...register(
                        `poster_config.text_fields.${index}.default_value`
                      )}
                      className="mt-1"
                      placeholder="Rendered when the customer leaves it blank"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="text-cream-50 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        {...register(
                          `poster_config.text_fields.${index}.required`
                        )}
                        className="h-4 w-4 rounded text-lime-500"
                      />
                      Required
                    </label>
                  </div>
                </div>
                {normalizedKey.length > 0 && !keyInvalid && !keyDuplicate && (
                  <p className={cn(hintClass, "mt-3")}>
                    {hasUserControl ? (
                      <>
                        Filled by the <code>{normalizedKey}</code> user control.
                      </>
                    ) : (
                      <>
                        No user control submits <code>{normalizedKey}</code> —
                        only its default value is rendered.{" "}
                        <button
                          type="button"
                          className="text-lime-400 underline hover:text-lime-300"
                          onClick={() =>
                            addMatchingUserControl(
                              normalizedKey,
                              watched?.key ?? normalizedKey
                            )
                          }
                        >
                          Add a matching user control
                        </button>
                      </>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
