"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createFalAdapter } from "@/lib/ai/fal";
import {
  getProviderEndpoint,
  getFallbackEndpoint,
  isRetryableSubmitError,
  type ProviderStrategy,
} from "@/lib/ai/provider-routing";
import { compilePrompt } from "@/lib/ai/prompt";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  const { data: createData, error: createError } = await supabase.rpc(
    "create_generation",
    {
      p_product_id: input.productId,
      p_product_version_id: input.productVersionId,
      p_source_asset_id: input.sourceAssetId,
      p_options: input.options,
      p_idempotency_key: input.idempotencyKey,
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
    const recipe = await getPrivateRecipe(
      input.productId,
      input.productVersionId
    );
    if (!recipe) {
      failureCode = "recipe_unavailable";
      failureStage = "configuration";
    } else {
      const endpoint = getProviderEndpoint(recipe.provider_strategy);
      const fallbackEndpoint = getFallbackEndpoint(recipe.provider_strategy);

      if (!endpoint) {
        failureCode = "missing_provider_endpoint";
        failureStage = "configuration";
      } else {
        const sourceUrl = await import("./upload").then((m) =>
          m.getSignedSourceUrlByAssetId(input.sourceAssetId)
        );

        const prompt = compilePrompt(
          recipe.private_instruction_template,
          input.options
        );

        const provider = createFalAdapter();
        let submitResult;
        let usedEndpoint = endpoint;

        try {
          submitResult = await provider.submit({
            endpoint,
            prompt,
            negativePrompt: recipe.private_negative_instruction ?? undefined,
            sourceImageUrl: sourceUrl,
            options: input.options,
            modelConfig: recipe.model_config,
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
              options: input.options,
              modelConfig: recipe.model_config,
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
      }
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
