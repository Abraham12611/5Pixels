"use server";

import { cookies } from "next/headers";
import { createFalAdapter } from "@/lib/ai/fal";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createOutputAsset, uploadOutputImage } from "@/lib/generation/upload";
import type { SafeGenerationDetail } from "./types";

const TOKEN_COOKIE_PREFIX = "gen_token_";

export interface PollResult {
  generation: SafeGenerationDetail | null;
  error?: string;
}

interface ProviderRow {
  requestId: string;
  endpoint: string;
}

async function readProcessingToken(
  generationId: string
): Promise<string | null> {
  const cookieStore = await cookies();
  return (
    cookieStore.get(`${TOKEN_COOKIE_PREFIX}${generationId}`)?.value ?? null
  );
}

async function fetchSafeGeneration(
  generationId: string
): Promise<SafeGenerationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_generation_by_id", {
    p_generation_id: generationId,
  });
  if (error || !data || (data as unknown[]).length === 0) {
    console.error("[poll] get_user_generation_by_id failed", error?.message);
    return null;
  }
  return mapGenerationRow(data as unknown[]);
}

function mapGenerationRow(rows: unknown[]): SafeGenerationDetail {
  const row = rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    productId: row.product_id as string,
    productName: row.product_name as string,
    productSlug: row.product_slug as string,
    productType: row.product_type as string,
    status: row.status as string,
    statusDetail: (row.status_detail as string | null) ?? null,
    progress: (row.progress as Record<string, unknown> | null) ?? null,
    creditCost: row.credit_cost as number,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    outputAssetId: (row.output_asset_id as string | null) ?? null,
    outputRole: (row.output_role as string | null) ?? null,
    outputBucket: (row.output_bucket as string | null) ?? null,
    outputStorageKey: (row.output_storage_key as string | null) ?? null,
    outputMimeType: (row.output_mime_type as string | null) ?? null,
    outputWidth: (row.output_width as number | null) ?? null,
    outputHeight: (row.output_height as number | null) ?? null,
    sourceAssetId: (row.source_asset_id as string | null) ?? null,
    sourceBucket: (row.source_bucket as string | null) ?? null,
    sourceStorageKey: (row.source_storage_key as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    failureCode: (row.failure_code as string | null) ?? null,
    failureStage: (row.failure_stage as string | null) ?? null,
    outputs: Array.isArray(row.outputs)
      ? row.outputs.map((o: Record<string, unknown>) => ({
          assetId: o.asset_id as string,
          outputRole: o.output_role as string,
          bucket: o.bucket as string,
          storageKey: o.storage_key as string,
          mimeType: (o.mime_type as string | null) ?? null,
          width: (o.width as number | null) ?? null,
          height: (o.height as number | null) ?? null,
        }))
      : [],
  };
}

async function getProviderRow(
  generationId: string
): Promise<ProviderRow | null> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("generations")
    .select("provider_request_id, provider_endpoint")
    .eq("id", generationId)
    .single();
  if (error || !data) {
    console.error("[poll] provider row lookup failed", error?.message);
    return null;
  }
  if (!data.provider_request_id || !data.provider_endpoint) return null;
  return {
    requestId: data.provider_request_id as string,
    endpoint: data.provider_endpoint as string,
  };
}

function isTerminalStatus(status: string): boolean {
  return ["completed", "failed", "cancelled", "blocked"].includes(status);
}

export async function pollGenerationStatus(
  generationId: string
): Promise<PollResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { generation: null, error: "Please sign in." };

  const token = await readProcessingToken(generationId);
  if (!token) {
    return { generation: null, error: "Polling token missing or expired." };
  }

  const generation = await fetchSafeGeneration(generationId);
  if (!generation) {
    return { generation: null, error: "Generation not found." };
  }

  if (isTerminalStatus(generation.status)) {
    return { generation };
  }

  const providerRow = await getProviderRow(generationId);
  if (!providerRow) {
    return { generation, error: "Generation has not been submitted yet." };
  }

  const provider = createFalAdapter();
  let statusResult;
  try {
    statusResult = await provider.status(
      providerRow.endpoint,
      providerRow.requestId
    );
  } catch (error) {
    console.error(
      "[poll] provider status failed",
      error instanceof Error ? error.message : String(error)
    );
    return {
      generation,
      error: "Unable to check generation status. Please try again.",
    };
  }

  // Retryable states: do not refund, just surface a generic message.
  if (statusResult.status === "unknown") {
    return {
      generation,
      error: "Generation status is temporarily unavailable. Please retry.",
    };
  }

  if (
    statusResult.status === "queued" ||
    statusResult.status === "in_progress"
  ) {
    return { generation };
  }

  if (statusResult.status === "failed" || statusResult.status === "cancelled") {
    const { error: failError } = await supabase.rpc("fail_generation_refund", {
      p_generation_id: generationId,
      p_token: token,
      p_failure_code: statusResult.error ?? `provider_${statusResult.status}`,
      p_failure_stage: "provider_polling",
    });
    if (failError) {
      console.error("[poll] fail_generation_refund failed", failError.message);
      return { generation, error: "Unable to finalize failed generation." };
    }
    const updated = await fetchSafeGeneration(generationId);
    return { generation: updated ?? generation };
  }

  // statusResult.status === "completed"
  if (!statusResult.imageUrl) {
    const { error: failError } = await supabase.rpc("fail_generation_refund", {
      p_generation_id: generationId,
      p_token: token,
      p_failure_code: "missing_output_image",
      p_failure_stage: "provider_polling",
    });
    if (failError) {
      console.error("[poll] fail_generation_refund failed", failError.message);
      return { generation, error: "Unable to finalize failed generation." };
    }
    const updated = await fetchSafeGeneration(generationId);
    return { generation: updated ?? generation };
  }

  try {
    const download = await provider.downloadImage(statusResult.imageUrl);
    const { path } = await uploadOutputImage(
      user.id,
      download.buffer,
      download.contentType
    );
    const outputAssetId = await createOutputAsset(
      user.id,
      path,
      download.contentType,
      download.size
    );

    const { error: completeError } = await supabase.rpc("complete_generation", {
      p_generation_id: generationId,
      p_token: token,
      p_output_asset_id: outputAssetId,
    });
    if (completeError) {
      console.error("[poll] complete_generation failed", completeError.message);
      return { generation, error: "Unable to finalize generation." };
    }
  } catch (error) {
    console.error(
      "[poll] lifecycle error",
      error instanceof Error ? error.message : String(error)
    );
    return { generation, error: "Unable to update generation status." };
  }

  const updated = await fetchSafeGeneration(generationId);
  return { generation: updated ?? generation };
}
