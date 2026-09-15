"use client";

import {
  ChoiceSettingTile,
  SettingTile,
} from "@/components/consumer/setting-tile";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
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
              className="flex-1 [&_[data-slot=slider-range]]:bg-lime-400 [&_[data-slot=slider-track]]:bg-cream-100/15 [&_[data-slot=slider-thumb]]:border-lime-400"
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
            className="border-cream-100/10 bg-charcoal-900 text-cream-50 h-9 rounded-md text-sm"
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
            className="border-cream-100/10 bg-charcoal-900 text-cream-50 placeholder:text-text-muted h-9 rounded-md text-sm"
          />
        </SettingTile>
      );
  }
}
