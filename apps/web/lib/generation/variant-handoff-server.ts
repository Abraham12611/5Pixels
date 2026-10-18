import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPublicProductBySlug } from "@/lib/db/explore";
import { getPresetFamilyRail } from "@/lib/catalog/family";
import { getSignedSourceUrlByAssetId } from "@/lib/generation/upload";
import {
  buildSiblingHandoffs,
  planVariantRestore,
  type VariantHandoff,
} from "@/lib/generation/variant-handoff";
import type { DraftImage } from "@/lib/catalog/variant-switch";
import type { PublicProductDetail } from "@/types/catalog";

/**
 * Server loaders for the result → sibling handoff (#184). Everything here
 * is owner-scoped through the caller's Supabase client: a generation's
 * inputs, prompt, and outputs are only ever resolved for its owner, and
 * foreign `variant_from` ids simply produce no carry.
 */

interface GenerationForHandoff {
  id: string;
  product_id: string;
  source_asset_id: string | null;
  requested_options: Record<string, unknown> | null;
  user_prompt: string | null;
  progress: Record<string, unknown> | null;
}

/** Ordered declared inputs; falls back to the ordinal-1 mirror column for
 *  generations predating generation_input_assets. */
async function loadOrderedInputs(
  generation: GenerationForHandoff
): Promise<DraftImage[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("generation_input_assets")
    .select("asset_id, role, ordinal")
    .eq("generation_id", generation.id)
    .order("ordinal", { ascending: true });

  if (rows && rows.length > 0) {
    return rows.map((row) => ({
      assetId: row.asset_id as string,
      role: (row.role as string | null) ?? null,
    }));
  }
  return generation.source_asset_id
    ? [{ assetId: generation.source_asset_id, role: null }]
    : [];
}

/** Primary output asset — usable as a derivative input since outputs live
 *  in user-assets owned by the caller (source_type='generation_output'). */
async function loadPrimaryOutputAssetId(
  generationId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generation_outputs")
    .select("asset_id, is_primary")
    .eq("generation_id", generationId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  return (data?.[0]?.asset_id as string | undefined) ?? null;
}

async function loadOwnedGeneration(
  generationId: string
): Promise<GenerationForHandoff | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("generations")
    .select(
      "id, product_id, source_asset_id, requested_options, user_prompt, progress"
    )
    .eq("id", generationId)
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as GenerationForHandoff | null) ?? null;
}

export interface VariantRailContext {
  handoffs: VariantHandoff[];
  currentProductId: string;
  /** The generation has a usable output asset for "use result as input". */
  resultAsSourceAvailable: boolean;
  /** Parent member of the family — for the "Made with X · part of set" link. */
  familyParent: { slug: string; name: string } | null;
}

/**
 * Everything the completed-result page needs for "Try another variation":
 * the family rail with per-sibling compat notices. Returns null when the
 * product is standalone or the generation context can't be loaded — the
 * page just renders nothing.
 */
export async function loadVariantRailContext(opts: {
  generationId: string;
  productSlug: string;
}): Promise<VariantRailContext | null> {
  const [generation, productResult] = await Promise.all([
    loadOwnedGeneration(opts.generationId),
    getPublicProductBySlug(opts.productSlug),
  ]);
  const product = productResult.data;
  if (!generation || !product) return null;

  const { data: members } = await getPresetFamilyRail(product);
  if (members.length <= 1) return null;

  const [images, outputAssetId] = await Promise.all([
    loadOrderedInputs(generation),
    loadPrimaryOutputAssetId(opts.generationId),
  ]);

  const parent = members.find((m) => m.isParent) ?? null;
  return {
    handoffs: buildSiblingHandoffs({
      members,
      generationId: opts.generationId,
      images,
      prompt: generation.user_prompt,
    }),
    currentProductId: generation.product_id,
    resultAsSourceAvailable: outputAssetId !== null,
    familyParent: parent ? { slug: parent.slug, name: parent.name } : null,
  };
}

/** Matches E4's ReusedSource — a carried `role` lands on the matching
 *  named slot; `null` fills the first open slot positionally. */
interface HandoffInput {
  assetId: string;
  url: string;
  name: string;
  role?: string | null;
}

export interface VariantRestoreResult {
  initialSource: HandoffInput | null;
  initialInputs: HandoffInput[];
  initialOptions: Record<string, unknown> | null;
  initialPrompt: string | null;
  /** Carry explanations the page surfaces — never silent drops. */
  notices: string[];
}

/**
 * Hydration for `/app/create/{slug}?variant_from={generationId}` — the
 * sibling counterpart of the `?from` Adjust restore. Only applies when the
 * source generation belongs to the caller and its product shares the
 * target's one-level family root; otherwise returns null and the page
 * treats the param as absent.
 */
export async function resolveVariantHandoff(
  product: PublicProductDetail,
  generationId: string,
  opts: { useOutputAsSource: boolean; multiReleased: boolean }
): Promise<VariantRestoreResult | null> {
  const previous = await loadOwnedGeneration(generationId);
  // Same-product restores belong to `?from` (Adjust) — never double-handle.
  if (!previous || previous.product_id === product.id) return null;

  // One-level family check: the source product's root must equal the
  // target's root. Catalog metadata (not user data) is read through the
  // service client so a since-retired source variant still resolves —
  // RLS would hide it and wrongly break the handoff.
  const service = createServiceClient();
  const { data: sourceProduct } = await service
    .from("products")
    .select("parent_preset_id")
    .eq("id", previous.product_id)
    .maybeSingle();
  const sourceRoot =
    (sourceProduct?.parent_preset_id as string | null) ?? previous.product_id;
  const targetRoot = product.parent_preset_id ?? product.id;
  if (sourceRoot !== targetRoot) return null;

  const notices: string[] = [];
  const initialInputs: HandoffInput[] = [];
  let initialSource: VariantRestoreResult["initialSource"] = null;

  if (opts.useOutputAsSource) {
    const outputAssetId = await loadPrimaryOutputAssetId(generationId);
    if (outputAssetId) {
      try {
        const url = await getSignedSourceUrlByAssetId(outputAssetId);
        initialSource = {
          assetId: outputAssetId,
          url,
          name: "Your previous result",
          role: null,
        };
        notices.push("Starting from your finished result");
      } catch {
        notices.push("Your result couldn't be used as the new input");
      }
    } else {
      notices.push("No finished output to use as input");
    }
  } else {
    const images = await loadOrderedInputs(previous);
    const plan = planVariantRestore({
      capability: product.input_capability ?? null,
      images,
      requestedOptions: null,
      activeFields: product.active_fields,
      prompt: null,
    });
    notices.push(...plan.notices);

    // Every carried input keeps the destination role the assessment
    // resolved — the form lands it on the matching named slot, so a
    // "background" photo can never drift into the "subject" slot.
    if (plan.sourceInput) {
      try {
        const url = await getSignedSourceUrlByAssetId(plan.sourceInput.assetId);
        initialSource = {
          assetId: plan.sourceInput.assetId,
          url,
          name: "Kept photo",
          role: plan.sourceInput.role,
        };
      } catch {
        notices.push("Your original photo couldn't be carried");
      }
    }

    // Extra carried inputs only stage when the multi-input pipeline is
    // released; otherwise they're reported, not silently dropped.
    if (plan.extraInputs.length > 0) {
      if (opts.multiReleased) {
        for (const input of plan.extraInputs) {
          try {
            const url = await getSignedSourceUrlByAssetId(input.assetId);
            initialInputs.push({
              assetId: input.assetId,
              url,
              name: "Kept photo",
              role: input.role,
            });
          } catch {
            notices.push("one image couldn't be carried");
          }
        }
      } else {
        notices.push("additional images can't be staged yet");
      }
    }
  }

  // Compatible options carry; keys the target doesn't declare are dropped
  // with a notice (planVariantRestore handles the filtering + count).
  const optionPlan = planVariantRestore({
    capability: null,
    images: [],
    requestedOptions: previous.requested_options,
    activeFields: product.active_fields,
    prompt: null,
  });
  notices.push(...optionPlan.notices);

  return {
    initialSource,
    initialInputs,
    initialOptions:
      Object.keys(optionPlan.options).length > 0 ? optionPlan.options : null,
    initialPrompt:
      typeof previous.user_prompt === "string" && previous.user_prompt
        ? previous.user_prompt
        : null,
    notices,
  };
}
