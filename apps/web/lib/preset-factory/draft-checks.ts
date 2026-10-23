/**
 * Pure preset-draft checks (#271). Everything here is deterministic and
 * DB-free so unit tests can exercise the rules without a database — the
 * service layer resolves rows, then calls these functions.
 *
 * Nothing in this module runs generation, tests a preset, or calls a
 * provider — it only judges whether a draft is internally consistent.
 */
import {
  validateCapabilityForRoute,
  validateFamilyAssignment,
  type ParentCandidate,
} from "@/lib/validation/preset-family";
import type { RouteCapability } from "@/lib/ai/route-capabilities";
import {
  REFERENCE_ASSET_ROLES,
  type FactoryError,
  type PresetDraftItem,
} from "./contract";

/** product_assets role → the media kind the linked asset must have. */
export type AssetMediaKind = "image" | "gif" | "video";

const REFERENCE_ROLES = new Set<string>(REFERENCE_ASSET_ROLES);

const IMAGE_ROLES = new Set([
  "hero",
  "poster",
  "example_source",
  "example_result",
  ...REFERENCE_ROLES,
]);

export function mediaKindForRole(role: string): AssetMediaKind | null {
  if (role === "preview_video") return "video";
  if (role === "preview_gif") return "gif";
  if (IMAGE_ROLES.has(role)) return "image";
  return null;
}

/**
 * Whether a role's link is private recipe material. Reference images feed
 * the hidden instruction path, so they are always internal_only — this is
 * enforced by the contract schema and the RPC, not merely defaulted.
 */
export function defaultInternalOnly(role: string): boolean {
  return REFERENCE_ROLES.has(role);
}

/** Roles whose links bind to the specific version recipe, not the product. */
export function isVersionBoundRole(role: string): boolean {
  return REFERENCE_ROLES.has(role);
}

/** Minimal asset row the checks need. */
export interface LinkedAssetShape {
  id: string;
  bucket: string;
  media_type: string;
  mime_type: string;
  visibility: string;
  moderation_status: string | null;
  deleted_at: string | null;
}

/**
 * Ownership/visibility/content constraints for a client-supplied asset id:
 * only admin preset-media that is public, undeleted, and not rejected may be
 * linked — user source images and private buckets can never be attached to a
 * catalog preset through this path.
 */
export function assetLinkProblems(
  asset: LinkedAssetShape | null,
  role: string
): string[] {
  if (!asset) return ["referenced asset does not exist"];
  const problems: string[] = [];
  if (asset.deleted_at) problems.push("asset is deleted");
  if (asset.bucket !== "preset-media") {
    problems.push("asset is not in the preset-media bucket");
  }
  if (asset.visibility !== "public") {
    problems.push("asset is not a public preset-media asset");
  }
  if (
    asset.moderation_status === "rejected" ||
    asset.moderation_status === "flagged"
  ) {
    problems.push("asset was rejected or flagged by moderation");
  }
  const kind = mediaKindForRole(role);
  if (kind === "video" && asset.media_type !== "video") {
    problems.push(`role "${role}" requires a video asset`);
  }
  if (kind === "gif" && asset.mime_type !== "image/gif") {
    problems.push(`role "${role}" requires a GIF asset`);
  }
  if (kind === "image" && asset.media_type !== "image") {
    problems.push(`role "${role}" requires an image asset`);
  }
  return problems;
}

/**
 * Warn when a proposed slug differs from an existing one only by a numeric
 * or "-copy" suffix — a cheap guard against semantically confusing slugs.
 */
export function similarSlugWarning(
  slug: string,
  existingSlugs: string[]
): string | null {
  const strip = (s: string) => s.replace(/-(copy|v?\d+|variant(-\d+)?)+$/i, "");
  const base = strip(slug);
  const clash = existingSlugs.find(
    (existing) => existing !== slug && strip(existing) === base
  );
  return clash
    ? `Slug "${slug}" is confusingly similar to existing slug "${clash}".`
    : null;
}

/** Resolved lookup context for one draft item — assembled by the service. */
export interface DraftItemContext {
  categoryExists: boolean | null; // null when no category_id supplied
  categoryIsActive?: boolean;
  parent: ParentCandidate | null;
  endpoint: string | null;
  routeCapability: RouteCapability | null;
  /** Endpoint is present in the server-verified provider catalog. */
  modelVerified: boolean;
  assets: Map<string, LinkedAssetShape | null>;
  existingSlugs: string[];
  /** Release flags — drafts may declare gated features but get warned. */
  multiInputReleased: boolean;
  userPromptReleased: boolean;
}

/**
 * Domain validation for one draft item (post-schema). Returns errors
 * (creation is refused) and warnings (creation proceeds, flagged for human
 * review). Mirrors the server enforcement in lib/db/products.ts and the
 * publish gates — drafts may be incomplete for *publish*, never malformed.
 */
export function checkDraftItem(
  item: PresetDraftItem,
  ctx: DraftItemContext
): { errors: FactoryError[]; warnings: FactoryError[] } {
  const errors: FactoryError[] = [];
  const warnings: FactoryError[] = [];
  const { product, version } = item;

  if (ctx.existingSlugs.includes(product.slug)) {
    errors.push({
      code: "slug_conflict",
      message: `A preset with slug "${product.slug}" already exists.`,
      field: "product.slug",
    });
  } else {
    const similar = similarSlugWarning(product.slug, ctx.existingSlugs);
    if (similar) {
      warnings.push({
        code: "slug_conflict",
        message: similar,
        field: "product.slug",
      });
    }
  }

  if (product.category_id && ctx.categoryExists === false) {
    errors.push({
      code: "category_not_found",
      message: "category_id does not reference an existing category.",
      field: "product.category_id",
    });
  } else if (product.category_id && ctx.categoryIsActive === false) {
    warnings.push({
      code: "category_not_found",
      message: "The assigned category is inactive.",
      field: "product.category_id",
    });
  } else if (!product.category_id) {
    warnings.push({
      code: "category_not_found",
      message: "No category assigned — the draft will be uncategorized.",
      field: "product.category_id",
    });
  }

  for (const detail of validateFamilyAssignment({
    type: product.type,
    parentPresetId: product.parent_preset_id ?? null,
    hasChildren: false,
    parent: ctx.parent,
  })) {
    errors.push({
      code: "parent_invalid",
      message: detail,
      field: "product.parent_preset_id",
    });
  }

  if (!ctx.modelVerified || !ctx.endpoint) {
    errors.push({
      code: "model_unverified",
      message:
        "The primary provider/model does not resolve to a verified catalog route.",
      field: "version.provider_strategy",
    });
  }

  const refCount = item.asset_links.filter((l) =>
    isVersionBoundRole(l.role)
  ).length;
  for (const detail of validateCapabilityForRoute({
    capability: version.input_capability,
    routeCapability: ctx.routeCapability,
    endpoint: ctx.endpoint,
    adminReferenceCount: refCount,
  })) {
    errors.push({
      code: "capability_invalid",
      message: detail,
      field: "version.input_capability",
    });
  }

  // Release flags are publish gates, not draft gates — warn so the saved
  // draft is visibly flagged instead of silently shipping dead config.
  const capability = version.input_capability;
  if (
    (capability.input_mode === "multi" || capability.input_max_images > 1) &&
    !ctx.multiInputReleased
  ) {
    warnings.push({
      code: "capability_invalid",
      message:
        "Multi-image inputs are gated off until the provider pipeline ships — this draft cannot publish until the release flag is enabled.",
      field: "version.input_capability.input_mode",
    });
  }
  if (capability.prompt_override_enabled && !ctx.userPromptReleased) {
    warnings.push({
      code: "capability_invalid",
      message:
        "Custom prompting has not been released in this environment — publication requires the protected switches.",
      field: "version.input_capability.prompt_override_enabled",
    });
  }

  for (const link of item.asset_links) {
    const asset = ctx.assets.get(link.asset_id) ?? null;
    for (const problem of assetLinkProblems(asset, link.role)) {
      errors.push({
        code: "asset_invalid",
        message: `asset ${link.asset_id} (${link.role}): ${problem}`,
        field: "asset_links",
      });
    }
  }
  for (const [field, assetId] of [
    ["hero_asset_id", product.hero_asset_id],
    ["poster_asset_id", product.poster_asset_id],
    ["preview_video_asset_id", product.preview_video_asset_id],
    ["preview_gif_asset_id", product.preview_gif_asset_id],
  ] as const) {
    if (!assetId) continue;
    const role = field.replace(/_asset_id$/, "");
    const asset = ctx.assets.get(assetId) ?? null;
    for (const problem of assetLinkProblems(asset, role)) {
      errors.push({
        code: "asset_invalid",
        message: `asset ${assetId} (${role}): ${problem}`,
        field: `product.${field}`,
      });
    }
  }

  if (!product.hero_asset_id) {
    warnings.push({
      code: "asset_invalid",
      message: "No hero asset — a publish blocker for human review.",
      field: "product.hero_asset_id",
    });
  }
  if (!product.poster_asset_id) {
    warnings.push({
      code: "asset_invalid",
      message: "No poster asset — a publish blocker for human review.",
      field: "product.poster_asset_id",
    });
  }

  return { errors, warnings };
}
