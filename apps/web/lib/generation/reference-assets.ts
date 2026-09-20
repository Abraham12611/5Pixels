import { createServiceClient } from "@/lib/supabase/service";

/**
 * Server-side only — resolves a product's private reference assets
 * (style/composition/layout guides attached in admin) to signed URLs for
 * provider submission. Never imported by client code; the URLs are short-lived
 * and only ever sent to the provider, never rendered to consumers.
 */

export const REFERENCE_ROLES = [
  "style_reference",
  "composition_reference",
  "layout_reference",
] as const;

const MAX_REFERENCES = 4;
const SIGNED_URL_SECONDS = 3600;

export interface ResolvedReferenceAsset {
  role: string;
  url: string;
}

export async function getSignedReferenceAssets(
  productId: string
): Promise<ResolvedReferenceAsset[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("product_assets")
    .select(
      `role, sort_order,
      assets!inner(bucket, storage_key)`
    )
    .eq("product_id", productId)
    .in("role", [...REFERENCE_ROLES])
    .order("sort_order", { ascending: true })
    .limit(MAX_REFERENCES);

  if (error) {
    console.error("[getSignedReferenceAssets] lookup failed", error.message);
    return [];
  }

  const resolved: ResolvedReferenceAsset[] = [];
  for (const row of data ?? []) {
    const asset = row.assets as unknown as {
      bucket: string;
      storage_key: string;
    };
    const { data: signed, error: signError } = await service.storage
      .from(asset.bucket)
      .createSignedUrl(asset.storage_key, SIGNED_URL_SECONDS);
    if (signError || !signed?.signedUrl) {
      // A single broken reference shouldn't sink the generation — skip it.
      console.error(
        "[getSignedReferenceAssets] sign failed",
        signError?.message
      );
      continue;
    }
    resolved.push({ role: row.role as string, url: signed.signedUrl });
  }
  return resolved;
}
