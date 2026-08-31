// Shared domain schemas and types for 5Pixels.
// Keep this package dependency-free so it can be imported by apps and tools.

export const PRODUCT_TYPES = ["filter", "poster"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = [
  "draft",
  "internal_test",
  "private_beta",
  "scheduled",
  "active",
  "paused",
  "retired",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const VISIBILITY = ["public", "internal", "beta"] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const LIKENESS_LEVELS = [
  "very_high",
  "high",
  "medium",
  "creative",
] as const;
export type LikenessLevel = (typeof LIKENESS_LEVELS)[number];

export const FIELD_TYPES = [
  "short_text",
  "select",
  "radio",
  "toggle",
  "color",
  "aspect_ratio",
  "intensity",
  "layout",
  "background",
  "wardrobe",
  "era",
  "mood",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const ASSET_ROLES = [
  "hero",
  "poster",
  "preview_video",
  "preview_gif",
  "example_source",
  "example_result",
  "style_reference",
  "composition_reference",
  "layout_reference",
] as const;
export type AssetRole = (typeof ASSET_ROLES)[number];

export const GENERATION_STATUSES = [
  "created",
  "uploaded",
  "validating",
  "queued",
  "generating",
  "post_processing",
  "completed",
  "failed",
  "blocked",
  "cancelled",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];
