"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { normalizeField, sortFields } from "@/lib/catalog/fields";
import type { PublicProductField } from "@/types/catalog";

interface ControlPreviewProps {
  fields: PublicProductField[];
}

export function ControlPreview({ fields }: ControlPreviewProps) {
  const sorted = sortFields(fields);

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
        const controlId = `preview-field-${field.field_key}`;

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
            {renderControl(normalized, controlId)}
          </div>
        );
      })}
      <p className="text-text-muted text-xs">
        These controls are shown for preview. Adjustments will be available when
        you create a generation.
      </p>
    </div>
  );
}

function renderControl(
  field: ReturnType<typeof normalizeField>,
  controlId: string
) {
  const commonClasses = "opacity-80 cursor-not-allowed";

  switch (field.field_type) {
    case "short_text":
      return (
        <Input
          id={controlId}
          type="text"
          defaultValue={String(field.defaultValue ?? "")}
          disabled
          className={commonClasses}
          placeholder="Text input"
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
          defaultValue={String(field.defaultValue ?? "")}
          disabled
          className={commonClasses}
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
        <fieldset className="space-y-2" disabled>
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
                  defaultChecked={field.defaultValue === option.value}
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
            defaultChecked={Boolean(field.defaultValue)}
            disabled
            className={cn(
              "border-cream-100/20 bg-charcoal-800 h-5 w-5 rounded text-lime-500",
              commonClasses
            )}
          />
          <span className="text-text-secondary text-sm">
            {field.defaultValue ? "On" : "Off"}
          </span>
        </label>
      );

    case "color":
      return (
        <div className="flex items-center gap-3">
          <input
            id={controlId}
            type="color"
            defaultValue={String(field.defaultValue ?? "#82ea3a")}
            disabled
            className={cn("h-10 w-16 rounded bg-transparent", commonClasses)}
          />
          <span className="text-text-secondary text-sm">
            {String(field.defaultValue ?? "#82ea3a")}
          </span>
        </div>
      );

    case "aspect_ratio":
      return (
        <Input
          id={controlId}
          type="text"
          defaultValue={String(field.defaultValue ?? "1:1")}
          disabled
          className={commonClasses}
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
            defaultValue={Number(field.defaultValue ?? field.min)}
            disabled
            className={cn("w-full accent-lime-500", commonClasses)}
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
          defaultValue={String(field.defaultValue ?? "")}
          disabled
          className={commonClasses}
        />
      );
  }
}
