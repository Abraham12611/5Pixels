"use server";

import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { createFalAdapter } from "@/lib/ai/fal";
import { compilePrompt } from "@/lib/ai/prompt";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getSignedAssetUrl,
  getSignedSourceUrlByAssetId,
} from "@/lib/generation/upload";
import { pollGenerationStatus } from "@/lib/generation/poll";
import { isValidLabEndpoint, isValidLabOutputSize } from "@/lib/lab/validate";
import type { OutputSizeOption } from "@/types/catalog";
import type { ProviderStrategy } from "@/lib/ai/provider-routing";

/**
 * Admin lab actions — run a preset against one or more explicit provider
 * endpoints and inspect the results side by side. Every entry point verifies
 * admin/owner status itself; these routes never rely on page-level gating.
 */

const TOKEN_COOKIE_PREFIX = "gen_token_";

interface AdminContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}

async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_owner")
    .eq("id", user.id)
    .single();

  if (!(profile?.is_admin || profile?.is_owner)) return null;
  return { supabase, userId: user.id };
}

async function setProcessingTokenCookie(
  generationId: string,
  token: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(`${TOKEN_COOKIE_PREFIX}${generationId}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "strict",
    maxAge: 60 * 60 * 4,
  });
}

interface LabRecipe {
  private_instruction_template: string;
  private_negative_instruction: string | null;
  provider_strategy: ProviderStrategy;
  model_config: Record<string, unknown>;
}

async function getLabRecipe(
  productId: string,
  versionId: string
): Promise<LabRecipe | null> {
  const service = createServiceClient();
  // Admin-gated by the caller — drafts and testing versions are valid lab
  // targets, so no public_status/state filters here.
  const { data, error } = await service
    .from("product_versions")
    .select(
      `
      state,
      private_instruction_template,
      private_negative_instruction,
      provider_strategy,
      model_config
    `
    )
    .eq("id", versionId)
    .eq("product_id", productId)
    .single();

  if (error || !data) {
    console.error("[lab] recipe lookup failed", error?.message);
    return null;
  }

  return data as unknown as LabRecipe;
}

export interface LabRunInput {
  productId: string;
  productVersionId: string;
  sourceAssetId: string;
  options: Record<string, unknown>;
  outputSize: OutputSizeOption;
  /** Explicit provider endpoint to test (e.g. "fal-ai/flux/dev/image-to-image"). */
  endpointId: string;
  /** Optional instruction overrides — let admins test prompt variations without touching the saved recipe. */
  instructionOverride?: string;
  negativeOverride?: string;
}

export interface LabRunResult {
  generationId?: string;
  creditCost?: number;
  balanceAfter?: number;
  error?: string;
}

/**
 * Create one generation pinned to `endpointId` and submit it to the provider.
 * No fallback and no redirect — the lab card owns the lifecycle so failures
 * surface per-model in the comparison grid. Credits are priced dynamically by
 * the endpoint's own pricing row, exactly like the consumer path.
 */
export async function runLabGeneration(
  input: LabRunInput
): Promise<LabRunResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { error: "Admin access required." };
  }

  if (!isValidLabEndpoint(input.endpointId)) {
    return { error: "Invalid endpoint." };
  }
  if (!isValidLabOutputSize(input.outputSize)) {
    return { error: "Invalid output size." };
  }

  const recipe = await getLabRecipe(input.productId, input.productVersionId);
  if (!recipe) {
    return { error: "Preset is not available for testing." };
  }

  const { data: createData, error: createError } = await ctx.supabase.rpc(
    "create_generation",
    {
      p_product_id: input.productId,
      p_product_version_id: input.productVersionId,
      p_source_asset_id: input.sourceAssetId,
      p_options: input.options,
      p_idempotency_key: `lab:${ctx.userId}:${uuidv4()}`,
      p_provider_endpoint: input.endpointId,
      p_output_width: input.outputSize.width,
      p_output_height: input.outputSize.height,
    }
  );

  if (
    createError ||
    !Array.isArray(createData) ||
    createData.length === 0 ||
    !createData[0]
  ) {
    const message = createError?.message ?? "create_generation returned no data";
    console.error("[lab] create_generation failed", message);
    if (message.toLowerCase().includes("insufficient")) {
      return { error: "Insufficient credits." };
    }
    return { error: "Unable to start the test run." };
  }

  const row = createData[0] as unknown as {
    generation_id: string;
    processing_token: string | null;
    balance_after: number | string;
    credit_cost: number | string;
  };

  const creditCost = Number(row.credit_cost) || 0;
  const balanceAfter = Number(row.balance_after) || 0;

  if (!row.processing_token) {
    return {
      generationId: row.generation_id,
      creditCost,
      balanceAfter,
    };
  }

  await setProcessingTokenCookie(row.generation_id, row.processing_token);

  try {
    const sourceUrl = await getSignedSourceUrlByAssetId(input.sourceAssetId);
    const prompt = compilePrompt(
      input.instructionOverride?.trim() || recipe.private_instruction_template,
      input.options
    );

    const modelConfig: Record<string, unknown> = {
      ...recipe.model_config,
      width: input.outputSize.width,
      height: input.outputSize.height,
      image_size: {
        width: input.outputSize.width,
        height: input.outputSize.height,
      },
    };

    const provider = createFalAdapter();
    const submitResult = await provider.submit({
      endpoint: input.endpointId,
      prompt,
      negativePrompt:
        input.negativeOverride?.trim() ||
        recipe.private_negative_instruction ||
        undefined,
      sourceImageUrl: sourceUrl,
      options: input.options,
      modelConfig,
    });

    const { error: attachError } = await ctx.supabase.rpc(
      "attach_provider_request",
      {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_provider_request_id: submitResult.requestId,
        p_provider_endpoint: input.endpointId,
      }
    );

    if (attachError) {
      console.error("[lab] attach_provider_request failed", attachError.message);
    }
  } catch (error) {
    console.error(
      "[lab] submission error",
      error instanceof Error ? error.message : String(error)
    );
    try {
      await ctx.supabase.rpc("fail_generation_refund", {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_failure_code: "submit_failed",
        p_failure_stage: "provider_submit",
      });
    } catch (refundError) {
      console.error("[lab] refund after submit failed", refundError);
    }
    return {
      generationId: row.generation_id,
      creditCost,
      balanceAfter,
      error:
        error instanceof Error && error.message
          ? `Submit failed: ${error.message}`
          : "Provider submission failed.",
    };
  }

  return {
    generationId: row.generation_id,
    creditCost,
    balanceAfter,
  };
}

export interface LabPollResult {
  status?: string;
  imageUrl?: string | null;
  creditCost?: number;
  failureCode?: string | null;
  error?: string;
}

/**
 * Poll one lab generation and, once it has outputs, return a signed URL for
 * the primary result image. Reuses the consumer lifecycle (provider poll →
 * download → post-process → complete) so lab results are identical to what a
 * consumer would receive.
 */
export async function pollLabGeneration(
  generationId: string
): Promise<LabPollResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { error: "Admin access required." };
  }

  const { generation, error } = await pollGenerationStatus(generationId);
  if (!generation) {
    return { error: error ?? "Generation not found." };
  }

  let imageUrl: string | null = null;
  const output = generation.outputs?.[0];
  if (output?.bucket && output.storageKey) {
    try {
      imageUrl = await getSignedAssetUrl(output.bucket, output.storageKey, 3600);
    } catch {
      imageUrl = null;
    }
  }

  return {
    status: generation.status,
    imageUrl,
    creditCost: generation.creditCost,
    failureCode: generation.failureCode,
    error,
  };
}
