import { assessVariantSwitch, type DraftImage } from "@/lib/catalog/variant-switch";
import type { FamilyRailMember } from "@/lib/catalog/family";
import type {
  PublicInputCapability,
  PublicProductField,
} from "@/types/catalog";

/**
 * Result → sibling handoff model (#184). Pure planners are separated from
 * the server loaders so the whole carry contract is unit-testable without
 * a database.
 *
 * The handoff never mutates the finished generation and never starts a new
 * one — it produces a link into `/app/create/{slug}` where a fresh quote,
 * consent, and Generate click are still required. The `variant_from` param
 * is the distinct sibling marker (`from` stays the same-preset Adjust
 * flow); `variant_source=output` is the opt-in "use this result as input"
 * derivative path — output assets already live in user-assets owned by the
 * caller, so they pass the create_generation ownership/bucket check with
 * `source_type='generation_output'` provenance intact.
 */

export interface VariantHandoff {
  member: FamilyRailMember;
  /** /app/create/{slug}?variant_from={generationId} (+ variant_source). */
  hrefFor: (sourceMode: "original" | "output") => string;
  /** User-facing explanations from the compat assessment. */
  notices: string[];
  /** Count of the source generation's images that would carry. */
  carriedCount: number;
}

export function buildSiblingHandoffs(opts: {
  members: FamilyRailMember[];
  generationId: string;
  /** Ordered inputs of the source generation (assetId + declared role). */
  images: DraftImage[];
  /** Owner's private prompt from the source run — assessed only, never
   *  rendered into the rail. */
  prompt: string | null;
}): VariantHandoff[] {
  return opts.members.map((member) => {
    const assessment = assessVariantSwitch(member.inputCapability, {
      images: opts.images,
      prompt: opts.prompt,
    });
    return {
      member,
      hrefFor: (sourceMode) =>
        `/app/create/${member.slug}?variant_from=${opts.generationId}` +
        (sourceMode === "output" ? "&variant_source=output" : ""),
      notices: assessment.notices,
      carriedCount: assessment.images.length,
    };
  });
}

/** A carried input with the destination role the assessment resolved —
 *  the form lands it on the matching named slot; `null` fills the first
 *  open slot positionally (matches E4's ReusedSource contract). */
export interface CarriedInput {
  assetId: string;
  role: string | null;
}

export interface VariantRestorePlan {
  /** The generation's ordinal-1 input, carried with its destination role. */
  sourceInput: CarriedInput | null;
  /** Additional carried inputs in source order, each with its role. */
  extraInputs: CarriedInput[];
  /** Carried option values, filtered to fields the target declares. */
  options: Record<string, unknown>;
  /** The draft prompt — passed through untouched; the form decides
   *  whether the target/release gates allow applying it. */
  prompt: string | null;
  notices: string[];
}

/**
 * Plan the create-form hydration for a `variant_from` handoff. The source
 * ordering is preserved: carried[0] is the primary input, the rest follow
 * in order — and every carried image keeps the destination role the
 * assessment resolved (declared roles match by name; a suggested
 * `assignedRole` is passed through so the form's named-slot placement
 * matches what the notice announced — never a silent re-slot).
 */
export function planVariantRestore(opts: {
  capability: PublicInputCapability | null;
  /** Source generation's ordered inputs (assetId + role). */
  images: DraftImage[];
  requestedOptions: Record<string, unknown> | null;
  activeFields: PublicProductField[];
  prompt: string | null;
  /** When true, the caller replaced the image set with the finished
   *  result's output asset id (already ownership-verified upstream). */
  outputAssetId?: string | null;
}): VariantRestorePlan {
  const notices: string[] = [];
  let sourceInput: CarriedInput | null = null;
  let extraInputs: CarriedInput[] = [];

  if (opts.outputAssetId) {
    // The finished result has no declared role — it fills the first open
    // slot positionally.
    sourceInput = { assetId: opts.outputAssetId, role: null };
    notices.push("Starting from your finished result");
  } else {
    const assessment = assessVariantSwitch(opts.capability, {
      images: opts.images,
      prompt: null,
    });
    const carried: CarriedInput[] = assessment.images.map((i) => ({
      assetId: i.assetId,
      role: i.role,
    }));
    sourceInput = carried[0] ?? null;
    extraInputs = carried.slice(1);
    notices.push(...assessment.notices.filter((n) => !n.includes("prompt")));
  }

  const fieldKeys = new Set(opts.activeFields.map((f) => f.field_key));
  const options: Record<string, unknown> = {};
  let droppedOptionCount = 0;
  for (const [key, value] of Object.entries(opts.requestedOptions ?? {})) {
    if (fieldKeys.has(key)) options[key] = value;
    else droppedOptionCount++;
  }
  if (droppedOptionCount > 0) {
    notices.push(
      `${droppedOptionCount} setting${droppedOptionCount === 1 ? "" : "s"} didn’t carry — this variation asks different questions`
    );
  }

  return {
    sourceInput,
    extraInputs,
    options,
    prompt: opts.prompt?.trim() ? opts.prompt : null,
    notices,
  };
}
