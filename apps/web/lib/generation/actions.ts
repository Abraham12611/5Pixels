"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { createFalAdapter } from "@/lib/ai/fal";
import {
  getProviderEndpoint,
  getFallbackEndpoint,
  isRetryableSubmitError,
  type ProviderStrategy,
} from "@/lib/ai/provider-routing";
import { compilePrompt, referencePromptClause } from "@/lib/ai/prompt";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSignedReferenceAssets } from "./reference-assets";
import { resolveOutputSize } from "./output-size";
import type { CreateGenerationInput } from "./types";

const TOKEN_COOKIE_PREFIX = "gen_token_";

function tokenCookieName(generationId: string): string {
  return `${TOKEN_COOKIE_PREFIX}${generationId}`;
}

async function setProcessingTokenCookie(
  generationId: string,
  token: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(tokenCookieName(generationId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: `/app/generations/${generationId}`,
    sameSite: "strict",
    maxAge: 60 * 60 * 4, // 4 hours
  });
}

interface PrivateRecipe {
  product_type: "filter" | "poster";
  private_instruction_template: string;
  private_negative_instruction: string | null;
  provider_strategy: ProviderStrategy;
  model_config: Record<string, unknown>;
  post_process_config: Record<string, unknown>;
}

async function getPrivateRecipe(
  productId: string,
  versionId: string
): Promise<PrivateRecipe | null> {
  // Load the private recipe through the service-role client only after
  // confirming the product/version is active and public. The browser never
  // sees this data.
  const service = createServiceClient();
  const { data, error } = await service
    .from("product_versions")
    .select(
      `
      product_id,
      state,
      private_instruction_template,
      private_negative_instruction,
      provider_strategy,
      model_config,
      post_process_config,
      products!inner(public_status, visibility, type)
    `
    )
    .eq("id", versionId)
    .eq("product_id", productId)
    .eq("state", "active")
    .eq("products.public_status", "active")
    .eq("products.visibility", "public")
    .single();

  if (error || !data) {
    console.error("[getPrivateRecipe] recipe lookup failed", error?.message);
    return null;
  }

  return data as unknown as PrivateRecipe;
}

function userFacingError(): string {
  return "Unable to start generation. Please try again.";
}

export interface CreateAndSubmitResult {
  error: string;
}

export async function createAndSubmitGeneration(
  input: CreateGenerationInput
): Promise<CreateAndSubmitResult | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  // "Match photo" sizes resolve from the uploaded source image (clamped to
  // the 4 MP cap); fixed sizes are validated as-is.
  const outputSize = await resolveOutputSize(
    input.outputSize,
    input.sourceAssetId
  );
  if (!outputSize) {
    return { error: "Invalid output size." };
  }

  // Load the private recipe before reserving credits so we know the planned
  // provider endpoint and can compute the dynamic cost up front.
  const recipe = await getPrivateRecipe(input.productId, input.productVersionId);
  if (!recipe) {
    return { error: userFacingError() };
  }

  const endpoint = getProviderEndpoint(recipe.provider_strategy);
  if (!endpoint) {
    return { error: userFacingError() };
  }

  const { data: createData, error: createError } = await supabase.rpc(
    "create_generation",
    {
      p_product_id: input.productId,
      p_product_version_id: input.productVersionId,
      p_source_asset_id: input.sourceAssetId,
      p_options: input.options,
      p_idempotency_key: input.idempotencyKey,
      p_provider_endpoint: endpoint,
      p_output_width: outputSize.width,
      p_output_height: outputSize.height,
    }
  );

  if (
    createError ||
    !Array.isArray(createData) ||
    createData.length === 0 ||
    !createData[0]
  ) {
    const logMessage =
      createError?.message ?? "create_generation returned no data";
    console.error(
      "[createAndSubmitGeneration] create_generation failed",
      logMessage
    );
    return { error: userFacingError() };
  }

  const row = createData[0] as unknown as {
    generation_id: string;
    status: string;
    processing_token: string | null;
    balance_after: number;
    credit_cost: number;
  };

  if (!row.processing_token) {
    redirect(`/app/generations/${row.generation_id}`);
  }

  await setProcessingTokenCookie(row.generation_id, row.processing_token);

  let failureCode: string | null = null;
  let failureStage: string | null = null;

  try {
    const fallbackEndpoint = getFallbackEndpoint(recipe.provider_strategy);
    const [sourceUrl, references] = await Promise.all([
      import("./upload").then((m) =>
        m.getSignedSourceUrlByAssetId(input.sourceAssetId)
      ),
      getSignedReferenceAssets(input.productId),
    ]);
    const referenceImageUrls = references.map((r) => r.url);

    const prompt =
      compilePrompt(recipe.private_instruction_template, input.options) +
      referencePromptClause(references.flatMap((r) => r.roles));

    const modelConfig: Record<string, unknown> = {
      ...recipe.model_config,
      width: outputSize.width,
      height: outputSize.height,
      image_size: {
        width: outputSize.width,
        height: outputSize.height,
      },
    };
    // "Match photo" maps to aspect_ratio "auto" on endpoints that honor it
    // (nano-banana keeps the source's exact aspect); the resolved dims still
    // drive image_size everywhere else and billing in the RPC.
    if (outputSize.matchSource && modelConfig.aspect_ratio === undefined) {
      modelConfig.aspect_ratio = "auto";
    }

    const provider = createFalAdapter();
    let submitResult;
    let usedEndpoint = endpoint;

    try {
      submitResult = await provider.submit({
        endpoint,
        prompt,
        negativePrompt: recipe.private_negative_instruction ?? undefined,
        sourceImageUrl: sourceUrl,
        referenceImageUrls,
        options: input.options,
        modelConfig,
      });
    } catch (primaryError) {
      if (fallbackEndpoint && isRetryableSubmitError(primaryError)) {
        console.error(
          "[createAndSubmitGeneration] primary provider failed, trying fallback",
          primaryError instanceof Error ? primaryError.message : String(primaryError)
        );
        usedEndpoint = fallbackEndpoint;
        submitResult = await provider.submit({
          endpoint: fallbackEndpoint,
          prompt,
          negativePrompt: recipe.private_negative_instruction ?? undefined,
          sourceImageUrl: sourceUrl,
          referenceImageUrls,
          options: input.options,
          modelConfig,
        });
      } else {
        throw primaryError;
      }
    }

    const { error: attachError } = await supabase.rpc(
      "attach_provider_request",
      {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_provider_request_id: submitResult.requestId,
        p_provider_endpoint: usedEndpoint,
      }
    );

    if (attachError) {
      console.error(
        "[createAndSubmitGeneration] attach_provider_request failed",
        attachError.message
      );
    }
  } catch (error) {
    console.error(
      "[createAndSubmitGeneration] submission error",
      error instanceof Error ? error.message : String(error)
    );
    if (!failureCode) {
      failureCode = "submit_failed";
      failureStage = "provider_submit";
    }
  }

  if (failureCode) {
    try {
      const { error: failError } = await supabase.rpc("fail_generation_refund", {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_failure_code: failureCode,
        p_failure_stage: failureStage,
      });
      if (failError) {
        console.error(
          "[createAndSubmitGeneration] fail_generation_refund failed",
          failError.message
        );
      }
    } catch (refundError) {
      console.error(
        "[createAndSubmitGeneration] refund after submit failed",
        refundError instanceof Error ? refundError.message : String(refundError)
      );
    }
  }

  redirect(`/app/generations/${row.generation_id}`);
}

/**
 * Regenerate: start a new run with the same preset, source photo, options,
 * and output size as a previous generation. Credits are charged again — the
 * caller surfaces the cost on the action before the user commits.
 */
export async function regenerateGeneration(
  generationId: string
): Promise<CreateAndSubmitResult | never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please sign in to continue." };
  }

  const { data: previous, error } = await supabase
    .from("generations")
    .select(
      "product_id, product_version_id, source_asset_id, requested_options, progress"
    )
    .eq("id", generationId)
    .eq("user_id", user.id)
    .single();

  if (error || !previous) {
    return { error: "This transformation can't be regenerated." };
  }
  if (!previous.product_version_id || !previous.source_asset_id) {
    return { error: "This transformation can't be regenerated." };
  }

  const progress = (previous.progress ?? {}) as Record<string, unknown>;
  const outputWidth = Number(progress.output_width);
  const outputHeight = Number(progress.output_height);

  const idempotencyKey = `regen:${user.id}:${generationId}:${uuidv4()}`;
  return createAndSubmitGeneration({
    productId: previous.product_id,
    productVersionId: previous.product_version_id,
    sourceAssetId: previous.source_asset_id,
    options:
      (previous.requested_options as Record<string, unknown> | null) ?? {},
    outputSize: {
      name: "Previous size",
      width: outputWidth > 0 ? outputWidth : 1024,
      height: outputHeight > 0 ? outputHeight : 1024,
    },
    idempotencyKey,
  });
}
