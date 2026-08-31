import { z } from "zod";
import {
  FIELD_TYPES,
  LIKENESS_LEVELS,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  VISIBILITY,
} from "./constants";

export const productTypeSchema = z.enum(PRODUCT_TYPES);
export const productStatusSchema = z.enum(PRODUCT_STATUSES);
export const visibilitySchema = z.enum(VISIBILITY);
export const likenessLevelSchema = z.enum(LIKENESS_LEVELS);
export const fieldTypeSchema = z.enum(FIELD_TYPES);

export const productFieldConfigSchema = z.object({
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
      })
    )
    .optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  placeholder: z.string().optional(),
});

export const productFieldValidationSchema = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
});

export const productFieldSchema = z.object({
  id: z.string().uuid().optional(),
  field_key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only."),
  label: z.string().min(1).max(120),
  help_text: z.string().max(500).optional(),
  field_type: fieldTypeSchema,
  required: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  config: productFieldConfigSchema.default({}),
  validation: productFieldValidationSchema.default({}),
  active: z.boolean().default(true),
});

export const providerStrategySchema = z.object({
  primary_provider: z.string().min(1),
  primary_model: z.string().min(1),
  fallback_provider: z.string().optional(),
  fallback_model: z.string().optional(),
});

export const modelConfigSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  aspect_ratio: z.string().optional(),
  seed: z.number().int().optional(),
  guidance_scale: z.number().optional(),
  num_inference_steps: z.number().int().positive().optional(),
});

export const inputValidationConfigSchema = z.object({
  min_width: z.number().int().positive().optional(),
  min_height: z.number().int().positive().optional(),
  accepted_aspect_ratios: z.array(z.string()).optional(),
  preferred_aspect_ratio: z.string().optional(),
  max_people_count: z.number().int().nonnegative().optional(),
  min_face_count: z.number().int().nonnegative().optional(),
  max_face_count: z.number().int().nonnegative().optional(),
});

export const postProcessConfigSchema = z.object({
  resize_width: z.number().int().positive().optional(),
  resize_height: z.number().int().positive().optional(),
  crop: z.boolean().default(false),
  format: z.enum(["jpg", "jpeg", "png", "webp"]).default("webp"),
  quality: z.number().int().min(1).max(100).default(90),
  metadata_stripped: z.boolean().default(true),
}).default({
  crop: false,
  format: "webp",
  quality: 90,
  metadata_stripped: true,
});

export const safetyConfigSchema = z.object({
  policy_version: z.string().min(1).optional(),
  allowed_nsfw: z.boolean().default(false),
  block_public_figures: z.boolean().default(true),
  block_minors: z.boolean().default(true),
}).default({
  allowed_nsfw: false,
  block_public_figures: true,
  block_minors: true,
});

export const productVersionSchema = z.object({
  id: z.string().uuid().optional(),
  version_number: z.number().int().positive().default(1),
  state: z.enum(["draft", "testing", "active", "retired"]).default("draft"),
  private_instruction_template: z.string().min(1),
  private_negative_instruction: z.string().optional(),
  provider_strategy: providerStrategySchema,
  model_config: modelConfigSchema.default({}),
  input_validation_config: inputValidationConfigSchema.default({}),
  post_process_config: postProcessConfigSchema,
  safety_config: safetyConfigSchema,
  credit_cost: z.number().int().nonnegative().default(0),
});

export const posterConfigSchema = z.object({
  layout_template: z.enum(["portrait", "square", "landscape"]),
  text_fields: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      default_value: z.string().optional(),
      required: z.boolean().default(false),
    })
  ),
  font_family: z.string().optional(),
  text_layer_config: z.object({
    position: z.enum(["top", "center", "bottom"]),
    size: z.enum(["small", "medium", "large"]),
    color: z.string().default("#F7F2E8"),
    alignment: z.enum(["left", "center", "right"]),
  }),
  background_handling: z.enum(["replace", "preserve"]).default("replace"),
});

export const filterConfigSchema = z.object({
  style_archetype: z.string().min(1),
  identity_preservation: z.enum(["very_high", "high", "medium", "creative"]).optional(),
});

export const baseProductSchema = z.object({
  id: z.string().uuid().optional(),
  type: productTypeSchema,
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  name: z.string().min(1).max(120),
  short_description: z.string().max(300).optional(),
  long_description: z.string().max(5000).optional(),
  category_id: z.string().uuid().optional(),
  public_status: productStatusSchema.default("draft"),
  visibility: visibilitySchema.default("public"),
  hero_asset_id: z.string().uuid().optional(),
  poster_asset_id: z.string().uuid().optional(),
  preview_video_asset_id: z.string().uuid().optional(),
  preview_gif_asset_id: z.string().uuid().optional(),
  likeness_level: likenessLevelSchema.optional(),
  featured_rank: z.number().int().nonnegative().optional(),
  credit_cost: z.number().int().nonnegative().default(0),
});

export const productCreateSchema = baseProductSchema
  .merge(
    z.object({
      version: productVersionSchema,
      fields: z.array(productFieldSchema).default([]),
      filter_config: filterConfigSchema.optional(),
      poster_config: posterConfigSchema.optional(),
    })
  )
  .refine(
    (data) => {
      if (data.type === "filter") return true;
      return data.poster_config?.layout_template !== undefined;
    },
    {
      message: "Poster layout template is required",
      path: ["poster_config", "layout_template"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "poster") return true;
      return data.filter_config?.style_archetype !== undefined;
    },
    {
      message: "Filter style archetype is required",
      path: ["filter_config", "style_archetype"],
    }
  );

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductFieldInput = z.infer<typeof productFieldSchema>;
export type ProductVersionInput = z.infer<typeof productVersionSchema>;
