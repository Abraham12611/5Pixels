"use client";

import { useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productCreateSchema, type ProductCreateInput } from "@5pixels/shared";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AssetUploader } from "./asset-uploader";
import { FieldEditor } from "./field-editor";
import { normalizeEmptyCategory } from "@/lib/utils/category";

export interface ProductAssetPreview {
  publicUrl: string;
  mimeType: string;
}

type ProductFormInput = z.input<typeof productCreateSchema>;

const SAVE_TIMEOUT_MS = 45_000;

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

interface ProductFormProps {
  type: "filter" | "poster";
  initialData?: ProductCreateInput & { id?: string };
  categories: { id: string; slug: string; name: string }[];
  onSubmit: (data: ProductCreateInput) => Promise<{ id: string }>;
  assetPreviews?: Partial<
    Record<
      "hero" | "poster" | "preview-video" | "preview-gif",
      ProductAssetPreview
    >
  >;
  headerAction?: React.ReactNode;
}

export function ProductForm({
  type,
  initialData,
  categories: categoryList,
  onSubmit,
  assetPreviews,
  headerAction,
}: ProductFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string>();
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
      credit_cost: 1,
      featured_rank: undefined,
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
        credit_cost: 1,
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
    formState: { errors, isSubmitting },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "version.output_sizes",
  });

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
    try {
      const product = await saveWithTimeout(onSubmit(data));
      setSubmitSuccess(true);
      router.push(`/admin/${type}s/${product.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : `Unable to save ${type}. Please try again.`
      );
    }
  };

  const title = type === "filter" ? "Filter" : "Poster";

  return (
    <FormProvider {...methods}>
    <form
      onSubmit={handleSubmit(submitHandler, () => {
        setSubmitSuccess(false);
        setSubmitError("Please correct the highlighted fields before saving.");
      })}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-cream-50 text-2xl font-bold">
          {initialData?.id ? `Edit ${title}` : `New ${title}`}
        </h1>
        <div className="flex items-center gap-3">
          {headerAction}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : initialData?.id
                ? "Save changes"
                : `Create ${title}`}
          </Button>
        </div>
      </div>

      {submitError && (
        <div
          role="alert"
          className="border-error/30 bg-error/10 text-error rounded-xl border px-4 py-3 text-sm"
        >
          {submitError}
        </div>
      )}
      {submitSuccess && (
        <div
          role="status"
          className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-sm text-lime-400"
        >
          {title} saved successfully. Opening the editor…
        </div>
      )}

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">Basic info</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} className="mt-2" />
            {errors.name && (
              <p className="text-error mt-1 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register("slug")} className="mt-2" />
            {errors.slug && (
              <p className="text-error mt-1 text-sm">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="category_id">Category</Label>
              <Link
                href="/admin/categories"
                className="text-text-secondary hover:text-cream-50 text-xs"
              >
                Manage categories
              </Link>
            </div>
            <Select
              id="category_id"
              {...register("category_id", {
                setValueAs: normalizeEmptyCategory,
              })}
              className="mt-2"
            >
              <option value="">No category</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.category_id && (
              <p className="text-error mt-1 text-sm">
                {errors.category_id.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="public_status">Status</Label>
            <Select
              id="public_status"
              {...register("public_status")}
              className="mt-2"
            >
              <option value="draft">Draft</option>
              <option value="internal_test">Internal test</option>
              <option value="private_beta">Private beta</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="retired">Retired</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              id="visibility"
              {...register("visibility")}
              className="mt-2"
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="beta">Beta</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="credit_cost">Credit cost</Label>
            <Input
              id="credit_cost"
              type="number"
              {...register("credit_cost", { valueAsNumber: true })}
              className="mt-2"
            />
            {errors.credit_cost && (
              <p className="text-error mt-1 text-sm">
                {errors.credit_cost.message}
              </p>
            )}
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
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">Media</h2>
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
              setValue("preview_video_asset_id", id, { shouldDirty: true })
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
              setValue("preview_gif_asset_id", id, { shouldDirty: true })
            }
            disabled={isSubmitting}
          />
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">
          {type === "filter" ? "Filter settings" : "Poster settings"}
        </h2>

        {type === "filter" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="filter_config.style_archetype">
                Style archetype
              </Label>
              <Input
                id="filter_config.style_archetype"
                {...register("filter_config.style_archetype")}
                className="mt-2"
              />
              {errors.filter_config?.style_archetype && (
                <p className="text-error mt-1 text-sm">
                  {errors.filter_config.style_archetype.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="filter_config.identity_preservation">
                Identity preservation
              </Label>
              <Select
                id="filter_config.identity_preservation"
                {...register("filter_config.identity_preservation")}
                className="mt-2"
              >
                <option value="very_high">Very high</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="creative">Creative</option>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="poster_config.layout_template">Layout</Label>
              <Select
                id="poster_config.layout_template"
                {...register("poster_config.layout_template")}
                className="mt-2"
              >
                <option value="portrait">Portrait</option>
                <option value="square">Square</option>
                <option value="landscape">Landscape</option>
              </Select>
              {errors.poster_config?.layout_template && (
                <p className="text-error mt-1 text-sm">
                  {errors.poster_config.layout_template.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="poster_config.background_handling">
                Background
              </Label>
              <Select
                id="poster_config.background_handling"
                {...register("poster_config.background_handling")}
                className="mt-2"
              >
                <option value="replace">Replace</option>
                <option value="preserve">Preserve</option>
              </Select>
            </div>
          </div>
        )}
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">AI recipe</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="version.provider_strategy.primary_provider">
              Primary provider
            </Label>
            <Input
              id="version.provider_strategy.primary_provider"
              {...register("version.provider_strategy.primary_provider")}
              className="mt-2"
              placeholder="e.g. fal-ai"
            />
          </div>
          <div>
            <Label htmlFor="version.provider_strategy.primary_model">
              Primary model
            </Label>
            <Input
              id="version.provider_strategy.primary_model"
              {...register("version.provider_strategy.primary_model")}
              className="mt-2"
              placeholder="e.g. flux/dev/image-to-image"
            />
          </div>
          <div>
            <Label htmlFor="version.provider_strategy.fallback_provider">
              Fallback provider (optional)
            </Label>
            <Input
              id="version.provider_strategy.fallback_provider"
              {...register("version.provider_strategy.fallback_provider")}
              className="mt-2"
              placeholder="e.g. fal-ai"
            />
          </div>
          <div>
            <Label htmlFor="version.provider_strategy.fallback_model">
              Fallback model (optional)
            </Label>
            <Input
              id="version.provider_strategy.fallback_model"
              {...register("version.provider_strategy.fallback_model")}
              className="mt-2"
              placeholder="e.g. flux-pro/image-to-image"
            />
          </div>
        </div>
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

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">
          Model parameters
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <Label htmlFor="version.model_config.width">Width</Label>
            <Input
              id="version.model_config.width"
              type="number"
              {...register("version.model_config.width", {
                valueAsNumber: true,
              })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="version.model_config.height">Height</Label>
            <Input
              id="version.model_config.height"
              type="number"
              {...register("version.model_config.height", {
                valueAsNumber: true,
              })}
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
              {...register("version.model_config.guidance_scale", {
                valueAsNumber: true,
              })}
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
              {...register("version.model_config.num_inference_steps", {
                valueAsNumber: true,
              })}
              className="mt-2"
            />
          </div>
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-cream-50 text-lg font-semibold">Output sizes</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({ name: "", width: 1024, height: 1024, is_default: false })
            }
          >
            Add size
          </Button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid items-end gap-4 sm:grid-cols-[1fr,120px,120px,auto,auto]"
            >
              <div>
                <Label htmlFor={`version.output_sizes.${index}.name`}>
                  Name
                </Label>
                <Input
                  id={`version.output_sizes.${index}.name`}
                  {...register(`version.output_sizes.${index}.name`)}
                  className="mt-2"
                  placeholder="e.g. Square"
                />
              </div>
              <div>
                <Label htmlFor={`version.output_sizes.${index}.width`}>
                  Width
                </Label>
                <Input
                  id={`version.output_sizes.${index}.width`}
                  type="number"
                  {...register(`version.output_sizes.${index}.width`, {
                    valueAsNumber: true,
                  })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor={`version.output_sizes.${index}.height`}>
                  Height
                </Label>
                <Input
                  id={`version.output_sizes.${index}.height`}
                  type="number"
                  {...register(`version.output_sizes.${index}.height`, {
                    valueAsNumber: true,
                  })}
                  className="mt-2"
                />
              </div>
              <label className="text-cream-50 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  {...register(`version.output_sizes.${index}.is_default`)}
                  className="h-4 w-4 rounded text-lime-500"
                />
                Default
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="text-error"
              >
                Remove
              </Button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-text-secondary text-sm">
              No output sizes defined. Consumers will see a default 1024×1024
              option.
            </p>
          )}
          {errors.version?.output_sizes && (
            <p className="text-error text-sm">
              {errors.version.output_sizes.message}
            </p>
          )}
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">
          Input compatibility
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <Label htmlFor="version.input_validation_config.min_width">
              Min width (px)
            </Label>
            <Input
              id="version.input_validation_config.min_width"
              type="number"
              {...register("version.input_validation_config.min_width", {
                valueAsNumber: true,
              })}
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
              {...register("version.input_validation_config.min_height", {
                valueAsNumber: true,
              })}
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
              {...register("version.input_validation_config.max_people_count", {
                valueAsNumber: true,
              })}
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
              {...register("version.input_validation_config.max_face_count", {
                valueAsNumber: true,
              })}
              className="mt-2"
            />
          </div>
        </div>
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">
          Post-processing
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <Label htmlFor="version.post_process_config.resize_width">
              Resize width
            </Label>
            <Input
              id="version.post_process_config.resize_width"
              type="number"
              {...register("version.post_process_config.resize_width", {
                valueAsNumber: true,
              })}
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
              {...register("version.post_process_config.resize_height", {
                valueAsNumber: true,
              })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="version.post_process_config.format">
              Output format
            </Label>
            <Select
              id="version.post_process_config.format"
              {...register("version.post_process_config.format")}
              className="mt-2"
            >
              <option value="webp">WebP</option>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="jpg">JPG</option>
            </Select>
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
              {...register("version.post_process_config.quality", {
                valueAsNumber: true,
              })}
              className="mt-2"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-6">
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

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">
          Safety config
        </h2>
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

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <FieldEditor />
      </section>
    </form>
    </FormProvider>
  );
}
