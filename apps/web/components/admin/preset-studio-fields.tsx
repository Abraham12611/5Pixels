"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormRichSelect } from "./form-rich-select";
import { optionalNumberInput } from "./form-utils";
import { getRouteCapability } from "@/lib/ai/route-capabilities";
import {
  validateCapabilityForRoute,
  type ParentCandidate,
} from "@/lib/validation/preset-family";
import type { VersionInputCapability } from "@5pixels/shared";
import { cn } from "@/lib/utils";

export interface EligibleParentOption {
  id: string;
  slug: string;
  name: string;
  public_status: string;
}

const sectionClass =
  "border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6";
const headingClass = "text-cream-50 mb-4 text-lg font-semibold";
const hintClass = "text-text-muted mt-1.5 text-xs";
const flagClass =
  "border-warning/40 bg-warning/10 text-warning mt-4 rounded-xl border px-4 py-3 text-sm";

/**
 * Preset Studio 2.0 admin configuration (#177): family assignment, user
 * image inputs, and optional prompt edits. All three capabilities are
 * independent; everything defaults OFF/standalone; and when the pinned
 * model changes, incompatible settings are *flagged* for explicit
 * correction — never silently rewritten. The server mutations re-run the
 * same validators, so these messages are advisory only.
 */
interface FamilyFieldsProps {
  eligibleParents: EligibleParentOption[];
  /** False when the family contract migration is not deployed on this DB. */
  schemaAvailable?: boolean;
  productId?: string;
  hasChildren?: boolean;
  currentParent?: ParentCandidate | null;
}

export function PresetFamilyFields({
  eligibleParents,
  schemaAvailable = true,
  productId,
  hasChildren = false,
  currentParent = null,
}: FamilyFieldsProps) {
  const { register, control, setValue } = useFormContext();
  const parentPresetId = useWatch({ control, name: "parent_preset_id" }) as
    | string
    | null
    | undefined;
  const productType = useWatch({ control, name: "type" }) as
    | "filter"
    | "poster"
    | undefined;

  // "Variant" is an explicit mode (#223): choosing it no longer auto-assigns
  // the first eligible parent — the preset only becomes a variant once the
  // admin deliberately picks a root. Until then the section warns that the
  // record would save as standalone.
  const [mode, setMode] = useState<"standalone" | "variant">(() =>
    parentPresetId ? "variant" : "standalone"
  );
  const isVariant = mode === "variant";
  const variantBlocked =
    hasChildren || (!parentPresetId && eligibleParents.length === 0);

  if (!schemaAvailable) {
    return (
      <section className={sectionClass}>
        <h2 className={headingClass}>Preset family</h2>
        <p className={flagClass}>
          Preset family features are unavailable — the family schema
          migration is not deployed on this environment. Standalone/variant
          configuration cannot be read or saved here; other edits may also
          fail until the migration is applied. Contact the release owner.
        </p>
      </section>
    );
  }

  return (
      <section className={sectionClass}>
        <h2 className={headingClass}>Preset family</h2>
        <p className={cn(hintClass, "mb-4")}>
          Standalone presets live independently in the catalog. A variant
          belongs to a single root preset&apos;s family — one level only; a
          variant can never have variants of its own.
        </p>

        <div className="flex flex-wrap gap-6">
          <label className="text-cream-50 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="__family_mode"
              checked={!isVariant}
              onChange={() => {
                setMode("standalone");
                setValue("parent_preset_id", null, { shouldDirty: true });
                setValue("standalone_discoverable", false, {
                  shouldDirty: true,
                });
              }}
              className="h-4 w-4 text-lime-500"
            />
            Standalone preset
          </label>
          <label className="text-cream-50 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="__family_mode"
              checked={isVariant}
              disabled={variantBlocked}
              onChange={() => setMode("variant")}
              className="h-4 w-4 text-lime-500"
            />
            Variant of a root preset
          </label>
        </div>
        {hasChildren && (
          <p className={hintClass}>
            This preset already has variants of its own, so it cannot become
            a variant itself — families are single-level.
          </p>
        )}
        {!parentPresetId && eligibleParents.length === 0 && (
          <p className={hintClass}>
            No eligible root{" "}
            {productType === "poster" ? "posters" : "filters"} exist yet —{" "}
            <Link
              href={`/admin/${productType === "poster" ? "posters" : "filters"}/new`}
              className="text-lime-400 hover:text-lime-300 underline"
            >
              create a root preset
            </Link>{" "}
            first.
          </p>
        )}

        {isVariant && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="parent_preset_id">Parent preset</Label>
              <div className="mt-2">
                <FormRichSelect
                  name="parent_preset_id"
                  label="Parent preset"
                  searchable
                  searchPlaceholder="Search root presets…"
                  placeholder="Choose a root preset"
                  options={eligibleParents.map((p) => ({
                    value: p.id,
                    label: p.name,
                    description: `${p.slug} · ${p.public_status}`,
                  }))}
                />
              </div>
              {!parentPresetId && (
                <p className="text-warning mt-1 text-sm">
                  No parent selected — this preset will save as standalone
                  until you choose a root.
                </p>
              )}
              {productId === parentPresetId && (
                <p className="text-error mt-1 text-sm">
                  A preset cannot be its own parent.
                </p>
              )}
              {currentParent &&
                parentPresetId &&
                currentParent.id !== parentPresetId && (
                  <p className={hintClass}>
                    Changing the parent moves this variant into a different
                    family and out of its current sibling order.
                  </p>
                )}
              {currentParent?.public_status === "retired" && (
                <p className="text-error mt-1 text-sm">
                  The current parent is retired — pick a different root
                  preset before saving.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="variant_display_name">
                Variant display name
              </Label>
              <Input
                id="variant_display_name"
                {...register("variant_display_name")}
                className="mt-2"
                placeholder="e.g. Warm version"
                maxLength={120}
              />
              <p className={hintClass}>
                Shown in the variation selector; falls back to the preset
                name when empty.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-cream-50 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  {...register("standalone_discoverable")}
                  className="h-4 w-4 rounded text-lime-500"
                />
                Also show this variant independently in Explore
              </label>
              <p className={hintClass}>
                Off by default: the variant only appears inside its parent
                family. When enabled it must independently satisfy publish
                checks — the family placement is retained either way.
              </p>
            </div>
          </div>
        )}
      </section>
  );
}

interface CapabilityFieldsProps {
  adminReferenceCount?: number;
}

export function UserImageInputFields({
  adminReferenceCount = 0,
}: CapabilityFieldsProps) {
  const { register, control, setValue } = useFormContext();
  const [primaryProvider, primaryModel, capability] = useWatch({
    control,
    name: [
      "version.provider_strategy.primary_provider",
      "version.provider_strategy.primary_model",
      "version.input_capability",
    ],
  }) as [
    string | undefined,
    string | undefined,
    VersionInputCapability | undefined,
  ];

  const inputCapability: VersionInputCapability = capability ?? {
    input_mode: "single",
    input_min_images: 1,
    input_max_images: 1,
    input_image_roles: [],
    prompt_override_enabled: false,
    prompt_max_chars: 0,
  };

  const routeCapability = getRouteCapability(primaryProvider, primaryModel);
  const userImageBudget = routeCapability
    ? Math.max(routeCapability.max_input_images - adminReferenceCount, 0)
    : 0;

  const capabilityErrors = validateCapabilityForRoute({
    capability: inputCapability,
    routeCapability,
    endpoint: primaryModel ? `${primaryProvider}/${primaryModel}` : null,
    adminReferenceCount,
  }).filter((e) => /image|role|capability/i.test(e));

  const roles = useFieldArray({
    control,
    name: "version.input_capability.input_image_roles",
  });

  // Choosing "single image" IS the normalization — min/max collapse to
  // exactly one as a direct consequence of the admin's explicit choice.
  useEffect(() => {
    if (inputCapability.input_mode !== "single") return;
    if (
      inputCapability.input_min_images !== 1 ||
      inputCapability.input_max_images !== 1
    ) {
      setValue("version.input_capability.input_min_images", 1, {
        shouldDirty: true,
      });
      setValue("version.input_capability.input_max_images", 1, {
        shouldDirty: true,
      });
    }
  }, [
    inputCapability.input_mode,
    inputCapability.input_min_images,
    inputCapability.input_max_images,
    setValue,
  ]);

  return (
      <section className={sectionClass}>
        <h2 className={headingClass}>User image inputs</h2>
        <p className={cn(hintClass, "mb-4")}>
          One user image is required by default. Multiple image slots can
          only be enabled when the pinned provider route supports the
          declared count — the headroom below already accounts for{" "}
          {adminReferenceCount} private reference asset
          {adminReferenceCount === 1 ? "" : "s"} on this preset.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <Label htmlFor="version.input_capability.input_mode">
              Image inputs
            </Label>
            <div className="mt-2">
              <FormRichSelect
                name="version.input_capability.input_mode"
                label="Image inputs"
                options={[
                  {
                    value: "single",
                    label: "Single image",
                    description: "Exactly one user photo (default)",
                  },
                  {
                    value: "multi",
                    label: "Multiple images",
                    description: "Admin-declared slots with roles",
                  },
                ]}
              />
            </div>
          </div>
          {inputCapability.input_mode === "multi" && (
            <>
              <div>
                <Label htmlFor="version.input_capability.input_min_images">
                  Min images
                </Label>
                <Input
                  id="version.input_capability.input_min_images"
                  type="number"
                  min={1}
                  max={14}
                  {...register(
                    "version.input_capability.input_min_images",
                    optionalNumberInput
                  )}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="version.input_capability.input_max_images">
                  Max images
                </Label>
                <Input
                  id="version.input_capability.input_max_images"
                  type="number"
                  min={2}
                  max={14}
                  {...register(
                    "version.input_capability.input_max_images",
                    optionalNumberInput
                  )}
                  className="mt-2"
                />
                {routeCapability && (
                  <p className={hintClass}>
                    Route allows up to {userImageBudget} user image
                    {userImageBudget === 1 ? "" : "s"} on this preset.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {inputCapability.input_mode === "multi" && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <Label>Declared input roles</Label>
              <button
                type="button"
                onClick={() =>
                  roles.append({ name: "", optional: false })
                }
                className="text-text-secondary hover:text-cream-50 text-xs"
                disabled={roles.fields.length >= 14}
              >
                + Add role
              </button>
            </div>
            <p className={hintClass}>
              Ordered labels for each slot (e.g. subject, style_reference).
              The provider receives the images in this order.
            </p>
            <div className="mt-3 space-y-2">
              {roles.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <span className="text-text-muted w-6 text-xs">
                    {index + 1}
                  </span>
                  <Input
                    {...register(
                      `version.input_capability.input_image_roles.${index}.name`
                    )}
                    placeholder="role_name"
                    className="max-w-xs"
                  />
                  <label className="text-cream-50 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      {...register(
                        `version.input_capability.input_image_roles.${index}.optional`
                      )}
                      className="h-4 w-4 rounded text-lime-500"
                    />
                    Optional
                  </label>
                  <button
                    type="button"
                    onClick={() => roles.remove(index)}
                    className="text-error/80 hover:text-error text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {capabilityErrors.length > 0 && (
          <div className={flagClass} role="alert">
            <p className="font-medium">
              This configuration does not fit the selected model.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {capabilityErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Correct the settings above or switch to a compatible model —
              saving with unsupported settings is rejected server-side.
            </p>
          </div>
        )}
      </section>
  );
}

export function PromptEditFields({
  adminReferenceCount = 0,
}: CapabilityFieldsProps) {
  const { register, control, setValue } = useFormContext();
  const [primaryProvider, primaryModel, capability] = useWatch({
    control,
    name: [
      "version.provider_strategy.primary_provider",
      "version.provider_strategy.primary_model",
      "version.input_capability",
    ],
  }) as [
    string | undefined,
    string | undefined,
    VersionInputCapability | undefined,
  ];

  const inputCapability: VersionInputCapability = capability ?? {
    input_mode: "single",
    input_min_images: 1,
    input_max_images: 1,
    input_image_roles: [],
    prompt_override_enabled: false,
    prompt_max_chars: 0,
  };

  const routeCapability = getRouteCapability(primaryProvider, primaryModel);
  const capabilityErrors = validateCapabilityForRoute({
    capability: inputCapability,
    routeCapability,
    endpoint: primaryModel ? `${primaryProvider}/${primaryModel}` : null,
    adminReferenceCount,
  });

  const examples = useFieldArray({
    control,
    name: "prompt_ui.examples",
  });

  // Unchecking the switch is itself the normalization — a disabled prompt
  // carries a 0-char budget as a direct consequence of the toggle.
  useEffect(() => {
    if (
      !inputCapability.prompt_override_enabled &&
      inputCapability.prompt_max_chars !== 0
    ) {
      setValue("version.input_capability.prompt_max_chars", 0, {
        shouldDirty: true,
      });
    }
  }, [
    inputCapability.prompt_override_enabled,
    inputCapability.prompt_max_chars,
    setValue,
  ]);

  return (
      <section className={sectionClass}>
        <h2 className={headingClass}>Custom prompt edits</h2>
        <label className="text-cream-50 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            {...register("version.input_capability.prompt_override_enabled")}
            className="h-4 w-4 rounded text-lime-500"
          />
          Allow custom prompt edits
        </label>
        <p className={hintClass}>
          Off by default. When enabled, customers see a collapsed
          &ldquo;Describe your changes&rdquo; box whose text is composed
          server-side into the private recipe — it never replaces it. Only
          enable on routes that accept free-text edit instructions.
        </p>

        {inputCapability.prompt_override_enabled && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="version.input_capability.prompt_max_chars">
                Max characters
              </Label>
              <Input
                id="version.input_capability.prompt_max_chars"
                type="number"
                min={1}
                max={2000}
                {...register(
                  "version.input_capability.prompt_max_chars",
                  optionalNumberInput
                )}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="prompt_ui.placeholder">
                Placeholder text
              </Label>
              <Input
                id="prompt_ui.placeholder"
                {...register("prompt_ui.placeholder")}
                className="mt-2"
                maxLength={200}
                placeholder="Describe your changes"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="prompt_ui.scope">
                Allowed scope (shown as help text)
              </Label>
              <Textarea
                id="prompt_ui.scope"
                {...register("prompt_ui.scope")}
                className="mt-2"
                rows={2}
                maxLength={300}
                placeholder="e.g. Lighting, mood, and background only — the preset keeps the overall style."
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Example prompts</Label>
                <button
                  type="button"
                  onClick={() => examples.append("")}
                  className="text-text-secondary hover:text-cream-50 text-xs"
                  disabled={examples.fields.length >= 5}
                >
                  + Add example
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {examples.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <Input
                      {...register(`prompt_ui.examples.${index}`)}
                      maxLength={200}
                      placeholder={`Example ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => examples.remove(index)}
                      className="text-error/80 hover:text-error text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {capabilityErrors.length > 0 && (
          <div className={flagClass} role="alert">
            <p className="font-medium">
              This configuration does not fit the selected model.
            </p>
            <ul className="mt-1 list-disc pl-5">
              {capabilityErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Correct the settings above or switch to a compatible model —
              saving with unsupported settings is rejected server-side.
            </p>
          </div>
        )}
      </section>
  );
}
