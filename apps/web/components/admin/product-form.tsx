"use client";

import { useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
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
import { optionalNumberInput } from "./form-utils";
import type { ProviderModelOption } from "@/lib/db/provider-catalog";

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
  modelCatalog?: ProviderModelOption[];
}

export function ProductForm({
  type,
  initialData,
  categories: categoryList,
  onSubmit,
  assetPreviews,
  headerAction,
  modelCatalog = [],
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
              <div className="mt-2">
                <FormRichSelect
                  name="filter_config.identity_preservation"
                  label="Identity preservation"
                  options={[
                    { value: "very_high", label: "Very high", description: "Face stays closest to source" },
                    { value: "high", label: "High", description: "Strong likeness, light styling" },
                    { value: "medium", label: "Medium", description: "Balanced look and likeness" },
                    { value: "creative", label: "Creative", description: "Most stylized result" },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="poster_config.layout_template">Layout</Label>
              <div className="mt-2">
                <FormRichSelect
                  name="poster_config.layout_template"
                  label="Layout"
                  options={[
                    { value: "portrait", label: "Portrait", description: "Tall 3:4-style layout" },
                    { value: "square", label: "Square", description: "1:1 feed-friendly layout" },
                    { value: "landscape", label: "Landscape", description: "Wide banner layout" },
                  ]}
                />
              </div>
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
              <div className="mt-2">
                <FormRichSelect
                  name="poster_config.background_handling"
                  label="Background"
                  options={[
                    { value: "replace", label: "Replace", description: "AI regenerates the backdrop" },
                    { value: "preserve", label: "Preserve", description: "Keep the source background" },
                  ]}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
        <h2 className="text-cream-50 mb-4 text-lg font-semibold">AI recipe</h2>
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
              {...register("version.model_config.width", optionalNumberInput)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="version.model_config.height">Height</Label>
            <Input
              id="version.model_config.height"
              type="number"
              {...register("version.model_config.height", optionalNumberInput)}
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
              {...register("version.model_config.guidance_scale", optionalNumberInput)}
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
              {...register("version.model_config.num_inference_steps", optionalNumberInput)}
              className="mt-2"
            />
          </div>
        </div>
      </section>

      <OutputSizesField />

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
              {...register("version.input_validation_config.min_width", optionalNumberInput)}
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
              {...register("version.input_validation_config.min_height", optionalNumberInput)}
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
              {...register("version.input_validation_config.max_people_count", optionalNumberInput)}
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
              {...register("version.input_validation_config.max_face_count", optionalNumberInput)}
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
              {...register("version.post_process_config.resize_width", optionalNumberInput)}
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
              {...register("version.post_process_config.resize_height", optionalNumberInput)}
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
              {...register("version.post_process_config.quality", optionalNumberInput)}
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
