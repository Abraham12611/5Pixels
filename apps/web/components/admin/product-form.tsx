"use client";

import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productCreateSchema, type ProductCreateInput } from "@5pixels/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

interface ProductFormProps {
  type: "filter" | "poster";
  initialData?: ProductCreateInput & { id?: string };
  categories: { id: string; slug: string; name: string }[];
  onSubmit: (data: ProductCreateInput) => Promise<{ id: string }>;
  headerAction?: React.ReactNode;
}

export function ProductForm({
  type,
  initialData,
  categories: categoryList,
  onSubmit,
  headerAction,
}: ProductFormProps) {
  const router = useRouter();
  const defaultValues = useMemo<ProductCreateInput>(
    () => ({
      type,
      name: "",
      slug: "",
      short_description: "",
      long_description: "",
      public_status: "draft",
      visibility: "public",
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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });

  const submitHandler = async (data: ProductCreateInput) => {
    const product = await onSubmit(data);
    router.push(`/admin/${type}s/${product.id}`);
  };

  const title = type === "filter" ? "Filter" : "Poster";

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cream-50">
          {initialData?.id ? `Edit ${title}` : `New ${title}`}
        </h1>
        <div className="flex items-center gap-3">
          {headerAction}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialData?.id ? "Save changes" : `Create ${title}`}
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-cream-100/10 bg-charcoal-850 p-6">
        <h2 className="mb-4 text-lg font-semibold text-cream-50">Basic info</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} className="mt-2" />
            {errors.name && (
              <p className="mt-1 text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register("slug")} className="mt-2" />
            {errors.slug && (
              <p className="mt-1 text-sm text-error">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select
              id="category_id"
              {...register("category_id")}
              className="mt-2"
            >
              <option value="">No category</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
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
              <p className="mt-1 text-sm text-error">
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

      <section className="rounded-2xl border border-cream-100/10 bg-charcoal-850 p-6">
        <h2 className="mb-4 text-lg font-semibold text-cream-50">
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
                <p className="mt-1 text-sm text-error">
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
                <p className="mt-1 text-sm text-error">
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

      <section className="rounded-2xl border border-cream-100/10 bg-charcoal-850 p-6">
        <h2 className="mb-4 text-lg font-semibold text-cream-50">AI recipe</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="version.provider_strategy.primary_provider">
              Provider
            </Label>
            <Input
              id="version.provider_strategy.primary_provider"
              {...register("version.provider_strategy.primary_provider")}
              className="mt-2"
              placeholder="e.g. fal.ai"
            />
          </div>
          <div>
            <Label htmlFor="version.provider_strategy.primary_model">Model</Label>
            <Input
              id="version.provider_strategy.primary_model"
              {...register("version.provider_strategy.primary_model")}
              className="mt-2"
              placeholder="e.g. flux-pro"
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
            <p className="mt-1 text-sm text-error">
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

      <section className="rounded-2xl border border-cream-100/10 bg-charcoal-850 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cream-50">User controls</h2>
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
          <p className="text-text-secondary">No fields configured.</p>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-cream-100/10 bg-charcoal-800 p-4"
            >
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
                  />
                </div>
                <div>
                  <Label htmlFor={`fields.${index}.field_type`}>Type</Label>
                  <Select
                    id={`fields.${index}.field_type`}
                    {...register(`fields.${index}.field_type`)}
                    className="mt-1"
                  >
                    <option value="short_text">Short text</option>
                    <option value="select">Select</option>
                    <option value="radio">Radio</option>
                    <option value="toggle">Toggle</option>
                    <option value="color">Color</option>
                    <option value="aspect_ratio">Aspect ratio</option>
                    <option value="intensity">Intensity</option>
                    <option value="layout">Layout</option>
                    <option value="background">Background</option>
                    <option value="wardrobe">Wardrobe</option>
                    <option value="era">Era</option>
                    <option value="mood">Mood</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
