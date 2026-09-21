import type { SafeGeneration } from "./types";

/**
 * Map a raw get_user_generations / get_user_generation_by_id row (snake_case
 * RPC columns) to the camelCase SafeGeneration shape pages consume.
 */
export function mapSafeGenerationRow(
  row: Record<string, unknown>
): SafeGeneration {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    productName: (row.product_name as string) ?? "Untitled",
    productSlug: (row.product_slug as string) ?? "",
    productType: (row.product_type as string) ?? "filter",
    status: (row.status as string) ?? "created",
    statusDetail: (row.status_detail as string | null) ?? null,
    progress: (row.progress as Record<string, unknown> | null) ?? null,
    creditCost: Number(row.credit_cost ?? 0),
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    outputAssetId: (row.output_asset_id as string | null) ?? null,
    outputRole: (row.output_role as string | null) ?? null,
    outputBucket: (row.output_bucket as string | null) ?? null,
    outputStorageKey: (row.output_storage_key as string | null) ?? null,
    outputMimeType: (row.output_mime_type as string | null) ?? null,
    outputWidth: (row.output_width as number | null) ?? null,
    outputHeight: (row.output_height as number | null) ?? null,
    savedAt: (row.saved_at as string | null) ?? null,
    downloadedAt: (row.downloaded_at as string | null) ?? null,
  };
}
