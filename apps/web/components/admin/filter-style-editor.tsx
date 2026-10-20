"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProductCreateInput } from "@5pixels/shared";

const hintClass = "text-text-muted mt-1.5 text-xs";
const flagClass =
  "border-warning/40 bg-warning/10 text-warning mt-4 rounded-xl border px-4 py-3 text-sm";

const IDENTITY_OPTIONS = [
  {
    value: "very_high",
    label: "Very high",
    description:
      "Face and likeness must be identical — the strongest identity guardrail.",
  },
  {
    value: "high",
    label: "High",
    description: "Strong likeness preservation with light styling.",
  },
  {
    value: "medium",
    label: "Medium",
    description:
      "Balanced: styling may soften likeness, user edits can relax it further.",
  },
  {
    value: "creative",
    label: "Creative",
    description: "Most stylized — identity may be intentionally reinterpreted.",
  },
] as const;

const ARCHETYPE_SUGGESTIONS = [
  "chrome editorial",
  "film noir",
  "manga",
  "softbox portrait",
  "vintage risograph",
];

/**
 * Filter creative controls (#223, Engineer B). `style_archetype` stays an
 * open string — it is descriptive metadata required by the publish gate,
 * not a model parameter or prompt fragment. `identity_preservation` maps
 * to a real guardrail clause when custom prompt edits are enabled
 * (`IDENTITY_CLAUSES` in lib/ai/prompt.ts), so its options explain the
 * actual effect rather than marketing labels.
 */
export function FilterStyleEditor() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ProductCreateInput>();

  const identity = useWatch({
    control,
    name: "filter_config.identity_preservation",
  });
  const likenessLevel = useWatch({ control, name: "likeness_level" });

  const likenessMismatch =
    typeof likenessLevel === "string" &&
    typeof identity === "string" &&
    likenessLevel.length > 0 &&
    identity.length > 0 &&
    likenessLevel !== identity;

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="filter_config.style_archetype">Style archetype</Label>
        <Input
          id="filter_config.style_archetype"
          {...register("filter_config.style_archetype")}
          className="mt-2"
          placeholder="e.g. chrome editorial"
          list="style-archetype-suggestions"
          aria-describedby="style-archetype-hint"
        />
        <datalist id="style-archetype-suggestions">
          {ARCHETYPE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {errors.filter_config?.style_archetype ? (
          <p className="text-error mt-1 text-sm">
            {errors.filter_config.style_archetype.message}
          </p>
        ) : null}
        <p id="style-archetype-hint" className={hintClass}>
          A short descriptive label for the preset&apos;s visual style —
          required to publish. It&apos;s stored as catalog/editorial metadata
          and is not sent to the model on its own; the actual look comes from
          the private instruction template below.
        </p>
      </div>

      <fieldset>
        <legend className="text-cream-50 text-sm font-medium">
          Identity preservation
        </legend>
        <p className={cn(hintClass, "mt-0 mb-3")}>
          How strongly the preset protects the person&apos;s likeness. When
          custom prompt edits are enabled, this adds a matching guardrail clause
          to the composed instructions.
        </p>
        <div
          role="radiogroup"
          aria-label="Identity preservation"
          className="grid gap-3 sm:grid-cols-2"
        >
          {IDENTITY_OPTIONS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="filter_config.identity_preservation"
                value={option.value}
                checked={identity === option.value}
                onChange={() =>
                  setValue(
                    "filter_config.identity_preservation",
                    option.value,
                    { shouldDirty: true, shouldValidate: true }
                  )
                }
                className="peer sr-only"
              />
              <div className="border-cream-100/10 bg-charcoal-800 h-full rounded-xl border p-4 transition-colors peer-checked:border-lime-500 peer-checked:bg-lime-500/5 peer-focus-visible:ring-2 peer-focus-visible:ring-lime-500">
                <p className="text-cream-50 text-sm font-medium">
                  {option.label}
                </p>
                <p className="text-text-muted mt-0.5 text-xs">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {likenessMismatch && (
        <div className={flagClass} role="status">
          <p className="font-medium">
            Public fidelity label doesn&apos;t match this styling.
          </p>
          <p className="mt-1 text-xs">
            This preset&apos;s <code>likeness_level</code> is{" "}
            <code>{likenessLevel}</code> — shown to customers as a fidelity chip
            — while identity preservation here is <code>{identity}</code>.
            Neither overrides the other; the catalog chip may contradict the
            actual styling. Align the product&apos;s likeness level, or leave
            as-is intentionally.
          </p>
        </div>
      )}
    </div>
  );
}
