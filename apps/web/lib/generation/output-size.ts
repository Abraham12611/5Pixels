import { createServiceClient } from "@/lib/supabase/service";
import type { OutputSizeOption } from "@/types/catalog";

/**
 * Server-side only — resolves a chosen OutputSizeOption to concrete pixels.
 * `match_source` sizes follow the uploaded photo's aspect; `match_reference`
 * sizes follow the preset's first reference asset's aspect. Real dims come
 * from the asset row first, then storage object metadata (Supabase extracts
 * image dims on upload), then the option's own dims as a last resort.
 */

const MAX_OUTPUT_PIXELS = 4_000_000;

const REFERENCE_ROLES = [
  "style_reference",
  "composition_reference",
  "layout_reference",
] as const;

export interface ResolvedOutputSize {
  width: number;
  height: number;
  /** True when the result should track the source photo's aspect ratio. */
  matchSource: boolean;
}

function clampToCap(width: number, height: number): {
  width: number;
  height: number;
} {
  const pixels = width * height;
  if (pixels <= MAX_OUTPUT_PIXELS) return { width, height };
  const scale = Math.sqrt(MAX_OUTPUT_PIXELS / pixels);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

async function readAssetDims(
  assetId: string
): Promise<{ width: number; height: number } | null> {
  const service = createServiceClient();
  const { data: asset } = await service
    .from("assets")
    .select("width, height, bucket, storage_key")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) return null;
  const w = Number(asset.width);
  const h = Number(asset.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { width: w, height: h };
  }

  // Older assets predate persisted dims — fall back to the storage object's
  // own metadata.
  const folder = asset.storage_key.split("/").slice(0, -1).join("/");
  const filename = asset.storage_key.split("/").pop() ?? "";
  const { data: files } = await service.storage
    .from(asset.bucket)
    .list(folder, { search: filename, limit: 1 });
  const meta = (files?.[0]?.metadata ?? {}) as Record<string, unknown>;
  const mw = Number(meta.width);
  const mh = Number(meta.height);
  if (Number.isFinite(mw) && Number.isFinite(mh) && mw > 0 && mh > 0) {
    return { width: mw, height: mh };
  }
  return null;
}

async function readReferenceDims(
  productId: string
): Promise<{ width: number; height: number } | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("product_assets")
    .select("asset_id")
    .eq("product_id", productId)
    .in("role", [...REFERENCE_ROLES])
    .order("sort_order", { ascending: true })
    .limit(1);

  const assetId = data?.[0]?.asset_id as string | undefined;
  if (!assetId) return null;
  return readAssetDims(assetId);
}

/**
 * Resolve the pixel dims a generation should request. Returns null when a
 * fixed size is malformed or exceeds the provider cap — callers surface
 * "Invalid output size." Match rows never fail on cap: resolved dims are
 * clamped to 4 MP preserving aspect.
 *
 * `match_reference` resolves from the preset's first reference asset; when
 * none is attached it degrades to the source photo's dims. `matchSource`
 * stays false either way — "auto" aspect on nano-banana means *source*
 * aspect, so match_reference must ship explicit dims and let the adapter
 * derive the ratio itself.
 */
export async function resolveOutputSize(
  size: OutputSizeOption | null | undefined,
  sourceAssetId: string,
  productId?: string
): Promise<ResolvedOutputSize | null> {
  if (!size) return null;
  const w = Number(size.width);
  const h = Number(size.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }

  if (size.match_reference && productId) {
    const refDims = await readReferenceDims(productId);
    const base =
      refDims ?? (await readAssetDims(sourceAssetId)) ?? { width: w, height: h };
    return { ...clampToCap(base.width, base.height), matchSource: false };
  }

  if (!size.match_source) {
    return w * h <= MAX_OUTPUT_PIXELS
      ? { width: w, height: h, matchSource: false }
      : null;
  }

  const sourceDims = await readAssetDims(sourceAssetId);
  const base = sourceDims ?? { width: w, height: h };
  return { ...clampToCap(base.width, base.height), matchSource: true };
}
