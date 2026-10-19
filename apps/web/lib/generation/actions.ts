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
import {
  getRouteCapability,
  checkRouteInputBudget,
} from "@/lib/ai/route-capabilities";
import {
  compilePrompt,
  referencePromptClause,
  userPromptSection,
} from "@/lib/ai/prompt";
import { extractUserText, screenUserText } from "@/lib/moderation/creem";
import {
  isOpenAiModerationConfigured,
  screenUserPrompt,
} from "@/lib/moderation/openai";
import { screenUserImage } from "@/lib/moderation/image";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSignedReferenceAssets } from "./reference-assets";
import { inputAssetRejectionReason } from "./input-assets";
import {
  getAssetObjectVersion,
  loadUserInputAssets,
  markAssetModerationStatus,
  signUserInputAssets,
} from "./upload";
import { resolveOutputSize } from "./output-size";
import { createGenerationQuote } from "@/lib/pricing/quote";
import { promptCapabilityOf, validateUserPrompt } from "./user-prompt";
import { isMultiInputReleased } from "./release-gates";
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
  /** Per-version prompt capability (#176) — immutable while the version is
   *  active; absent/false means custom prompting is disabled. */
  prompt_override_enabled: boolean;
  prompt_max_chars: number;
  products: {
    type: "filter" | "poster";
    metadata: Record<string, unknown> | null;
  };
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
      prompt_override_enabled,
      prompt_max_chars,
      products!inner(public_status, visibility, type, metadata)
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

/** products.metadata->filter_config->identity_preservation, when declared. */
function identityPreservationOf(recipe: PrivateRecipe): string | undefined {
  const filterConfig = recipe.products?.metadata?.filter_config;
  const level =
    filterConfig && typeof filterConfig === "object"
      ? (filterConfig as Record<string, unknown>).identity_preservation
      : undefined;
  return typeof level === "string" ? level : undefined;
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

  // Ordered inputs (#176): `inputs` is the contract; the deprecated
  // `sourceAssetId` is the single-image alias. The RPC re-validates count,
  // ownership, roles and quote binding — this normalization only shapes the
  // request.
  const inputs =
    input.inputs && input.inputs.length > 0
      ? input.inputs
      : input.sourceAssetId
        ? [{ assetId: input.sourceAssetId }]
        : [];
  if (inputs.length === 0) {
    return { error: "A source image is required." };
  }

  // Release brake (#178/#179): the provider pipeline below submits the full
  // ordered input set, but rollout stays behind the deploy-level
  // PRESET_MULTI_INPUT_ENABLED flag — while OFF, multi-input requests are
  // rejected before moderation/quoting so the charged path stays
  // fail-closed, matching the consumer UI's one-photo fallback.
  if (inputs.length > 1 && !isMultiInputReleased()) {
    return {
      error: "Multi-image generation is not yet available for this preset.",
    };
  }

  // Load + gate every requested input before any moderation/quote work
  // (#179): ownership is enforced by the RLS-scoped load (a foreign id is a
  // missing row), and each asset must pass bucket/media/size/pixel,
  // soft-delete, and moderation-status checks. No requested image may be
  // silently dropped.
  let inputAssets;
  try {
    inputAssets = await loadUserInputAssets(inputs.map((i) => i.assetId));
  } catch {
    return { error: "One or more of your images could not be found." };
  }
  for (const row of inputAssets) {
    const rejection = inputAssetRejectionReason(row);
    if (rejection) return { error: rejection };
  }

  // Creem content-policy screen (required for AI image products): every
  // generation path must call the Moderation API before credits are
  // reserved or the provider is invoked. Free-text options are screened
  // verbatim; image-only requests send a fixed neutral descriptor so the
  // call still happens (repeat payloads are cached/free server-side).
  // deny/flag → blocked; an unreachable moderator fails closed.
  // The optional user-edited prompt is intentionally screened separately
  // below via the guarded fail-closed path (#183).
  const userText = extractUserText(input.options).join("\n");
  // Legacy text fields must not bypass moderation: when the OpenAI screen
  // is configured it takes over from the flag-gated Creem path for ALL
  // user-entered option text — fail-closed. Without the key, the paused
  // Creem gate keeps prompt-less presets' behavior unchanged.
  const screening = isOpenAiModerationConfigured()
    ? await screenUserPrompt(
        userText || "user photo transformation",
        `user_${user.id}:product_${input.productId}`
      )
    : await screenUserText(
        userText || "user photo transformation",
        `user_${user.id}:product_${input.productId}`
      );
  if (screening.kind === "blocked") {
    return {
      error:
        "That text can't be used — it violates our content policy. Please revise it and try again.",
    };
  }
  if (screening.kind === "unavailable") {
    return {
      error:
        "We couldn't verify your input right now. Please try again in a moment.",
    };
  }
  // Image moderation (#179): every user photo must be verified before it is
  // quoted or transmitted — including reused Library assets. Text screening
  // can never attest to image content, so each asset carries its own review
  // state: 'approved' with a recorded object version records a completed
  // image screen bound to exact bytes; anything else is screened now
  // against the image classifier (rejected/flagged states were already
  // blocked by inputAssetRejectionReason). Each screen is bracketed by
  // object-version reads — an overwrite mid-screen discards the verdict —
  // and the approval stamps the screened version. A blocked verdict is
  // stamped 'flagged'; an unreachable classifier fails closed — the
  // create_generation RPC refuses unapproved or version-mismatched inputs
  // regardless.
  const inputImageUrls = await signUserInputAssets(inputAssets);
  const service = createServiceClient();
  const pendingIndexes = inputAssets
    .map((row, i) =>
      row.moderationStatus === "approved" && row.moderationObjectVersion
        ? -1
        : i
    )
    .filter((i) => i >= 0);
  const imageVerdicts = await Promise.all(
    pendingIndexes.map(async (i) => {
      const row = inputAssets[i]!;
      const versionBefore = await getAssetObjectVersion(service, row);
      if (!versionBefore) {
        return {
          index: i,
          verdict: { kind: "unavailable" as const },
          version: null,
        };
      }
      const verdict = await screenUserImage(
        inputImageUrls[i]!,
        `user_${user.id}:asset_${row.assetId}`
      );
      const versionAfter = await getAssetObjectVersion(service, row);
      // The bytes swapped mid-screen — the verdict can't be attributed to
      // the current object; fail closed rather than approve blind.
      if (!versionAfter || versionAfter !== versionBefore) {
        return {
          index: i,
          verdict: { kind: "unavailable" as const },
          version: null,
        };
      }
      return { index: i, verdict, version: versionBefore };
    })
  );
  if (imageVerdicts.some((v) => v.verdict.kind === "unavailable")) {
    return {
      error:
        "We couldn't verify your input right now. Please try again in a moment.",
    };
  }
  for (const screened of imageVerdicts) {
    const row = inputAssets[screened.index]!;
    if (screened.verdict.kind === "blocked") {
      // Best-effort flag so the image can't be re-submitted; the refusal is
      // already decided regardless of whether the stamp lands.
      await markAssetModerationStatus(service, row.assetId, user.id, "flagged");
      return {
        error:
          "One of your images can't be used — it violates our content policy.",
      };
    }
    // Persist the approval bound to the screened object version — a stamp
    // that doesn't land means the review isn't verifiable, and the RPC
    // would reject the input anyway.
    const marked = await markAssetModerationStatus(
      service,
      row.assetId,
      user.id,
      "approved",
      screened.version ?? undefined
    );
    if (!marked) {
      return {
        error:
          "We couldn't verify your input right now. Please try again in a moment.",
      };
    }
  }

  // "Match photo" sizes resolve from the primary (ordinal-1) input image
  // (clamped to the 4 MP cap); fixed sizes are validated as-is.
  const outputSize = await resolveOutputSize(
    input.outputSize,
    inputs[0]!.assetId,
    input.productId
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

  // User-edited preset prompt (#183): the PINNED version's capability and
  // the server release gate decide — a hand-crafted `prompt` field on an
  // ineligible preset/version is rejected here, before any quote or charge.
  const promptValidation = validateUserPrompt(
    input.prompt,
    promptCapabilityOf(recipe)
  );
  if (!promptValidation.ok) {
    return { error: promptValidation.error };
  }
  const userPrompt = promptValidation.prompt;

  if (userPrompt) {
    // Route compatibility (#183): the version capability only declares the
    // preset eligible — every route that could serve the request must also
    // honor an appended user edit. Unknown/unsupported endpoints fail
    // closed before any quote or credit reservation.
    const routesAllowPrompt =
      getRouteCapability(
        recipe.provider_strategy.primary_provider,
        recipe.provider_strategy.primary_model
      )?.supports_prompt_edit === true &&
      (!recipe.provider_strategy.fallback_provider ||
        getRouteCapability(
          recipe.provider_strategy.fallback_provider,
          recipe.provider_strategy.fallback_model
        )?.supports_prompt_edit === true);
    if (!routesAllowPrompt) {
      return { error: "Custom prompts are not enabled for this preset." };
    }

    // Custom prompts take the guarded fail-closed OpenAI screen: the
    // legacy flag-off "allow" inside screenUserText must never authorize
    // them. Free-text option values are screened in the same call — a
    // legacy text field cannot bypass the moderated path while prompt
    // mode is active.
    const promptScreen = await screenUserPrompt(
      [userPrompt, ...extractUserText(input.options)],
      `user_${user.id}:product_${input.productId}`
    );
    if (promptScreen.kind === "blocked") {
      return {
        error:
          "That text can't be used — it violates our content policy. Please revise it and try again.",
      };
    }
    if (promptScreen.kind === "unavailable") {
      return {
        error:
          "We couldn't verify your input right now. Please try again in a moment.",
      };
    }
  }

  const endpoint = getProviderEndpoint(recipe.provider_strategy);
  if (!endpoint) {
    return { error: userFacingError() };
  }

  // Route capability (#179): user inputs AND admin-private references must
  // fit the resolved endpoint's verified total-input budget, and a route
  // without a registry entry cannot take multi-image requests at all —
  // fail closed BEFORE a quote/credit reservation exists, never fall back
  // to sending a truncated input set.
  const references = await getSignedReferenceAssets(input.productId);
  const referenceImageUrls = references.map((r) => r.url);
  const budget = checkRouteInputBudget(
    endpoint,
    inputs.length,
    referenceImageUrls.length
  );
  if (!budget.ok) {
    console.error("[createAndSubmitGeneration] route input budget", {
      endpoint,
      reason: budget.reason,
      total: budget.total,
    });
    return {
      error:
        "This preset can't accept that many photos. Please remove some and try again.",
    };
  }

  // The quoted fallback must carry the same input set — a fallback that
  // can't fit user inputs + references is excluded from the quote envelope
  // rather than allowed to receive a silently truncated request.
  const requestedFallback = getFallbackEndpoint(recipe.provider_strategy);
  const capableFallbackEndpoint =
    requestedFallback &&
    checkRouteInputBudget(
      requestedFallback,
      inputs.length,
      referenceImageUrls.length
    ).ok
      ? requestedFallback
      : null;
  if (requestedFallback && !capableFallbackEndpoint) {
    console.warn(
      "[createAndSubmitGeneration] fallback excluded — cannot carry input set",
      requestedFallback
    );
  }

  // Server-authoritative quote: the recipe's endpoint + resolved output size
  // are priced against a fresh provider snapshot; credits are reserved against
  // the bounded maximum. No quote → fail closed, never a fallback price.
  const quote = await createGenerationQuote(service, {
    userId: user.id,
    productId: input.productId,
    productVersionId: input.productVersionId,
    options: input.options,
    inputAssetIds: inputs.map((i) => i.assetId),
    inputRoles: inputs.map((i) => i.role ?? null),
    userPrompt,
    outputWidth: outputSize.width,
    outputHeight: outputSize.height,
    requestConfig: recipe.model_config,
    provider: "fal",
    endpoint,
    fallbackEndpoint: capableFallbackEndpoint,
  });
  if (!quote.ok) {
    return {
      error: "This preset is temporarily unavailable. Please try again later.",
    };
  }

  const { data: createData, error: createError } = await supabase.rpc(
    "create_generation",
    {
      p_quote_id: quote.quoteId,
      p_input_assets: inputs.map((i) => ({
        asset_id: i.assetId,
        role: i.role ?? null,
      })),
      p_options: input.options,
      p_user_prompt: userPrompt,
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
    provider_endpoint: string | null;
    output_width: number | null;
    output_height: number | null;
  };

  if (!row.processing_token) {
    redirect(`/app/generations/${row.generation_id}`);
  }

  await setProcessingTokenCookie(row.generation_id, row.processing_token);

  // Endpoint and dimensions come back from the consumed quote — never from
  // the client. The fallback is used only when it was quoted inside the
  // reservation envelope.
  const submitEndpoint = row.provider_endpoint ?? endpoint;
  const fallbackEndpoint = quote.eligibleFallbackEndpoint;
  const submitWidth = row.output_width ?? outputSize.width;
  const submitHeight = row.output_height ?? outputSize.height;

  let failureCode: string | null = null;
  let failureStage: string | null = null;

  try {
    // Every validated input was signed and screened before the quote; the
    // ordered user URLs (ordinal-1 first) are transmitted first and
    // admin-private references are appended after. The adapter re-verifies
    // the total against the route registry, so a request the endpoint can't
    // honor can never leave this process.

    const prompt =
      compilePrompt(recipe.private_instruction_template, input.options) +
      referencePromptClause(references.flatMap((r) => r.roles)) +
      (userPrompt
        ? userPromptSection(userPrompt, {
            productType: recipe.products?.type,
            identityPreservation: identityPreservationOf(recipe),
          })
        : "");

    const modelConfig: Record<string, unknown> = {
      ...recipe.model_config,
      width: submitWidth,
      height: submitHeight,
      image_size: {
        width: submitWidth,
        height: submitHeight,
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
    let usedEndpoint = submitEndpoint;

    try {
      submitResult = await provider.submit({
        endpoint: submitEndpoint,
        prompt,
        negativePrompt: recipe.private_negative_instruction ?? undefined,
        inputImageUrls,
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
          inputImageUrls,
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
      "product_id, product_version_id, source_asset_id, requested_options, progress, user_prompt"
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

  // Replay the full ordered input set (owner-readable via RLS); generations
  // predating the mapping table fall back to the source_asset_id column.
  const { data: inputRows } = await supabase
    .from("generation_input_assets")
    .select("asset_id, role, ordinal")
    .eq("generation_id", generationId)
    .order("ordinal", { ascending: true });

  const inputs =
    inputRows && inputRows.length > 0
      ? inputRows.map((r) => ({
          assetId: r.asset_id as string,
          role: (r.role as string | null) ?? undefined,
        }))
      : [{ assetId: previous.source_asset_id as string }];

  const progress = (previous.progress ?? {}) as Record<string, unknown>;
  const outputWidth = Number(progress.output_width);
  const outputHeight = Number(progress.output_height);

  const idempotencyKey = `regen:${user.id}:${generationId}:${uuidv4()}`;
  return createAndSubmitGeneration({
    productId: previous.product_id,
    productVersionId: previous.product_version_id,
    inputs,
    prompt: (previous.user_prompt as string | null) ?? undefined,
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
