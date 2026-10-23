/**
 * 5Pixels Preset Factory — typed service contract (#271, epic #270).
 *
 * This module is the single source of truth for the narrow admin API that
 * Engineer B's private ChatGPT MCP plugin consumes. It is a PURE module:
 * no server-only imports, no Supabase client construction — safe for the
 * MCP layer to import for request/response typing and fixture generation.
 *
 * Contract version: preset-factory.v1
 *
 * Security posture baked into the wire format:
 *   - Server-controlled fields (product id, public_status, version id /
 *     number / state, audit/author ids) are NOT part of the input schema —
 *     payloads that carry them are rejected as unknown keys, so a client
 *     can never forge an active preset, a version state, or authorship.
 *   - Every mutation is admin/owner gated twice: once at the service
 *     context and again inside the SECURITY DEFINER RPC via
 *     is_admin()/is_owner() on auth.uid().
 *   - Nothing in this contract can start a generation, run a preset test,
 *     call a provider, publish, activate, or schedule anything.
 */

import { z } from "zod";
import {
  ASSET_ROLES,
  filterConfigSchema,
  inputValidationConfigSchema,
  likenessLevelSchema,
  modelConfigSchema,
  outputSizeSchema,
  posterConfigSchema,
  postProcessConfigSchema,
  productFieldSchema,
  productStatusSchema,
  productTypeSchema,
  promptUiConfigSchema,
  providerStrategySchema,
  safetyConfigSchema,
  versionInputCapabilitySchema,
  visibilitySchema,
} from "@5pixels/shared";

export const PRESET_FACTORY_CONTRACT_VERSION = "preset-factory.v1" as const;

/** Hard bounds for batch operations — first release is synchronous. */
export const MAX_BATCH_ITEMS = 25;
export const MAX_FIELDS_PER_PRESET = 64;
export const MAX_ASSET_LINKS_PER_PRESET = 32;
export const MAX_CATALOG_PAGE = 200;

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

export const FACTORY_ERROR_CODES = [
  /** No authenticated session behind the call. */
  "unauthorized",
  /** Authenticated but not admin/owner — writes always fail closed. */
  "forbidden",
  /** Zod/domain validation failure. `field` points at the offending path. */
  "validation_failed",
  /** Product slug already exists (or collided under concurrency). */
  "slug_conflict",
  /** category_id does not reference an existing category. */
  "category_not_found",
  /** Category slug taken by a different category — see details.existing. */
  "category_conflict",
  /** parent_preset_id fails single-level family rules. */
  "parent_invalid",
  /** Declared input capability exceeds the verified route capability. */
  "capability_invalid",
  /** Provider/model is not in the server-verified catalog or unresolvable. */
  "model_unverified",
  /** Referenced asset missing, invisible, rejected, or wrong media kind. */
  "asset_invalid",
  /** Batch exceeds MAX_BATCH_ITEMS. */
  "batch_limit_exceeded",
  /** client_item_id / idempotency_key / slug duplicated inside the batch. */
  "duplicate_item_key",
  /** Idempotency key replayed with a different payload, or row incomplete. */
  "idempotency_conflict",
  /** The atomic RPC rejected the write — see message. */
  "persistence_failed",
  /** Unexpected server failure. */
  "internal_error",
] as const;

export type FactoryErrorCode = (typeof FACTORY_ERROR_CODES)[number];

export const factoryErrorSchema = z.object({
  code: z.enum(FACTORY_ERROR_CODES),
  /** Safe, actionable message — never raw Postgres/provider detail. */
  message: z.string(),
  /** Dot path to the offending field inside the item, when applicable. */
  field: z.string().optional(),
  /** Optional structured extras (e.g. the existing category on conflict). */
  details: z.record(z.string(), z.unknown()).optional(),
});
export type FactoryError = z.infer<typeof factoryErrorSchema>;

export type FactoryResult<T> =
  { ok: true; data: T } | { ok: false; error: FactoryError };

// ---------------------------------------------------------------------------
// Write payloads — strict objects: unknown keys (public_status, state, ids)
// are rejected rather than silently stripped.
// ---------------------------------------------------------------------------

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only.");

/**
 * Writable product surface for a NEW draft preset. Deliberately narrower
 * than `productCreateSchema`: no `id`, no `public_status`, and
 * `public_prompt_recipe` is allowed only as admin-authored editorial copy.
 * Family fields mirror presetFamilyFieldsSchema (single level, children
 * only).
 */
export const presetDraftProductSchema = z
  .strictObject({
    type: productTypeSchema,
    slug: slugSchema,
    name: z.string().min(1).max(120),
    short_description: z.string().max(300).optional(),
    long_description: z.string().max(5000).optional(),
    /** Public editorial copy only — NEVER the private recipe. */
    public_prompt_recipe: z.string().max(8000).optional(),
    category_id: z.string().uuid().optional(),
    visibility: visibilitySchema.default("public"),
    hero_asset_id: z.string().uuid().optional(),
    poster_asset_id: z.string().uuid().optional(),
    preview_video_asset_id: z.string().uuid().optional(),
    preview_gif_asset_id: z.string().uuid().optional(),
    likeness_level: likenessLevelSchema.optional(),
    featured_rank: z.number().int().nonnegative().optional(),
    parent_preset_id: z.string().uuid().nullable().optional(),
    standalone_discoverable: z.boolean().default(false),
    variant_display_name: z.string().max(120).nullable().optional(),
    variant_sort_order: z.number().int().nonnegative().default(0),
    filter_config: filterConfigSchema.optional(),
    poster_config: posterConfigSchema.optional(),
    prompt_ui: promptUiConfigSchema.optional(),
  })
  .refine(
    (data) =>
      data.type === "poster"
        ? data.poster_config?.layout_template !== undefined
        : true,
    {
      message: "Poster layout template is required",
      path: ["poster_config", "layout_template"],
    }
  )
  .refine(
    (data) =>
      data.type === "filter"
        ? data.filter_config?.style_archetype !== undefined
        : true,
    {
      message: "Filter style archetype is required",
      path: ["filter_config", "style_archetype"],
    }
  )
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

/**
 * The complete initial version recipe. `id`, `version_number`, and `state`
 * are server-controlled and absent by construction — the RPC always writes
 * version_number 1 with state 'draft'.
 */
export const presetDraftVersionSchema = z
  .strictObject({
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
    /** Display hint only — runtime pricing is server-authoritative. */
    credit_cost: z.number().int().nonnegative().default(0),
  })
  .refine(
    (data) =>
      !data.output_sizes ||
      data.output_sizes.every((s) => s.width * s.height <= 4_000_000),
    {
      message: "Each output size must be 4 megapixels or less",
      path: ["output_sizes"],
    }
  );

export const presetAssetLinkSchema = z.strictObject({
  asset_id: z.string().uuid(),
  role: z.enum(ASSET_ROLES),
  /**
   * Defaults server-side: true for *_reference roles (private recipe
   * material), false for example/media roles.
   */
  internal_only: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().default(0),
});

export const presetDraftItemSchema = z.strictObject({
  /** Stable caller-side identifier echoed back in results. */
  client_item_id: z.string().min(1).max(120),
  /** Retry-safe key; reused keys return the originally created draft. */
  idempotency_key: z.string().min(16).max(200),
  product: presetDraftProductSchema,
  version: presetDraftVersionSchema,
  fields: z.array(productFieldSchema).max(MAX_FIELDS_PER_PRESET).default([]),
  /** Optional pre-existing approved preset-media assets to link. */
  asset_links: z
    .array(presetAssetLinkSchema)
    .max(MAX_ASSET_LINKS_PER_PRESET)
    .default([]),
});

export const presetDraftBatchSchema = z
  .strictObject({
    /** Owner-visible correlation id for review/status lookups. */
    batch_id: z.string().min(1).max(120),
    items: z.array(presetDraftItemSchema).min(1).max(MAX_BATCH_ITEMS),
  })
  .refine(
    (b) =>
      new Set(b.items.map((i) => i.client_item_id)).size === b.items.length,
    {
      message: "client_item_id must be unique within the batch",
      path: ["items"],
    }
  )
  .refine(
    (b) =>
      new Set(b.items.map((i) => i.idempotency_key)).size === b.items.length,
    {
      message: "idempotency_key must be unique within the batch",
      path: ["items"],
    }
  )
  .refine(
    (b) => new Set(b.items.map((i) => i.product.slug)).size === b.items.length,
    { message: "product.slug must be unique within the batch", path: ["items"] }
  );

export const createCategoryRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: z.string().trim().max(500).optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  /** Replay-safe key; a repeated call returns the same category. */
  idempotency_key: z.string().min(16).max(200),
});

// ---------------------------------------------------------------------------
// Read operation inputs
// ---------------------------------------------------------------------------

export const catalogQuerySchema = z.strictObject({
  type: productTypeSchema.optional(),
  category_id: z.string().uuid().optional(),
  public_status: productStatusSchema.optional(),
  family: z.enum(["roots", "variants", "all"]).default("all"),
  limit: z.number().int().min(1).max(MAX_CATALOG_PAGE).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export const batchStatusQuerySchema = z.strictObject({
  batch_id: z.string().min(1).max(120),
});

export const reviewLinksQuerySchema = z.strictObject({
  product_ids: z.array(z.string().uuid()).min(1).max(MAX_CATALOG_PAGE),
});

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** Safe catalog summary — never includes private recipe/provider internals. */
export const catalogItemSummarySchema = z.object({
  product_id: z.string().uuid(),
  type: productTypeSchema,
  slug: z.string(),
  name: z.string(),
  public_status: z.string(),
  visibility: z.string(),
  category_id: z.string().uuid().nullable(),
  category_slug: z.string().nullable(),
  parent_preset_id: z.string().uuid().nullable(),
  standalone_discoverable: z.boolean(),
  variant_display_name: z.string().nullable(),
  version_count: z.number().int(),
  has_active_version: z.boolean(),
  has_editable_version: z.boolean(),
  latest_version_number: z.number().int().nullable(),
  field_count: z.number().int(),
  media: z.object({
    has_hero: z.boolean(),
    has_poster: z.boolean(),
    has_preview_video: z.boolean(),
    has_preview_gif: z.boolean(),
    reference_count: z.number().int(),
  }),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CatalogItemSummary = z.infer<typeof catalogItemSummarySchema>;

export const categorySummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});
export type CategorySummary = z.infer<typeof categorySummarySchema>;

/**
 * Verified route/model option for drafting. Capability hints come from the
 * server route-capability registry — absent means "not configurable", never
 * "assumed capable". unit_price is a display hint, not runtime pricing.
 */
export const modelOptionSchema = z.object({
  provider: z.string(),
  endpoint_id: z.string(),
  display_name: z.string(),
  description: z.string(),
  category: z.string(),
  capability: z.object({
    verified: z.boolean(),
    max_input_images: z.number().int(),
    supports_prompt_edit: z.boolean(),
  }),
});
export type ModelOption = z.infer<typeof modelOptionSchema>;

export const presetItemStatusSchema = z.enum([
  "created",
  "reused",
  "validated",
  "failed",
]);
export type PresetItemStatus = z.infer<typeof presetItemStatusSchema>;

export const presetItemResultSchema = z.object({
  client_item_id: z.string(),
  status: presetItemStatusSchema,
  product_id: z.string().uuid().optional(),
  version_id: z.string().uuid().optional(),
  slug: z.string().optional(),
  /** Admin editor path, e.g. /admin/filters/<id>. */
  review_path: z.string().optional(),
  errors: z.array(factoryErrorSchema).default([]),
  warnings: z.array(factoryErrorSchema).default([]),
});
export type PresetItemResult = z.infer<typeof presetItemResultSchema>;

export const presetBatchResultSchema = z.object({
  batch_id: z.string(),
  items: z.array(presetItemResultSchema),
  summary: z.object({
    total: z.number().int(),
    created: z.number().int(),
    reused: z.number().int(),
    validated: z.number().int(),
    failed: z.number().int(),
  }),
});
export type PresetBatchResult = z.infer<typeof presetBatchResultSchema>;

export const createCategoryResultSchema = z.object({
  status: z.enum(["created", "reused"]),
  category: categorySummarySchema,
  warnings: z.array(factoryErrorSchema).default([]),
});
export type CreateCategoryResult = z.infer<typeof createCategoryResultSchema>;

export const batchStatusItemSchema = z.object({
  client_item_id: z.string().nullable(),
  idempotency_key: z.string(),
  status: z.enum(["created", "failed"]),
  product_id: z.string().uuid().nullable(),
  version_id: z.string().uuid().nullable(),
  review_path: z.string().nullable(),
  created_at: z.string(),
});
export type BatchStatusItem = z.infer<typeof batchStatusItemSchema>;

export const reviewLinkEntrySchema = z.object({
  product_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  type: productTypeSchema,
  public_status: z.string(),
  review_path: z.string(),
  category_slug: z.string().nullable(),
  parent_preset_id: z.string().uuid().nullable(),
  has_version: z.boolean(),
  /** Outstanding blockers a human must clear before manual review/publish. */
  blockers: z.array(z.string()).default([]),
});
export type ReviewLinkEntry = z.infer<typeof reviewLinkEntrySchema>;

// ---------------------------------------------------------------------------
// Inferred input types for callers
// ---------------------------------------------------------------------------

export type PresetDraftProduct = z.infer<typeof presetDraftProductSchema>;
export type PresetDraftVersion = z.infer<typeof presetDraftVersionSchema>;
export type PresetAssetLink = z.infer<typeof presetAssetLinkSchema>;
export type PresetDraftItem = z.infer<typeof presetDraftItemSchema>;
export type PresetDraftBatch = z.infer<typeof presetDraftBatchSchema>;
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type BatchStatusQuery = z.infer<typeof batchStatusQuerySchema>;
export type ReviewLinksQuery = z.infer<typeof reviewLinksQuerySchema>;

/** Admin editor path for a draft product (mirrors (admin) route layout). */
export function adminReviewPath(type: "filter" | "poster", productId: string) {
  return `/admin/${type === "filter" ? "filters" : "posters"}/${productId}`;
}
