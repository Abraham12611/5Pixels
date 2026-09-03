"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ProductCreateInput } from "@5pixels/shared";

const FIELD_TYPES = [
  { value: "short_text", label: "Short text" },
  { value: "select", label: "Select" },
  { value: "radio", label: "Radio" },
  { value: "toggle", label: "Toggle" },
  { value: "color", label: "Color" },
  { value: "aspect_ratio", label: "Aspect ratio" },
  { value: "intensity", label: "Intensity" },
  { value: "layout", label: "Layout" },
  { value: "background", label: "Background" },
  { value: "wardrobe", label: "Wardrobe" },
  { value: "era", label: "Era" },
  { value: "mood", label: "Mood" },
] as const;

const CHOICE_TYPES = ["select", "radio", "layout", "background", "wardrobe", "era", "mood"];
const RANGE_TYPES = ["intensity"];

export function FieldEditor() {
  const { control, register, watch, setValue } =
    useFormContext<ProductCreateInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-cream-50 text-lg font-semibold">User controls</h2>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            append({
              field_key: `field_${fields.length + 1}`,
              label: "New field",
              field_type: "short_text",
              required: false,
              sort_order: fields.length,
              config: {},
              validation: {},
              active: true,
            })
          }
        >
          Add field
        </Button>
      </div>

      {fields.length === 0 && (
        <p className="text-text-secondary text-sm">
          No fields configured. Users will see no adjustable controls for this preset.
        </p>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <FieldRow
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
            register={register}
            watch={watch}
            setValue={setValue}
          />
        ))}
      </div>
    </div>
  );
}

interface FieldRowProps {
  index: number;
  onRemove: () => void;
  register: ReturnType<typeof useFormContext<ProductCreateInput>>["register"];
  watch: ReturnType<typeof useFormContext<ProductCreateInput>>["watch"];
  setValue: ReturnType<typeof useFormContext<ProductCreateInput>>["setValue"];
}

function FieldRow({ index, onRemove, register, watch, setValue }: FieldRowProps) {
  const fieldType = watch(`fields.${index}.field_type`);
  const isChoiceType = CHOICE_TYPES.includes(fieldType);
  const isRangeType = RANGE_TYPES.includes(fieldType);

  return (
    <div className="border-cream-100/10 bg-charcoal-800 rounded-xl border p-4">
      {/* Row 1: label, key, type */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2">
          <Label htmlFor={`fields.${index}.label`}>Label</Label>
          <Input
            id={`fields.${index}.label`}
            {...register(`fields.${index}.label`)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`fields.${index}.field_key`}>Key</Label>
          <Input
            id={`fields.${index}.field_key`}
            {...register(`fields.${index}.field_key`)}
            className="mt-1"
            placeholder="e.g. background"
          />
        </div>
        <div>
          <Label htmlFor={`fields.${index}.field_type`}>Type</Label>
          <Select
            id={`fields.${index}.field_type`}
            {...register(`fields.${index}.field_type`)}
            className="mt-1"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="button" variant="danger" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      {/* Row 2: help_text, required, sort_order */}
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
          <div className="flex items-center gap-2">
            <Label htmlFor={`fields.${index}.sort_order`}>Order</Label>
            <Input
              id={`fields.${index}.sort_order`}
              type="number"
              {...register(`fields.${index}.sort_order`, { valueAsNumber: true })}
              className="mt-0 w-20"
            />
          </div>
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
            variant="danger"
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
          <Select
            id={`fields.${index}.config.default`}
            value={String(defaultValue)}
            onChange={(e) =>
              setValue(`fields.${index}.config`, {
                ...config,
                default: e.target.value,
              })
            }
            className="mt-1"
          >
            <option value="">None</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
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
          {...register(`fields.${index}.config.min`, { valueAsNumber: true })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.config.max`}>Max</Label>
        <Input
          id={`fields.${index}.config.max`}
          type="number"
          {...register(`fields.${index}.config.max`, { valueAsNumber: true })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.config.step`}>Step</Label>
        <Input
          id={`fields.${index}.config.step`}
          type="number"
          step="any"
          {...register(`fields.${index}.config.step`, { valueAsNumber: true })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor={`fields.${index}.config.default`}>Default</Label>
        <Input
          id={`fields.${index}.config.default`}
          type="number"
          {...register(`fields.${index}.config.default`, {
            valueAsNumber: true,
          })}
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
          {...register(`fields.${index}.validation.minLength`, {
            valueAsNumber: true,
          })}
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
          {...register(`fields.${index}.validation.maxLength`, {
            valueAsNumber: true,
          })}
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
