"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "./admin";

export interface AdminGenerationSummary {
  id: string;
  userId: string;
  userEmail: string | null;
  productId: string;
  productName: string;
  productSlug: string;
  productType: string;
  status: string;
  statusDetail: string | null;
  failureCode: string | null;
  failureStage: string | null;
  providerEndpoint: string | null;
  creditCost: number;
  actualCreditCost: number | null;
  providerCostUsd: number | null;
  markupMultiplier: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  latencyMs: number | null;
}

export interface AdminGenerationDetail extends AdminGenerationSummary {
  productVersionId: string;
  sourceAssetId: string;
  requestedOptions: Record<string, unknown>;
  compiledRequestFingerprint: string | null;
  progress: Record<string, unknown> | null;
  outputs: Array<{
    assetId: string;
    outputRole: string;
    width: number | null;
    height: number | null;
    fileFormat: string | null;
    isPrimary: boolean;
    publicUrl: string | null;
  }>;
  falUsage: Array<{
    endpointId: string | null;
    rawCostUsd: number;
    quantity: number | null;
    unit: string | null;
    computeSeconds: number | null;
    createdAt: string;
  }>;
  creditLedger: Array<{
    entryType: string;
    amount: number;
    idempotencyKey: string;
    createdAt: string;
  }>;
}

function generationFromRow(row: Record<string, unknown>): AdminGenerationSummary {
  const product = (row.products as unknown as
    | Array<{ id: string; name: string; slug: string; type: string }>
    | null)?.[0];
  const profile = (row.profiles as unknown as
    | Array<{ id: string; email: string }>
    | null)?.[0];

  const startedAt = (row.started_at as string | null) ?? null;
  const completedAt = (row.completed_at as string | null) ?? null;
  const createdAt = row.created_at as string;

  let latencyMs: number | null = null;
  if (completedAt) {
    const start = startedAt ? new Date(startedAt).getTime() : new Date(createdAt).getTime();
    const end = new Date(completedAt).getTime();
    latencyMs = Math.max(0, end - start);
  }

  return {
    id: row.id as string,
    userId: row.user_id as string,
    userEmail: profile?.email ?? null,
    productId: product?.id ?? (row.product_id as string),
    productName: product?.name ?? "Unknown",
    productSlug: product?.slug ?? "",
    productType: product?.type ?? "",
    status: row.status as string,
    statusDetail: (row.status_detail as string | null) ?? null,
    failureCode: (row.failure_code as string | null) ?? null,
    failureStage: (row.failure_stage as string | null) ?? null,
    providerEndpoint: (row.provider_endpoint as string | null) ?? null,
    creditCost: Number(row.credit_cost ?? 0),
    actualCreditCost:
      row.actual_credit_cost != null
        ? Number(row.actual_credit_cost)
        : null,
    providerCostUsd:
      row.provider_cost_usd != null ? Number(row.provider_cost_usd) : null,
    markupMultiplier:
      row.markup_multiplier != null ? Number(row.markup_multiplier) : null,
    startedAt,
    completedAt,
    createdAt,
    latencyMs,
  };
}

export async function getAdminGenerations(): Promise<AdminGenerationSummary[]> {
  await requireAdmin();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("generations")
    .select(
      `
      id,
      user_id,
      product_id,
      status,
      status_detail,
      failure_code,
      failure_stage,
      provider_endpoint,
      credit_cost,
      actual_credit_cost,
      provider_cost_usd,
      markup_multiplier,
      started_at,
      completed_at,
      created_at,
      products(id, name, slug, type),
      profiles(id, email)
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []).map(generationFromRow);
}

export async function getAdminGenerationById(
  id: string
): Promise<AdminGenerationDetail | null> {
  await requireAdmin();

  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from("generations")
    .select(
      `
      *,
      products(id, name, slug, type),
      profiles(id, email)
    `
    )
    .eq("id", id)
    .single();

  if (error || !row) {
    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return null;
  }

  const summary = generationFromRow(row);

  const { data: outputs } = await supabase
    .from("generation_outputs")
    .select(
      `
      asset_id,
      output_role,
      width,
      height,
      file_format,
      is_primary,
      assets(id, bucket, storage_key, mime_type)
    `
    )
    .eq("generation_id", id)
    .order("is_primary", { ascending: false });

  const outputAssets = (outputs ?? []).map((output) => {
    const assets = output.assets as unknown as
      | Array<{
          id: string;
          bucket: string;
          storage_key: string;
          mime_type: string;
        }>
      | null;
    const asset = assets?.[0];
    const publicUrl = asset
      ? supabase.storage.from(asset.bucket).getPublicUrl(asset.storage_key).data
          .publicUrl
      : null;
    return {
      assetId: output.asset_id as string,
      outputRole: output.output_role as string,
      width: output.width as number | null,
      height: output.height as number | null,
      fileFormat: output.file_format as string | null,
      isPrimary: (output.is_primary as boolean) ?? false,
      publicUrl,
    };
  });

  const { data: falUsage } = await supabase
    .from("fal_usage_logs")
    .select("endpoint_id, raw_cost_usd, quantity, unit, compute_seconds, created_at")
    .eq("generation_id", id)
    .order("created_at", { ascending: true });

  const { data: creditLedger } = await supabase
    .from("credit_ledger")
    .select("entry_type, amount, idempotency_key, created_at")
    .eq("generation_id", id)
    .order("created_at", { ascending: true });

  return {
    ...summary,
    productVersionId: row.product_version_id as string,
    sourceAssetId: row.source_asset_id as string,
    requestedOptions: (row.requested_options ?? {}) as Record<string, unknown>,
    compiledRequestFingerprint:
      (row.compiled_request_fingerprint as string | null) ?? null,
    progress: (row.progress ?? {}) as Record<string, unknown> | null,
    outputs: outputAssets,
    falUsage: (falUsage ?? []).map((u) => ({
      endpointId: (u.endpoint_id as string | null) ?? null,
      rawCostUsd: Number(u.raw_cost_usd ?? 0),
      quantity: u.quantity != null ? Number(u.quantity) : null,
      unit: (u.unit as string | null) ?? null,
      computeSeconds:
        u.compute_seconds != null ? Number(u.compute_seconds) : null,
      createdAt: u.created_at as string,
    })),
    creditLedger: (creditLedger ?? []).map((l) => ({
      entryType: l.entry_type as string,
      amount: Number(l.amount),
      idempotencyKey: l.idempotency_key as string,
      createdAt: l.created_at as string,
    })),
  };
}
