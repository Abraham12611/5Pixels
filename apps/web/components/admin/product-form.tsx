"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productCreateSchema, type ProductCreateInput } from "@5pixels/shared";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AssetUploader } from "./asset-uploader";
import { FieldEditor } from "./field-editor";
import { OutputSizesField } from "./output-sizes-field";
import { ProviderStrategyFields } from "./provider-strategy-fields";
import { FormRichSelect } from "./form-rich-select";
import {
  formSnapshotsEqual,
  optionalNumberInput,
} from "./form-utils";
import {
  PresetFamilyFields,
  PromptEditFields,
  UserImageInputFields,
  type EligibleParentOption,
} from "./preset-studio-fields";
import { PresetCreativeSettings } from "./preset-creative-settings";
import { PresetPreviewPanel } from "./preset-preview-panel";
import {
  EditorSectionGroup,
  EditorSectionNav,
  FORM_SECTIONS,
  editorSectionForField,
  focusFieldInSection,
  type EditorSectionDef,
} from "./editor-shell";
import { SaveDock } from "./save-dock";
import {
  FormErrorSummary,
  flattenFormErrors,
  type FormErrorItem,
} from "./form-error-summary";
import { UnsavedChangesGuard } from "./unsaved-changes-guard";
import { generatePromptRecipeDraft } from "@/lib/prompt-recipe/actions";
import type { ParentCandidate } from "@/lib/validation/preset-family";
import type { ProviderModelOption } from "@/lib/db/provider-catalog";

export interface ProductAssetPreview {
  publicUrl: string;
  mimeType: string;
}

type ProductFormInput = z.input<typeof productCreateSchema>;

const SAVE_TIMEOUT_MS = 45_000;
const FORM_ID = "product-editor-form";

function saveWithTimeout<T>(promise: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            "Saving is taking longer than expected. Check the product list before retrying."
          )
        ),
      SAVE_TIMEOUT_MS
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

const sectionClass =
  "border-cream-100/10 bg-charcoal-850 rounded-2xl border p-4 sm:p-6";
const sectionHeadingClass = "text-cream-50 mb-4 text-lg font-semibold";

interface ProductFormProps {
  type: "filter" | "poster";
  initialData?: ProductCreateInput & { id?: string };
  categories: { id: string; slug: string; name: string }[];
  /**
   * `{ id }` on success. Expected server-side rejections return `{ error }`
   * with a user-safe message — a thrown error crossing the action boundary
   * arrives minified (React #441), so known failures must come back as data.
   */
  onSubmit: (
    data: ProductCreateInput
  ) => Promise<{ id: string } | { error: string }>;
  assetPreviews?: Partial<
    Record<
      "hero" | "poster" | "preview-video" | "preview-gif",
      ProductAssetPreview
    >
  >;
  modelCatalog?: ProviderModelOption[];
  /** Preset Studio 2.0 (#177): root presets eligible as family parents. */
  eligibleParents?: EligibleParentOption[];
  familySchemaAvailable?: boolean;
  /** A preset that already has variants cannot itself become a variant. */
  hasChildren?: boolean;
  /** Private reference assets consuming the route's input-image budget. */
  adminReferenceCount?: number;
  /** Resolved current parent for family validation feedback. */
  currentParent?: ParentCandidate | null;
  /**
   * When set, saving is disabled entirely and the reason is shown in the
   * save dock — e.g. a legacy preset with no editable version (#233).
   */
  saveDisabledReason?: string;
  /**
   * Extra nav entries for page-level sections rendered via `children`
   * (edit pages: References, Publishing & history).
   */
  additionalSections?: EditorSectionDef[];
  /**
   * Page-level blocks rendered after the form but still inside the
   * FormProvider — they can read dirty/save state via RHF context.
   */
  children?: React.ReactNode;
}

export function ProductForm({
  type,
  initialData,
  categories: categoryList,
  onSubmit,
  assetPreviews,
  modelCatalog = [],
  eligibleParents = [],
  familySchemaAvailable = true,
  hasChildren = false,
  adminReferenceCount = 0,
  saveDisabledReason,
  currentParent = null,
  additionalSections,
  children,
}: ProductFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorItems, setErrorItems] = useState<FormErrorItem[]>([]);
  const [recipeGenerating, setRecipeGenerating] = useState(false);
  const [recipeError, setRecipeError] = useState<string>();
  const defaultValues = useMemo<ProductCreateInput>(
    () => ({
      type,
      name: "",
      slug: "",
      short_description: "",
      long_description: "",
      public_status: "draft",
      visibility: "public",
      hero_asset_id: undefined,
      poster_asset_id: undefined,
      preview_video_asset_id: undefined,
      preview_gif_asset_id: undefined,
      credit_cost: 0,
      featured_rank: undefined,
      parent_preset_id: undefined,
      standalone_discoverable: false,
      variant_display_name: undefined,
      variant_sort_order: 0,
      version: {
        version_number: 1,
        state: "draft",
        private_instruction_template: "",
        private_negative_instruction: "",
        provider_strategy: {
          primary_provider: "",
          primary_model: "",
        },
        model_config: {},
        output_sizes: [],
        input_validation_config: {},
        input_capability: {
          input_mode: "single",
          input_min_images: 1,
          input_max_images: 1,
          input_image_roles: [],
          prompt_override_enabled: false,
          prompt_max_chars: 0,
        },
        post_process_config: {
          crop: false,
          format: "webp",
          quality: 90,
          metadata_stripped: true,
        },
        safety_config: {
          allowed_nsfw: false,
          block_public_figures: true,
          block_minors: true,
        },
        credit_cost: 0,
      },
      fields: [],
      filter_config:
        type === "filter"
          ? { style_archetype: "", identity_preservation: "high" }
          : undefined,
      poster_config:
        type === "poster"
          ? {
              layout_template: "portrait",
              text_fields: [],
              text_layer_config: {
                position: "bottom",
                size: "medium",
                color: "#F7F2E8",
                alignment: "center",
              },
              background_handling: "replace",
            }
          : undefined,
      ...initialData,
    }),
    [initialData, type]
  );

  const methods = useForm<ProductFormInput, unknown, ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues,
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = methods;

  // Catalog-status actions update the product independently and call
  // router.refresh(). RHF only consumes defaultValues at mount; without
  // syncing this one field, Save Changes can submit the old "active" value
  // even while Publishing & history correctly displays "draft".
  // Preserve all other unsaved form edits; never reset the entire form.
  const lastServerStatus = useRef({
    productId: initialData?.id,
    status: initialData?.public_status,
  });
  useEffect(() => {
    const serverStatus = initialData?.public_status;
    if (!initialData?.id || !serverStatus) return;
    const previous = lastServerStatus.current;
    if (
      previous.productId !== initialData.id ||
      previous.status !== serverStatus
    ) {
      lastServerStatus.current = {
        productId: initialData.id,
        status: serverStatus,
      };
      setValue("public_status", serverStatus, { shouldDirty: true });
    }
  }, [initialData?.id, initialData?.public_status, setValue]);

  // The "saved" acknowledgement is transient — revert the dock to the
  // steady-state label a few seconds after the server confirms.
  useEffect(() => {
    if (!submitSuccess) return;
    const timer = setTimeout(() => setSubmitSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, [submitSuccess]);

  const [heroAssetId, posterAssetId, previewVideoAssetId, previewGifAssetId] =
    useWatch({
      control,
      name: [
        "hero_asset_id",
        "poster_asset_id",
        "preview_video_asset_id",
        "preview_gif_asset_id",
      ],
    });

  const submitHandler = async (data: ProductCreateInput) => {
    setSubmitError(undefined);
    setSubmitSuccess(false);
    setErrorItems([]);
    if (saveDisabledReason) {
      // Defensive — the dock button is disabled, but Enter inside an input
      // can still requestSubmit the form.
      setSubmitError(saveDisabledReason);
      return;
    }
    // Capture the raw form snapshot *before* the save resolves. `data` is
    // zod-normalized output — the schema strips unknown JSONB keys and fills
    // schema defaults, so it can differ structurally from what the form
    // actually holds. Comparing or baselining against it misreads those
    // normalization gaps as in-flight edits and leaves the form dirty after
    // a clean save; the raw snapshot is the only truthful reference. Deep
    // clone — RHF mutates the values tree in place via setValue, so a
    // shallow copy would absorb mid-flight edits and compare equal.
    const submittedValues = structuredClone(
      getValues()
    ) as ProductFormInput;
    try {
      const result = await saveWithTimeout(onSubmit(data));
      if ("error" in result && result.error) {
        // Expected rejection reported as data — preserve all edits.
        setSubmitError(result.error);
        return;
      }
      const product = result as { id: string };
      // Compare the complete live snapshot against the submitted snapshot.
      // `dirtyFields` is measured against the *previous* baseline, so it
      // misses edits made mid-flight that revert a field to its original
      // value — and leaf-level restore can't represent array removal or
      // reordering anyway.
      const savedValues = {
        ...submittedValues,
        id: product.id,
      } as unknown as ProductFormInput;
      const liveValues = {
        ...getValues(),
        id: product.id,
      } as unknown as ProductFormInput;
      const hasInFlightEdits = !formSnapshotsEqual(savedValues, liveValues);
      // Baseline = server-acknowledged values plus the product id. On a
      // create page the id in the next submission makes the route-level
      // action update the just-created product instead of inserting a
      // duplicate while the form is still mounted.
      reset(savedValues);
      if (hasInFlightEdits) {
        // Restore the live snapshot while keeping the saved values as the
        // form baseline — dirty state recomputes against them, so the
        // pending edits stay unsaved and visible instead of being reverted
        // or folded into the clean baseline.
        reset(liveValues, { keepDefaultValues: true });
      }
      setSubmitSuccess(true);
      // A real navigation/refetch re-renders the server component and would
      // discard the edits restored above — only transition (create → edit)
      // or refresh when nothing unsaved remains.
      if (!hasInFlightEdits) {
        router.push(`/admin/${type}s/${product.id}`);
        router.refresh();
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : `Unable to save ${type}. Please try again.`
      );
    }
  };

  // Invalid submit → actionable summary + scroll/focus the first offender.
  const onInvalid = (invalid: FieldErrors<ProductFormInput>) => {
    setSubmitSuccess(false);
    setSubmitError(undefined);
    const items = flattenFormErrors(invalid).map((item) => ({
      ...item,
      sectionId: editorSectionForField(item.path),
    }));
    setErrorItems(items);
    requestAnimationFrame(() => {
      if (items[0]) focusFieldInSection(items[0].path);
    });
  };

  // Manual recipe generation — fills the field from the form's current
  // values (drafts included); nothing persists until Save.
  const handleGenerateRecipe = async () => {
    const existing = getValues("public_prompt_recipe");
    if (
      existing?.trim() &&
      !window.confirm("Replace the existing recipe text?")
    ) {
      return;
    }
    setRecipeGenerating(true);
    setRecipeError(undefined);
    try {
      const values = getValues();
      const result = await generatePromptRecipeDraft({
        name: values.name ?? "",
        type,
        short_description: values.short_description,
        long_description: values.long_description,
        private_instruction_template:
          values.version?.private_instruction_template,
        private_negative_instruction:
          values.version?.private_negative_instruction,
        hero_asset_id: values.hero_asset_id,
        poster_asset_id: values.poster_asset_id,
      });
      if (result.ok) {
        setValue("public_prompt_recipe", result.recipe, {
          shouldDirty: true,
        });
      } else {
        setRecipeError(result.error);
      }
    } catch (err) {
      setRecipeError(
        err instanceof Error ? err.message : "Recipe generation failed."
      );
    } finally {
      setRecipeGenerating(false);
    }
  };

  const title = type === "filter" ? "Filter" : "Poster";
  // True once a product exists — loaded, or created by a save that stayed
  // mounted because in-flight edits remained.
  const productId = useWatch({ control, name: "id" });
  const isEdit = Boolean(initialData?.id ?? productId);
  const navSections = useMemo(
    () =>
      additionalSections?.length
        ? [...FORM_SECTIONS, ...additionalSections]
        : FORM_SECTIONS,
    [additionalSections]
  );

  return (
    <FormProvider {...methods}>
      <div>
        <UnsavedChangesGuard active={isDirty || isSubmitting} />
        <EditorSectionNav sections={navSections} />
        <form
          id={FORM_ID}
          onSubmit={handleSubmit(submitHandler, onInvalid)}
          className="space-y-8"
        >
          <FormErrorSummary items={errorItems} sections={navSections} />
          {submitError && (
            <div
              role="alert"
              className="border-error/30 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm"
            >
              {submitError}
            </div>
          )}

          <EditorSectionGroup id="overview">
            <section className={sectionClass}>
              <h2 className={sectionHeadingClass}>Basic info</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...register("name")} className="mt-2" />
                  {errors.name && (
                    <p className="text-error mt-1 text-sm">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" {...register("slug")} className="mt-2" />
                  {errors.slug && (
                    <p className="text-error mt-1 text-sm">
                      {errors.slug.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="category_id">Category</Label>
                    <Link
                      href="/admin/categories"
                      className="text-text-secondary hover:text-cream-50 text-xs"
                    >
                      Manage categories
                    </Link>
                  </div>
                  <div className="mt-2">
                    <FormRichSelect
                      name="category_id"
                      label="Category"
                      noneLabel="No category"
                      emptyToUndefined
                      searchable={categoryList.length > 12}
                      searchPlaceholder="Search categories…"
                      placeholder="No category"
                      options={categoryList.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                    />
                  </div>
                  {errors.category_id && (
                    <p className="text-error mt-1 text-sm">
                      {errors.category_id.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="public_status">Status</Label>
                  <div className="mt-2">
                    <FormRichSelect
                      name="public_status"
                      label="Status"
                      options={[
                        { value: "draft", label: "Draft", description: "Work in progress — not public" },
                        { value: "internal_test", label: "Internal test", description: "Staff and admins only" },
                        { value: "private_beta", label: "Private beta", description: "Limited beta audience" },
                        { value: "scheduled", label: "Scheduled", description: "Goes live on a set date" },
                        { value: "active", label: "Active", description: "Live for everyone" },
                        { value: "paused", label: "Paused", description: "Temporarily hidden" },
                        { value: "retired", label: "Retired", description: "Permanently removed" },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <div className="mt-2">
                    <FormRichSelect
                      name="visibility"
                      label="Visibility"
                      options={[
                        { value: "public", label: "Public", description: "Visible to all users" },
                        { value: "internal", label: "Internal", description: "Staff and admins only" },
                        { value: "beta", label: "Beta", description: "Beta testers only" },
                      ]}
                    />
                  </div>
                </div>

              </div>

              <div className="mt-6">
                <Label htmlFor="short_description">Short description</Label>
                <Input
                  id="short_description"
                  {...register("short_description")}
                  className="mt-2"
                />
              </div>

              <div className="mt-6">
                <Label htmlFor="long_description">Long description</Label>
                <Textarea
                  id="long_description"
                  {...register("long_description")}
                  className="mt-2"
                />
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="public_prompt_recipe">
                    Public prompt recipe
                  </Label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={recipeGenerating}
                    onClick={handleGenerateRecipe}
                  >
                    {recipeGenerating ? "Generating…" : "Generate with AI"}
                  </Button>
                </div>
                <Textarea
                  id="public_prompt_recipe"
                  {...register("public_prompt_recipe")}
                  className="mt-2 font-mono"
                  rows={5}
                  placeholder="Write the steps/creative prompt a reader could reuse — public editorial copy only."
                />
                {recipeError && (
                  <p className="text-error mt-1.5 text-xs">{recipeError}</p>
                )}
                <p className="text-text-muted mt-1.5 text-xs">
                  Optional. Shown in articles as a prefilled prompt recipe
                  readers can copy. This is public editorial copy — never
                  paste the real generation prompt or any private
                  instructions here. Auto-generated for published presets —
                  Generate fills it now from this form&apos;s current values
                  (review before saving).
                </p>
              </div>
            </section>

            <PresetFamilyFields
              eligibleParents={eligibleParents}
              schemaAvailable={familySchemaAvailable}
              productId={initialData?.id}
              hasChildren={hasChildren}
              currentParent={currentParent}
            />
          </EditorSectionGroup>

          <EditorSectionGroup id="media">
            <section className={sectionClass}>
              <h2 className={sectionHeadingClass}>Media</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <AssetUploader
                  role="hero"
                  label="Hero image"
                  value={heroAssetId}
                  initialPreviewUrl={assetPreviews?.hero?.publicUrl}
                  initialMimeType={assetPreviews?.hero?.mimeType}
                  onChange={(id) =>
                    setValue("hero_asset_id", id, { shouldDirty: true })
                  }
                  disabled={isSubmitting}
                />
                <AssetUploader
                  role="poster"
                  label="Poster image"
                  value={posterAssetId}
                  initialPreviewUrl={assetPreviews?.poster?.publicUrl}
                  initialMimeType={assetPreviews?.poster?.mimeType}
                  onChange={(id) =>
                    setValue("poster_asset_id", id, { shouldDirty: true })
                  }
                  disabled={isSubmitting}
                />
                <AssetUploader
                  role="preview-video"
                  label="Preview video"
                  value={previewVideoAssetId}
                  initialPreviewUrl={assetPreviews?.["preview-video"]?.publicUrl}
                  initialMimeType={assetPreviews?.["preview-video"]?.mimeType}
                  onChange={(id) =>
                    setValue("preview_video_asset_id", id, {
                      shouldDirty: true,
                    })
                  }
                  disabled={isSubmitting}
                />
                <AssetUploader
                  role="preview-gif"
                  label="Preview GIF"
                  value={previewGifAssetId}
                  initialPreviewUrl={assetPreviews?.["preview-gif"]?.publicUrl}
                  initialMimeType={assetPreviews?.["preview-gif"]?.mimeType}
                  onChange={(id) =>
                    setValue("preview_gif_asset_id", id, {
                      shouldDirty: true,
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>
            </section>

            {/* #223 (Engineer B) — stored sample media + poster composition
                mock + Test in Lab handoff. Reads draft values from context. */}
            <PresetPreviewPanel
              type={type}
              assetPreviews={assetPreviews}
              slug={initialData?.slug}
            />
          </EditorSectionGroup>

          <EditorSectionGroup id="creative">
            {/* #223 (Engineer B) — registers the filter_config and
                poster_config fields; do not re-register them inline. */}
            <PresetCreativeSettings type={type} />
          </EditorSectionGroup>

          <EditorSectionGroup id="ai-routing">
            <section className={sectionClass}>
              <h2 className={sectionHeadingClass}>AI recipe</h2>
              <ProviderStrategyFields catalog={modelCatalog} />
              <div className="mt-6">
                <Label htmlFor="version.private_instruction_template">
                  Private instruction template
                </Label>
                <Textarea
                  id="version.private_instruction_template"
                  {...register("version.private_instruction_template")}
                  className="mt-2"
                />
                {errors.version?.private_instruction_template && (
                  <p className="text-error mt-1 text-sm">
                    {errors.version.private_instruction_template.message}
                  </p>
                )}
              </div>
              <div className="mt-6">
                <Label htmlFor="version.private_negative_instruction">
                  Private negative instruction
                </Label>
                <Textarea
                  id="version.private_negative_instruction"
                  {...register("version.private_negative_instruction")}
                  className="mt-2"
                />
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className={sectionHeadingClass}>Model parameters</h2>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <Label htmlFor="version.model_config.width">Width</Label>
                  <Input
                    id="version.model_config.width"
                    type="number"
                    {...register(
                      "version.model_config.width",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.model_config.height">Height</Label>
                  <Input
                    id="version.model_config.height"
                    type="number"
                    {...register(
                      "version.model_config.height",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.model_config.guidance_scale">
                    Guidance scale
                  </Label>
                  <Input
                    id="version.model_config.guidance_scale"
                    type="number"
                    step="any"
                    {...register(
                      "version.model_config.guidance_scale",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.model_config.num_inference_steps">
                    Inference steps
                  </Label>
                  <Input
                    id="version.model_config.num_inference_steps"
                    type="number"
                    {...register(
                      "version.model_config.num_inference_steps",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
              </div>
            </section>
          </EditorSectionGroup>

          <EditorSectionGroup id="inputs">
            <UserImageInputFields adminReferenceCount={adminReferenceCount} />

            <PromptEditFields adminReferenceCount={adminReferenceCount} />

            <section className={sectionClass}>
              <FieldEditor />
            </section>
          </EditorSectionGroup>

          <EditorSectionGroup id="advanced">
            <OutputSizesField />

            <section className={sectionClass}>
              <h2 className={sectionHeadingClass}>Input compatibility</h2>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <Label htmlFor="version.input_validation_config.min_width">
                    Min width (px)
                  </Label>
                  <Input
                    id="version.input_validation_config.min_width"
                    type="number"
                    {...register(
                      "version.input_validation_config.min_width",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.input_validation_config.min_height">
                    Min height (px)
                  </Label>
                  <Input
                    id="version.input_validation_config.min_height"
                    type="number"
                    {...register(
                      "version.input_validation_config.min_height",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.input_validation_config.max_people_count">
                    Max people
                  </Label>
                  <Input
                    id="version.input_validation_config.max_people_count"
                    type="number"
                    {...register(
                      "version.input_validation_config.max_people_count",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.input_validation_config.max_face_count">
                    Max faces
                  </Label>
                  <Input
                    id="version.input_validation_config.max_face_count"
                    type="number"
                    {...register(
                      "version.input_validation_config.max_face_count",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className={sectionHeadingClass}>Post-processing</h2>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <Label htmlFor="version.post_process_config.resize_width">
                    Resize width
                  </Label>
                  <Input
                    id="version.post_process_config.resize_width"
                    type="number"
                    {...register(
                      "version.post_process_config.resize_width",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.post_process_config.resize_height">
                    Resize height
                  </Label>
                  <Input
                    id="version.post_process_config.resize_height"
                    type="number"
                    {...register(
                      "version.post_process_config.resize_height",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="version.post_process_config.format">
                    Output format
                  </Label>
                  <div className="mt-2">
                    <FormRichSelect
                      name="version.post_process_config.format"
                      label="Output format"
                      options={[
                        { value: "webp", label: "WebP", description: "Smallest files, wide support" },
                        { value: "png", label: "PNG", description: "Lossless, larger files" },
                        { value: "jpeg", label: "JPEG", description: "Universal compatibility" },
                        { value: "jpg", label: "JPG", description: "JPEG alias for legacy pipelines" },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="version.post_process_config.quality">
                    Quality (1–100)
                  </Label>
                  <Input
                    id="version.post_process_config.quality"
                    type="number"
                    min={1}
                    max={100}
                    {...register(
                      "version.post_process_config.quality",
                      optionalNumberInput
                    )}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-6">
                <label className="text-cream-50 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register("version.post_process_config.crop")}
                    className="h-4 w-4 rounded text-lime-500"
                  />
                  Crop to target size
                </label>
                <label className="text-cream-50 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register("version.post_process_config.metadata_stripped")}
                    className="h-4 w-4 rounded text-lime-500"
                  />
                  Strip metadata
                </label>
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className={sectionHeadingClass}>Safety config</h2>
              <div className="flex flex-wrap gap-6">
                <label className="text-cream-50 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register("version.safety_config.allowed_nsfw")}
                    className="h-4 w-4 rounded text-lime-500"
                  />
                  Allow NSFW
                </label>
                <label className="text-cream-50 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register("version.safety_config.block_public_figures")}
                    className="h-4 w-4 rounded text-lime-500"
                  />
                  Block public figures
                </label>
                <label className="text-cream-50 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register("version.safety_config.block_minors")}
                    className="h-4 w-4 rounded text-lime-500"
                  />
                  Block minors
                </label>
              </div>
            </section>
          </EditorSectionGroup>
        </form>
        {children}
        <SaveDock
          formId={FORM_ID}
          isEdit={isEdit}
          title={title}
          submitError={submitError}
          submitSuccess={submitSuccess}
          saveDisabledReason={saveDisabledReason}
        />
      </div>
    </FormProvider>
  );
}
