import { z } from "zod";
import {
  posterConfigSchema,
  filterConfigSchema,
  productFieldSchema,
  PRODUCT_TYPES,
  PRODUCT_STATUSES,
  type VersionInputCapability,
} from "@5pixels/shared";
import type { RouteCapability } from "@/lib/ai/route-capabilities";
import {
  validateCapabilityForRoute,
  validateFamilyAssignment,
  type ParentCandidate,
} from "@/lib/validation/preset-family";

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
  INVALID_FAMILY: (detail: string) => `Preset family: ${detail}`,
  ORPHANED_VARIANT:
    "This variant only appears inside its parent family, but the parent is not published — publish the parent or enable standalone discovery.",
  ROUTE_CAPABILITY_MISMATCH: (detail: string) =>
    `Route capability: ${detail}`,
  MULTI_IMAGE_NOT_EXECUTABLE:
    "Multi-image inputs are configured, but the multi-image release flag is OFF — publication is blocked until #193 ships the provider pipeline + DB migration and PRESET_MULTI_INPUT_ENABLED is enabled (the create_generation RPC rejects them regardless).",
  PROMPT_RELEASE_GATED:
    "Custom prompting is configured, but it has not been released for this environment — publication requires the protected server/database switches (PRESET_USER_PROMPT_ENABLED + release_gates).",
} as const;

export type PublishGateFailure = {
  code: keyof typeof PUBLISH_GATES;
  message: string;
  field?: string;
};

/**
 * Gate failures protecting unreleased capabilities. These cannot be waived
 * by an owner-override reason — the server rejects publication until the
 * protected environment/database switches are enabled.
 */
export const PROTECTED_GATE_CODES: ReadonlySet<PublishGateFailure["code"]> =
  new Set(["MULTI_IMAGE_NOT_EXECUTABLE", "PROMPT_RELEASE_GATED"]);

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
  parent_preset_id?: string | null;
  standalone_discoverable?: boolean;
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
  // #176 input-capability columns, read straight off product_versions.
  input_mode?: "single" | "multi";
  input_min_images?: number;
  input_max_images?: number;
  input_image_roles?: VersionInputCapability["input_image_roles"];
  prompt_override_enabled?: boolean;
  prompt_max_chars?: number;
};

/**
 * Publish-gate context that cannot be derived from the product row itself:
 * the resolved parent for family rules and the verified route capability
 * from `lib/ai/route-capabilities` (#177).
 */
export interface PublishGateContext {
  /** Resolved parent row — required when product.parent_preset_id is set. */
  parent?: ParentCandidate | null;
  routeCapability?: RouteCapability | null;
  adminReferenceCount?: number;
  /**
   * Whether the preset_user_prompt release flag is enabled server-side
   * (`isUserPromptReleased()`). Defaults to false — prompt-enabled versions
   * stay unpublishable until the protected env + DB switches are turned on
   * (#183; merchant approval is already recorded in #173).
   */
  userPromptReleased?: boolean;
  /**
   * Whether the multi-image release flag is enabled server-side
   * (`isMultiInputReleased()` → PRESET_MULTI_INPUT_ENABLED). Defaults to
   * false — multi-image versions stay unpublishable until #193 ships the
   * provider pipeline + DB migration and release QA enables the flag.
   */
  multiInputReleased?: boolean;
}

export function validatePublishGates(
  product: ProductLike,
  version: VersionLike,
  fields: Array<z.infer<typeof productFieldSchema>> = [],
  context: PublishGateContext = {}
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

  // Credit cost is no longer gated: generation pricing is derived from
  // provider pricing snapshots server-side, never from an admin-entered
  // number. product_versions.credit_cost survives only as a display hint.

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

  // Preset family consistency (#177): single-level parents, no retired or
  // nested parents, and a family-dependent variant cannot publish into an
  // unreachable orphaned state.
  for (const detail of validateFamilyAssignment({
    productId: product.id,
    type: product.type,
    parentPresetId: product.parent_preset_id ?? null,
    hasChildren: false,
    parent: context.parent,
  })) {
    failures.push({
      code: "INVALID_FAMILY",
      message: PUBLISH_GATES.INVALID_FAMILY(detail),
      field: "parent_preset_id",
    });
  }
  if (
    product.parent_preset_id &&
    !product.standalone_discoverable &&
    context.parent &&
    context.parent.public_status !== "active"
  ) {
    failures.push({
      code: "ORPHANED_VARIANT",
      message: PUBLISH_GATES.ORPHANED_VARIANT,
      field: "standalone_discoverable",
    });
  }

  // Route capability (#177): multi-image inputs, declared roles, and prompt
  // overrides may only publish on routes with a verified registry entry.
  const capabilityErrors = validateCapabilityForRoute({
    capability: {
      input_mode: version.input_mode ?? "single",
      input_min_images: version.input_min_images ?? 1,
      input_max_images: version.input_max_images ?? 1,
      input_image_roles: version.input_image_roles ?? [],
      prompt_override_enabled: version.prompt_override_enabled ?? false,
      prompt_max_chars: version.prompt_max_chars ?? 0,
    },
    routeCapability: context.routeCapability ?? null,
    endpoint:
      version.provider_strategy?.primary_model != null
        ? `${version.provider_strategy.primary_provider}/${version.provider_strategy.primary_model}`
        : null,
    adminReferenceCount: context.adminReferenceCount ?? 0,
  });
  for (const detail of capabilityErrors) {
    failures.push({
      code: "ROUTE_CAPABILITY_MISMATCH",
      message: PUBLISH_GATES.ROUTE_CAPABILITY_MISMATCH(detail),
      field: "version.input_capability",
    });
  }

  // Release readiness (#177): drafts may declare capabilities the pipeline
  // cannot yet execute, but they must not publish. Multi-image stays
  // blocked while the server-side release flag is OFF (PRESET_MULTI_INPUT_
  // ENABLED — enabled only after #193 ships the provider pipeline + DB
  // migration and release QA signs off); custom prompting is likewise
  // gated on the environment's protected release switches.
  if (
    (version.input_mode === "multi" ||
      (version.input_max_images ?? 1) > 1) &&
    context.multiInputReleased !== true
  ) {
    failures.push({
      code: "MULTI_IMAGE_NOT_EXECUTABLE",
      message: PUBLISH_GATES.MULTI_IMAGE_NOT_EXECUTABLE,
      field: "version.input_capability.input_mode",
    });
  }
  if (
    version.prompt_override_enabled &&
    context.userPromptReleased !== true
  ) {
    failures.push({
      code: "PROMPT_RELEASE_GATED",
      message: PUBLISH_GATES.PROMPT_RELEASE_GATED,
      field: "version.input_capability.prompt_override_enabled",
    });
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
