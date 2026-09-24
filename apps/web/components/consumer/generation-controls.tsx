"use client";

import { useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import {
  ChoiceSettingTile,
  SettingTile,
} from "@/components/consumer/setting-tile";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
import { cn } from "@/lib/utils";
import type { PublicProductField } from "@/types/catalog";

interface GenerationControlsProps {
  fields: PublicProductField[];
  values: Record<string, unknown>;
  /** Visually deemphasize controls until a source image is present. */
  disabled?: boolean;
  onChange: (values: Record<string, unknown>) => void;
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

/**
 * Mobile "Adjust the look (N)" accordion (25_MOBILE_WEB_POLISH/08 §4):
 * collapsed by default so disabled controls aren't a dead region, expanded
 * automatically when there are ≤2 controls. On `md`+ the header hides and the
 * content is always visible — the rail keeps its flat layout.
 */
export function AdjustAccordion({
  count,
  children,
}: {
  /** Adjustable rows inside (fields + output size) — shown as the badge. */
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => count <= 2);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-cream-50 flex min-h-11 w-full items-center justify-between gap-3 text-left text-[15px] font-semibold md:hidden"
      >
        <span>
          Adjust the look{" "}
          <span className="text-text-muted text-xs font-normal">({count})</span>
        </span>
        <CaretDown
          size={16}
          weight="bold"
          className={cn(
            "text-text-muted shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div className={cn("space-y-2.5", !open && "hidden", "md:block")}>
        {children}
      </div>
    </div>
  );
}

/**
 * Poster text inputs rendered as their own section ("Your text") with a live
 * character count — poster copy is rendered exactly as typed.
 */
export function PosterTextFields({
  fields,
  values,
  disabled,
  onChange,
}: GenerationControlsProps) {
  const sorted = sortFields(fields).filter(
    (f) => f.field_type === "short_text"
  );

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {sorted.map((field) => {
        const normalized = normalizeField(field);
        const controlId = `gen-field-${field.field_key}`;
        const value = String(
          values[field.field_key] ?? normalized.defaultValue ?? ""
        );
        const maxLength =
          (field.validation?.maxLength as number | undefined) ?? undefined;

        return (
          <SettingTile
            key={field.id}
            label={field.label}
            required={field.required ?? undefined}
            hint={field.help_text ?? undefined}
            disabled={disabled}
            stacked
          >
            <Input
              id={controlId}
              type="text"
              value={value}
              onChange={(e) =>
                onChange({ ...values, [field.field_key]: e.target.value })
              }
              maxLength={maxLength}
              disabled={disabled}
              className="border-cream-100/10 bg-charcoal-850 text-cream-50 placeholder:text-text-muted h-11 rounded-md text-sm"
            />
            <p className="text-text-muted mt-1.5 text-right text-[11px] tabular-nums">
              {value.length}
              {maxLength ? `/${maxLength}` : ""}
            </p>
          </SettingTile>
        );
      })}
    </div>
  );
}

export function GenerationControls({
  fields,
  values,
  disabled,
  onChange,
}: GenerationControlsProps) {
  const sorted = sortFields(fields);

  const update = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  if (sorted.length === 0) {
    return (
      <p className="text-text-secondary text-[13px]">
        This look needs no adjustments — the recipe is fully curated.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((field) => {
        const normalized = normalizeField(field);
        const controlId = `gen-field-${field.field_key}`;
        const value = values[field.field_key] ?? normalized.defaultValue;

        return (
          <ControlTile
            key={field.id}
            field={normalized}
            controlId={controlId}
            value={value}
            disabled={disabled}
            onChange={(v) => update(field.field_key, v)}
          />
        );
      })}
    </div>
  );
}

function ControlTile({
  field,
  controlId,
  value,
  disabled,
  onChange,
}: {
  field: ReturnType<typeof normalizeField>;
  controlId: string;
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  if (CHOICE_TYPES.has(field.field_type)) {
    return (
      <ChoiceSettingTile
        id={controlId}
        label={field.label}
        required={field.required ?? undefined}
        disabled={disabled}
        value={String(value ?? "")}
        options={field.options}
        onChange={onChange}
      />
    );
  }

  switch (field.field_type) {
    case "intensity":
      return (
        <SettingTile
          label={field.label}
          required={field.required ?? undefined}
          disabled={disabled}
          stacked
        >
          <div className="flex items-center gap-3">
            <Slider
              id={controlId}
              min={field.min}
              max={field.max}
              step={field.step}
              value={[Number(value ?? field.min)]}
              onValueChange={(v) => onChange(v[0])}
              disabled={disabled}
              className="h-11 flex-1 [&_[data-slot=slider-range]]:bg-lime-400 [&_[data-slot=slider-track]]:bg-cream-100/15 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-lime-400"
            />
            <span className="text-text-secondary w-8 shrink-0 text-right text-[13px] tabular-nums">
              {Number(value ?? field.min)}
            </span>
          </div>
        </SettingTile>
      );

    case "toggle":
      return (
        <SettingTile
          label={field.label}
          required={field.required ?? undefined}
          hint={field.help_text ?? undefined}
          disabled={disabled}
        >
          <Switch
            id={controlId}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            disabled={disabled}
            className="data-[state=checked]:bg-lime-500 data-[state=unchecked]:bg-cream-100/15"
          />
        </SettingTile>
      );

    case "color":
      return (
        <SettingTile
          label={field.label}
          required={field.required ?? undefined}
          disabled={disabled}
        >
          <label
            htmlFor={controlId}
            className="flex cursor-pointer items-center gap-2"
          >
            <span className="text-text-secondary text-[13px]">
              {String(value ?? "#82ea3a")}
            </span>
            <input
              id={controlId}
              type="color"
              value={String(value ?? "#82ea3a")}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="border-cream-100/20 h-7 w-10 cursor-pointer rounded-md border bg-transparent p-0.5"
            />
          </label>
        </SettingTile>
      );

    case "aspect_ratio":
      // Schema-level aspect fields are choice-like when options exist.
      if (field.options.length > 0) {
        return (
          <ChoiceSettingTile
            id={controlId}
            label={field.label}
            required={field.required ?? undefined}
            disabled={disabled}
            value={String(value ?? "")}
            options={field.options}
            onChange={onChange}
          />
        );
      }
      return (
        <SettingTile
          label={field.label}
          required={field.required ?? undefined}
          hint={field.help_text ?? undefined}
          disabled={disabled}
          stacked
        >
          <Input
            id={controlId}
            type="text"
            value={String(value ?? "1:1")}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="border-cream-100/10 bg-charcoal-850 text-cream-50 h-9 rounded-md text-sm"
          />
        </SettingTile>
      );

    default:
      // short_text and any future text-like types
      return (
        <SettingTile
          label={field.label}
          required={field.required ?? undefined}
          hint={field.help_text ?? undefined}
          disabled={disabled}
          stacked
        >
          <Input
            id={controlId}
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            maxLength={
              (field.validation?.maxLength as number | undefined) ?? undefined
            }
            disabled={disabled}
            className="border-cream-100/10 bg-charcoal-850 text-cream-50 placeholder:text-text-muted h-9 rounded-md text-sm"
          />
        </SettingTile>
      );
  }
}
