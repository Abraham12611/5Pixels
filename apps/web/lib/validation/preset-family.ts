/**
 * Preset-family + input-capability validation for the admin surface (#177).
 *
 * Pure functions shared by the product form (instant feedback), the admin
 * mutations in `lib/db/products.ts` (server enforcement), and the publish
 * gate. They mirror the DB trigger (`enforce_preset_family_level`) and the
 * version CHECK constraints with actionable messages — never silently
 * rewriting an admin's declared configuration.
 */
import type { VersionInputCapability } from "@5pixels/shared";
import type { RouteCapability } from "@/lib/ai/route-capabilities";

/** Minimal parent row shape needed for family validation. */
export interface ParentCandidate {
  id: string;
  type: string;
  public_status: string;
  parent_preset_id: string | null;
}

export interface FamilyAssignmentInput {
  /** The product being saved (undefined when creating). */
  productId?: string;
  type: string;
  parentPresetId?: string | null;
  /** Whether this product already has variants of its own. */
  hasChildren: boolean;
  /** Resolved parent row — required whenever parentPresetId is set. */
  parent?: ParentCandidate | null;
}

/**
 * Validate a proposed family assignment. Mirrors
 * `enforce_preset_family_level` + the retired-parent rule with actionable
 * errors. Returns a list of problems — empty means valid.
 */
export function validateFamilyAssignment(
  input: FamilyAssignmentInput
): string[] {
  const errors: string[] = [];
  const parentId = input.parentPresetId ?? null;
  if (!parentId) return errors;

  if (input.productId && parentId === input.productId) {
    errors.push("A preset cannot be its own parent.");
  }
  if (input.hasChildren) {
    errors.push(
      "A preset that already has variants cannot itself become a variant. Detach or reorder its variants first."
    );
  }

  const parent = input.parent;
  if (!parent) {
    errors.push("Selected parent preset does not exist.");
    return errors;
  }
  if (parent.parent_preset_id != null) {
    errors.push(
      "Preset families are single-level: the parent must be a root preset, not another variant."
    );
  }
  if (parent.type !== input.type) {
    errors.push(
      `Variant type must match the parent preset type (${parent.type}).`
    );
  }
  if (parent.public_status === "retired") {
    errors.push("Retired presets cannot be used as a parent.");
  }
  return errors;
}

/** Resolved route capability context for a version's primary route. */
export interface CapabilityCheckInput {
  capability: VersionInputCapability;
  routeCapability: RouteCapability | null;
  /** Resolved endpoint id (for error messages). */
  endpoint: string | null;
  /** Admin private reference assets that also consume input slots. */
  adminReferenceCount: number;
}

/**
 * Validate a version's declared input capability against the pinned route's
 * verified capability. Fail-closed: routes with no registry entry cannot
 * carry multi-image, declared-role, or prompt-override configurations.
 */
export function validateCapabilityForRoute(
  input: CapabilityCheckInput
): string[] {
  const errors: string[] = [];
  const { capability, routeCapability, endpoint } = input;
  const route = endpoint ?? "unresolved route";

  const wantsMulti =
    capability.input_mode === "multi" || capability.input_max_images > 1;
  const wantsRoles = capability.input_image_roles.length > 0;
  const wantsPrompt = capability.prompt_override_enabled;

  if (!wantsMulti && !wantsRoles && !wantsPrompt) return errors;

  if (!routeCapability) {
    errors.push(
      `Route "${route}" has no verified input capability. Multi-image inputs and custom prompts can only be enabled on verified routes — choose a supported model or keep the preset single-image.`
    );
    return errors;
  }

  const headroom =
    routeCapability.max_input_images - input.adminReferenceCount;
  if (wantsMulti && capability.input_max_images > headroom) {
    errors.push(
      `Route "${route}" accepts at most ${routeCapability.max_input_images} total input images; ${input.adminReferenceCount} admin reference asset(s) already consume slots, leaving room for ${Math.max(headroom, 0)} user image(s) — the declared max of ${capability.input_max_images} does not fit.`
    );
  }

  const accepted = routeCapability.accepted_roles;
  if (wantsRoles && accepted != null) {
    const unsupported = capability.input_image_roles
      .map((r) => r.name)
      .filter((name) => !accepted.includes(name));
    if (unsupported.length > 0) {
      errors.push(
        `Route "${route}" does not support the declared input role(s): ${unsupported.join(", ")}.`
      );
    }
  }

  if (wantsPrompt && !routeCapability.supports_prompt_edit) {
    errors.push(
      `Route "${route}" does not support user-provided edit prompts — disable "Allow custom prompt edits" or pick a supporting model.`
    );
  }

  return errors;
}
