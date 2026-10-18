import { z } from "zod";
import {
  FIELD_TYPES,
  INPUT_MODES,
  LIKENESS_LEVELS,
  MAX_INPUT_IMAGES,
  MAX_PROMPT_CHARS,
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
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
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

/**
 * Admin-owned input capability per product_version (#176). The DB defaults
 * and CHECKs mirror this schema exactly — keep them in sync.
 */
export const inputImageRoleSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9_]{1,32}$/, "Role names use lowercase letters, numbers, and underscores."),
  optional: z.boolean().default(false),
});

export const versionInputCapabilitySchema = z
  .object({
    input_mode: z.enum(INPUT_MODES).default("single"),
    input_min_images: z.number().int().min(1).max(MAX_INPUT_IMAGES).default(1),
    input_max_images: z.number().int().min(1).max(MAX_INPUT_IMAGES).default(1),
    input_image_roles: z.array(inputImageRoleSchema).max(MAX_INPUT_IMAGES).default([]),
    prompt_override_enabled: z.boolean().default(false),
    prompt_max_chars: z.number().int().min(0).max(MAX_PROMPT_CHARS).default(0),
  })
  .refine((c) => c.input_min_images <= c.input_max_images, {
    message: "min images cannot exceed max images",
    path: ["input_min_images"],
  })
  .refine((c) => c.input_mode !== "single" || (c.input_min_images === 1 && c.input_max_images === 1), {
    message: "Single-image presets require exactly one input",
    path: ["input_mode"],
  })
  .refine((c) => c.input_mode !== "multi" || c.input_max_images >= 2, {
    message: "Multi-image presets require max images of at least 2",
    path: ["input_max_images"],
  })
  .refine((c) => c.input_image_roles.length <= c.input_max_images, {
    message: "Declared roles cannot exceed max images",
    path: ["input_image_roles"],
  })
  .refine(
    (c) =>
      new Set(c.input_image_roles.map((r) => r.name)).size === c.input_image_roles.length,
    { message: "Role names must be unique", path: ["input_image_roles"] }
  )
  .refine((c) => c.prompt_override_enabled || c.prompt_max_chars === 0, {
    message: "Prompt max chars must be 0 while prompts are disabled",
    path: ["prompt_max_chars"],
  })
  .refine((c) => !c.prompt_override_enabled || c.prompt_max_chars >= 1, {
    message: "Enabled prompts need a max length of at least 1",
    path: ["prompt_max_chars"],
  });

export const outputSizeSchema = z.object({
  name: z.string().min(1).max(120),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  is_default: z.boolean().default(false),
  // "Match photo" rows resolve real dims from the uploaded source image;
  // width/height are the fallback when source dims can't be read.
  match_source: z.boolean().default(false),
  // "Match reference" rows resolve real dims from the preset's first
  // reference asset; width/height are again just a fallback.
  match_reference: z.boolean().default(false),
});

export const productVersionSchema = z.object({
  id: z.string().uuid().optional(),
  version_number: z.number().int().positive().default(1),
  state: z.enum(["draft", "testing", "active", "retired"]).default("draft"),
  private_instruction_template: z.string().min(1),
  private_negative_instruction: z.string().optional(),
  provider_strategy: providerStrategySchema,
  model_config: modelConfigSchema.default({}),
  output_sizes: z.array(outputSizeSchema).optional(),
  input_validation_config: inputValidationConfigSchema.default({}),
  input_capability: versionInputCapabilitySchema.default({
    input_mode: "single",
    input_min_images: 1,
    input_max_images: 1,
    input_image_roles: [],
    prompt_override_enabled: false,
    prompt_max_chars: 0,
  }),
  post_process_config: postProcessConfigSchema,
  safety_config: safetyConfigSchema,
  credit_cost: z.number().nonnegative().default(0),
}).refine(
  (data) => {
    if (!data.output_sizes) return true;
    return data.output_sizes.every((size) => size.width * size.height <= 4_000_000);
  },
  {
    message: "Each output size must be 4 megapixels or less",
    path: ["output_sizes"],
  }
);

/**
 * Admin-authored consumer-facing copy for the optional prompt composer
 * (#177). Product-level presentation config persisted in
 * `products.metadata.prompt_ui` — deliberately separate from
 * `public_prompt_recipe` (article editorial copy) and from the hidden
 * `private_instruction_template` recipe. Only rendered by the consumer
 * composer when the published version's `prompt_override_enabled` is true.
 */
export const promptUiConfigSchema = z.object({
  placeholder: z.string().max(200).optional(),
  /** Plain-language description of what the user may change (shown as help text). */
  scope: z.string().max(300).optional(),
  examples: z.array(z.string().max(200)).max(5).default([]),
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

/** Single-level preset family fields — children only (#176). The DB trigger
 *  enforces no-nesting/no-cycles; this schema validates the writable shape. */
export const presetFamilyFieldsSchema = z.object({
  parent_preset_id: z.string().uuid().nullable().optional(),
  standalone_discoverable: z.boolean().default(false),
  variant_display_name: z.string().max(120).nullable().optional(),
  variant_sort_order: z.number().int().nonnegative().default(0),
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
  /** Approved public editorial recipe for article promptRecipe blocks (#128).
   * Hand-written editorial copy — NEVER the private generation recipe. */
  public_prompt_recipe: z.string().max(8000).optional(),
  category_id: z.string().uuid().optional(),
  public_status: productStatusSchema.default("draft"),
  visibility: visibilitySchema.default("public"),
  hero_asset_id: z.string().uuid().optional(),
  poster_asset_id: z.string().uuid().optional(),
  preview_video_asset_id: z.string().uuid().optional(),
  preview_gif_asset_id: z.string().uuid().optional(),
  likeness_level: likenessLevelSchema.optional(),
  featured_rank: z.number().int().nonnegative().optional(),
  credit_cost: z.number().nonnegative().default(0),
  parent_preset_id: z.string().uuid().nullable().optional(),
  standalone_discoverable: z.boolean().default(false),
  variant_display_name: z.string().max(120).nullable().optional(),
  variant_sort_order: z.number().int().nonnegative().default(0),
  prompt_ui: promptUiConfigSchema.optional(),
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
  )
  // Variant-only family fields require a parent (#176) — mirrors the
  // products_variant_fields_require_parent CHECK. Kept on the create schema
  // rather than baseProductSchema because Zod 4 .merge() rejects refined
  // object schemas.
  .refine(
    (data) =>
      data.parent_preset_id != null ||
      (!data.standalone_discoverable &&
        data.variant_display_name == null &&
        data.variant_sort_order === 0),
    {
      message: "Variant fields require a parent preset",
      path: ["parent_preset_id"],
    }
  );

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductFieldInput = z.infer<typeof productFieldSchema>;
export type ProductVersionInput = z.infer<typeof productVersionSchema>;

// ---------------------------------------------------------------------------
// Generation input contract (#176 / ADR docs/adr/001)
// ---------------------------------------------------------------------------

/** One ordered generation input — an owned asset plus optional declared role. */
export const generationInputAssetRefSchema = z.object({
  asset_id: z.string().uuid(),
  role: z
    .string()
    .regex(/^[a-z0-9_]{1,32}$/)
    .optional(),
});

/** Ordered input list as submitted to create_generation / pending replay. */
export const generationInputsSchema = z
  .array(generationInputAssetRefSchema)
  .min(1)
  .max(MAX_INPUT_IMAGES);

/**
 * The wire shape of a create-generation request. `prompt` is only accepted
 * when the pinned product_version enables it — the server re-validates
 * regardless of what the client sends.
 */
export const createGenerationRequestSchema = z.object({
  productId: z.string().uuid(),
  productVersionId: z.string().uuid(),
  inputs: generationInputsSchema,
  prompt: z.string().max(MAX_PROMPT_CHARS).optional(),
  options: z.record(z.string(), z.unknown()).default({}),
  outputSize: outputSizeSchema,
  idempotencyKey: z.string().min(16).max(200),
});

// ---------------------------------------------------------------------------
// Public family contract — mirrors get_preset_family / catalog RPCs
// ---------------------------------------------------------------------------

/** Public projection of a version's input capability — no provider data. */
export const publicInputCapabilitySchema = z.object({
  mode: z.enum(INPUT_MODES),
  min_images: z.number().int(),
  max_images: z.number().int(),
  roles: z.array(inputImageRoleSchema).default([]),
  prompt: z.object({
    enabled: z.boolean(),
    max_chars: z.number().int(),
  }),
});

export const presetFamilyMemberSchema = z.object({
  product_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  variant_display_name: z.string().nullable(),
  variant_sort_order: z.number().int(),
  is_parent: z.boolean(),
  is_current: z.boolean(),
  public_status: z.string(),
  credit_cost: z.number(),
  hero_asset_id: z.string().uuid().nullable(),
  poster_asset_id: z.string().uuid().nullable(),
  preview_gif_asset_id: z.string().uuid().nullable(),
  preview_video_asset_id: z.string().uuid().nullable(),
});

export const presetFamilySchema = z.object({
  family_id: z.string().uuid(),
  members: z.array(presetFamilyMemberSchema),
});

export type GenerationInputAssetRef = z.infer<typeof generationInputAssetRefSchema>;
export type CreateGenerationRequest = z.infer<typeof createGenerationRequestSchema>;
export type VersionInputCapability = z.infer<typeof versionInputCapabilitySchema>;
export type PublicInputCapabilityDto = z.infer<typeof publicInputCapabilitySchema>;
export type PresetFamilyMember = z.infer<typeof presetFamilyMemberSchema>;
export type PresetFamily = z.infer<typeof presetFamilySchema>;
