"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createFalAdapter } from "@/lib/ai/fal";
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
  provider_strategy: { primary_provider: string; primary_model?: string };
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

function getProviderEndpoint(
  providerStrategy: Record<string, unknown>
): string | null {
  const primary = providerStrategy.primary_provider;
  const model = providerStrategy.primary_model;
  if (typeof primary !== "string") return null;
  if (primary === "fal.ai" && model === "flux-pro") {
    return "fal-ai/flux/dev/image-to-image";
  }
  if (typeof model === "string" && model.startsWith("fal-ai/")) {
    return model;
  }
  if (primary === "fal-ai" && typeof model === "string" && model.length > 0) {
    return `fal-ai/${model}`;
  }
  return null;
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

  if (createError || !createData || (createData as unknown[]).length === 0) {
    const logMessage =
      createError?.message ?? "create_generation returned no data";
    console.error(
      "[createAndSubmitGeneration] create_generation failed",
      logMessage
    );
    return { error: userFacingError() };
  }

  const row = (createData as unknown[])[0] as {
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

  try {
    const recipe = await getPrivateRecipe(
      input.productId,
      input.productVersionId
    );
    if (!recipe) {
      await supabase.rpc("fail_generation_refund", {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_failure_code: "recipe_unavailable",
        p_failure_stage: "configuration",
      });
      redirect(`/app/generations/${row.generation_id}`);
    }

    if (recipe.product_type === "poster") {
      await supabase.rpc("fail_generation_refund", {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_failure_code: "poster_not_implemented",
        p_failure_stage: "post_processing",
      });
      redirect(`/app/generations/${row.generation_id}`);
    }

    const endpoint = getProviderEndpoint(recipe.provider_strategy);
    if (!endpoint) {
      await supabase.rpc("fail_generation_refund", {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_failure_code: "missing_provider_endpoint",
        p_failure_stage: "configuration",
      });
      redirect(`/app/generations/${row.generation_id}`);
    }

    const sourceUrl = await import("./upload").then((m) =>
      m.getSignedSourceUrlByAssetId(input.sourceAssetId)
    );

    const prompt = compilePrompt(
      recipe.private_instruction_template,
      input.options
    );

    const provider = createFalAdapter();
    const submitResult = await provider.submit({
      endpoint,
      prompt,
      negativePrompt: recipe.private_negative_instruction ?? undefined,
      sourceImageUrl: sourceUrl,
      options: input.options,
      modelConfig: recipe.model_config,
    });

    const { error: attachError } = await supabase.rpc(
      "attach_provider_request",
      {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_provider_request_id: submitResult.requestId,
        p_provider_endpoint: endpoint,
      }
    );

    if (attachError) {
      console.error(
        "[createAndSubmitGeneration] attach_provider_request failed",
        attachError.message
      );
    }

    redirect(`/app/generations/${row.generation_id}`);
  } catch (error) {
    console.error(
      "[createAndSubmitGeneration] submission error",
      error instanceof Error ? error.message : String(error)
    );

    try {
      await supabase.rpc("fail_generation_refund", {
        p_generation_id: row.generation_id,
        p_token: row.processing_token,
        p_failure_code: "submit_failed",
        p_failure_stage: "provider_submit",
      });
    } catch (refundError) {
      console.error(
        "[createAndSubmitGeneration] refund after submit failed",
        refundError instanceof Error ? refundError.message : String(refundError)
      );
    }

    return { error: userFacingError() };
  }
}
