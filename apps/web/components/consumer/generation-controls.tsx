"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
import type { PublicProductField } from "@/types/catalog";

interface GenerationControlsProps {
  fields: PublicProductField[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function GenerationControls({
  fields,
  values,
  onChange,
}: GenerationControlsProps) {
  const sorted = sortFields(fields);

  const update = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  if (sorted.length === 0) {
    return (
      <p className="text-text-secondary text-sm">
        No adjustable controls for this preset.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {sorted.map((field) => {
        const normalized = normalizeField(field);
        const controlId = `gen-field-${field.field_key}`;
        const value = values[field.field_key] ?? normalized.defaultValue;

        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={controlId}>{field.label}</Label>
              {field.required && (
                <span className="text-text-muted text-xs">Required</span>
              )}
            </div>
            {field.help_text && (
              <p className="text-text-secondary text-xs">{field.help_text}</p>
            )}
            {renderControl(normalized, controlId, value, (v) =>
              update(field.field_key, v)
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderControl(
  field: ReturnType<typeof normalizeField>,
  controlId: string,
  value: unknown,
  onChange: (value: unknown) => void
) {
  switch (field.field_type) {
    case "short_text":
      return (
        <Input
          id={controlId}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          maxLength={
            (field.validation?.maxLength as number | undefined) ?? undefined
          }
        />
      );

    case "select":
    case "layout":
    case "background":
    case "wardrobe":
    case "era":
    case "mood":
      return (
        <Select
          id={controlId}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.length > 0 ? (
            field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            <option value="">No options configured</option>
          )}
        </Select>
      );

    case "radio":
      return (
        <fieldset className="space-y-2">
          {field.options.length > 0 ? (
            field.options.map((option) => (
              <label
                key={option.value}
                className="text-cream-50 flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name={controlId}
                  value={option.value}
                  checked={String(value) === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="text-lime-500"
                />
                {option.label}
              </label>
            ))
          ) : (
            <p className="text-text-secondary text-sm">
              No options configured.
            </p>
          )}
        </fieldset>
      );

    case "toggle":
      return (
        <label className="flex items-center gap-3">
          <input
            id={controlId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className={cn(
              "border-cream-100/20 bg-charcoal-800 h-5 w-5 rounded text-lime-500"
            )}
          />
          <span className="text-text-secondary text-sm">
            {value ? "On" : "Off"}
          </span>
        </label>
      );

    case "color":
      return (
        <div className="flex items-center gap-3">
          <input
            id={controlId}
            type="color"
            value={String(value ?? "#82ea3a")}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-16 rounded bg-transparent"
          />
          <span className="text-text-secondary text-sm">
            {String(value ?? "#82ea3a")}
          </span>
        </div>
      );

    case "aspect_ratio":
      return (
        <Input
          id={controlId}
          type="text"
          value={String(value ?? "1:1")}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "intensity":
      return (
        <div className="space-y-2">
          <input
            id={controlId}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={Number(value ?? field.min)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-lime-500"
          />
          <div className="text-text-muted flex justify-between text-xs">
            <span>{field.min}</span>
            <span>{field.max}</span>
          </div>
        </div>
      );

    default:
      return (
        <Input
          id={controlId}
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
