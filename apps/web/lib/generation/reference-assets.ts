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
  url: string;
  /** Every role this asset was attached under — drives the prompt clause. */
  roles: string[];
}

export async function getSignedReferenceAssets(
  productId: string
): Promise<ResolvedReferenceAsset[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("product_assets")
    .select(
      `role, asset_id, sort_order,
      assets!inner(bucket, storage_key, mime_type, bytes)`
    )
    .eq("product_id", productId)
    .in("role", [...REFERENCE_ROLES])
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getSignedReferenceAssets] lookup failed", error.message);
    return [];
  }

  // Collapse identical images: one asset may be attached under several roles,
  // and the same file can be re-uploaded per role. Sending the same pixels
  // twice overweight the reference against the user's photo. Fingerprint by
  // mime+bytes (a re-upload is byte-identical); fall back to asset id.
  interface Group {
    bucket: string;
    storageKey: string;
    roles: Set<string>;
  }
  const groups = new Map<string, Group>();
  for (const row of data ?? []) {
    const asset = row.assets as unknown as {
      bucket: string;
      storage_key: string;
      mime_type: string | null;
      bytes: number | null;
    };
    const fingerprint =
      asset.mime_type && asset.bytes
        ? `${asset.mime_type}:${asset.bytes}`
        : `asset:${row.asset_id}`;
    const group = groups.get(fingerprint) ?? {
      bucket: asset.bucket,
      storageKey: asset.storage_key,
      roles: new Set<string>(),
    };
    group.roles.add(row.role as string);
    groups.set(fingerprint, group);
  }

  const resolved: ResolvedReferenceAsset[] = [];
  for (const group of [...groups.values()].slice(0, MAX_REFERENCES)) {
    const { data: signed, error: signError } = await service.storage
      .from(group.bucket)
      .createSignedUrl(group.storageKey, SIGNED_URL_SECONDS);
    if (signError || !signed?.signedUrl) {
      // A single broken reference shouldn't sink the generation — skip it.
      console.error(
        "[getSignedReferenceAssets] sign failed",
        signError?.message
      );
      continue;
    }
    resolved.push({ url: signed.signedUrl, roles: [...group.roles] });
  }
  return resolved;
}
