import { z } from "zod";
import {
  posterConfigSchema,
  filterConfigSchema,
  productFieldSchema,
  PRODUCT_TYPES,
  PRODUCT_STATUSES,
} from "@5pixels/shared";

/**
 * Pure, deterministic publish-gate validation for a product version.
 *
 * This function intentionally duplicates the critical checks from the database
 * RPC so that TypeScript unit tests can exercise every gate without needing a
 * live database. It returns structured, human-readable failures that can be
 * rendered by the admin UI.
 */

export const PUBLISH_GATES = {
  MISSING_PRODUCT_NAME: "Product name is required.",
  INVALID_SLUG:
    "Slug is required and must use lowercase letters, numbers, and hyphens only.",
  MISSING_HERO_ASSET: "A hero visual asset is required.",
  MISSING_POSTER_ASSET: "A poster visual asset is required.",
  MISSING_PRIMARY_PROVIDER: "Primary AI provider is required.",
  MISSING_PRIMARY_MODEL: "Primary AI model is required.",
  INVALID_FIELD_SCHEMA: (fieldKey: string, detail: string) =>
    `Field '${fieldKey}' has an invalid schema: ${detail}`,
  INVALID_CREDIT_COST: "Credit cost must be greater than 0.",
  INVALID_SAFETY_CONFIG: (field: string) =>
    `Safety config must explicitly set '${field}' to a boolean value.`,
  INVALID_POSTER_LAYOUT:
    "Posters require a valid layout template (portrait, square, or landscape).",
  MISSING_POSTER_CONFIG: "Poster products require poster configuration.",
  MISSING_FILTER_CONFIG: "Filter products require filter configuration.",
  INVALID_PRODUCT_TYPE: `Product type must be one of: ${PRODUCT_TYPES.join(", ")}.`,
  INVALID_PRODUCT_STATUS: (status: string) =>
    `Product status '${status}' is not valid.`,
  VERSION_PRODUCT_MISMATCH: "Version does not belong to the specified product.",
} as const;

export type PublishGateFailure = {
  code: keyof typeof PUBLISH_GATES;
  message: string;
  field?: string;
};

export type PublishGateResult =
  { ok: true; failures: [] } | { ok: false; failures: PublishGateFailure[] };

type ProductLike = {
  id?: string;
  type: string;
  slug?: string;
  name?: string;
  public_status?: string;
  hero_asset_id?: string | null;
  poster_asset_id?: string | null;
  metadata?: { filter_config?: unknown; poster_config?: unknown };
};

type VersionLike = {
  id?: string;
  product_id?: string;
  version_number?: number;
  state?: string;
  private_instruction_template?: string;
  private_negative_instruction?: string;
  provider_strategy?: { primary_provider?: string; primary_model?: string };
  model_config?: unknown;
  input_validation_config?: unknown;
  post_process_config?: unknown;
  safety_config?: {
    allowed_nsfw?: unknown;
    block_public_figures?: unknown;
    block_minors?: unknown;
  };
  credit_cost?: number;
};

export function validatePublishGates(
  product: ProductLike,
  version: VersionLike,
  fields: Array<z.infer<typeof productFieldSchema>> = []
): PublishGateResult {
  const failures: PublishGateFailure[] = [];

  // Product identity and slug.
  if (!product.name || product.name.trim().length === 0) {
    failures.push({
      code: "MISSING_PRODUCT_NAME",
      message: PUBLISH_GATES.MISSING_PRODUCT_NAME,
      field: "name",
    });
  }

  const slug = product.slug?.trim() ?? "";
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slug || !slugPattern.test(slug)) {
    failures.push({
      code: "INVALID_SLUG",
      message: PUBLISH_GATES.INVALID_SLUG,
      field: "slug",
    });
  }

  // Type coherence.
  if (!PRODUCT_TYPES.includes(product.type as (typeof PRODUCT_TYPES)[number])) {
    failures.push({
      code: "INVALID_PRODUCT_TYPE",
      message: PUBLISH_GATES.INVALID_PRODUCT_TYPE,
      field: "type",
    });
  }

  const status = product.public_status ?? "draft";
  if (!PRODUCT_STATUSES.includes(status as (typeof PRODUCT_STATUSES)[number])) {
    failures.push({
      code: "INVALID_PRODUCT_STATUS",
      message: PUBLISH_GATES.INVALID_PRODUCT_STATUS(status),
      field: "public_status",
    });
  }

  // Visual assets.
  if (!product.hero_asset_id) {
    failures.push({
      code: "MISSING_HERO_ASSET",
      message: PUBLISH_GATES.MISSING_HERO_ASSET,
      field: "hero_asset_id",
    });
  }

  // The plan explicitly requires poster_asset_id for publish readiness.
  if (!product.poster_asset_id) {
    failures.push({
      code: "MISSING_POSTER_ASSET",
      message: PUBLISH_GATES.MISSING_POSTER_ASSET,
      field: "poster_asset_id",
    });
  }

  // Provider / model.
  const provider = version.provider_strategy?.primary_provider?.trim() ?? "";
  const model = version.provider_strategy?.primary_model?.trim() ?? "";
  if (!provider) {
    failures.push({
      code: "MISSING_PRIMARY_PROVIDER",
      message: PUBLISH_GATES.MISSING_PRIMARY_PROVIDER,
      field: "version.provider_strategy.primary_provider",
    });
  }
  if (!model) {
    failures.push({
      code: "MISSING_PRIMARY_MODEL",
      message: PUBLISH_GATES.MISSING_PRIMARY_MODEL,
      field: "version.provider_strategy.primary_model",
    });
  }

  // Field schemas: empty array is allowed, but each present field must be valid.
  for (const field of fields) {
    const parsed = productFieldSchema.safeParse(field);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      failures.push({
        code: "INVALID_FIELD_SCHEMA",
        message: PUBLISH_GATES.INVALID_FIELD_SCHEMA(
          field.field_key ?? "unknown",
          issue?.message ?? "invalid value"
        ),
        field: `fields.${field.field_key ?? "unknown"}`,
      });
    }
  }

  // Credit cost.
  const creditCost =
    typeof version.credit_cost === "number" ? version.credit_cost : Number.NaN;
  if (!Number.isFinite(creditCost) || creditCost <= 0) {
    failures.push({
      code: "INVALID_CREDIT_COST",
      message: PUBLISH_GATES.INVALID_CREDIT_COST,
      field: "version.credit_cost",
    });
  }

  // Safety config must explicitly contain the three required booleans.
  const safety = version.safety_config ?? {};
  for (const key of [
    "allowed_nsfw",
    "block_public_figures",
    "block_minors",
  ] as const) {
    if (typeof safety[key] !== "boolean") {
      failures.push({
        code: "INVALID_SAFETY_CONFIG",
        message: PUBLISH_GATES.INVALID_SAFETY_CONFIG(key),
        field: `version.safety_config.${key}`,
      });
    }
  }

  // Type-specific config.
  if (product.type === "poster") {
    const posterResult = posterConfigSchema.safeParse(
      product.metadata?.poster_config ?? {}
    );
    if (!posterResult.success) {
      const issue = posterResult.error.issues[0];
      failures.push({
        code: "INVALID_POSTER_LAYOUT",
        message: PUBLISH_GATES.INVALID_POSTER_LAYOUT,
        field: issue?.path?.join(".") ?? "poster_config.layout_template",
      });
    }
  }

  if (product.type === "filter") {
    const filterResult = filterConfigSchema.safeParse(
      product.metadata?.filter_config ?? {}
    );
    if (!filterResult.success) {
      failures.push({
        code: "MISSING_FILTER_CONFIG",
        message: PUBLISH_GATES.MISSING_FILTER_CONFIG,
        field: "filter_config.style_archetype",
      });
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return { ok: true, failures: [] };
}

/**
 * Minimum length for an owner override reason. This value is duplicated in the
 * database RPC so that the server is the source of truth; this helper is only for
 * UI validation and tests.
 */
export const MIN_OWNER_OVERRIDE_REASON_LENGTH = 12;

export const ownerOverrideReasonSchema = z
  .string()
  .trim()
  .min(
    MIN_OWNER_OVERRIDE_REASON_LENGTH,
    `Override reason must be at least ${MIN_OWNER_OVERRIDE_REASON_LENGTH} characters.`
  );

export type OwnerOverrideInput = z.infer<typeof ownerOverrideReasonSchema>;
