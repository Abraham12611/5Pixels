import {
  getPresetFamily,
  getPublicProductBySlug,
  type CatalogResult,
} from "@/lib/db/explore";
import { isImageMimeType, publicAssetUrl } from "@/lib/catalog/media";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  PresetFamilyMember,
  PublicInputCapability,
  PublicProductDetail,
} from "@/types/catalog";

/**
 * One rail entry for the family variation selector (#180). The family RPC
 * (#176) only carries asset ids — `getPresetFamilyRail` resolves each
 * member's public detail so the rail gets a thumbnail and the consumer-side
 * input capability (image slots + prompt permission) that the create form
 * needs to explain what carries over.
 */
export interface FamilyRailMember {
  productId: string;
  slug: string;
  name: string;
  /** Chip label — the short variant name on children, product name on the
   *  family root. */
  label: string;
  isParent: boolean;
  isCurrent: boolean;
  /** False when the member was unpublished/removed between list and detail
   *  fetches — rendered muted instead of dropped silently. */
  available: boolean;
  creditCost: number;
  previewUrl: string | null;
  inputCapability: PublicInputCapability | null;
}

type PublicMediaRow = {
  id: string;
  bucket: string;
  storage_key: string;
  mime_type: string;
};

/**
 * Use the product's own poster/hero pointers, not stale product_assets links
 * copied from its parent during variant creation. The public detail RPC can
 * legitimately contain an old linked "hero" alongside a newer
 * products.hero_asset_id; picking by role alone shows the parent's artwork.
 *
 * Only externally public, non-deleted preset-media objects are resolved by
 * getPresetFamilyRail. If no matching primary media is available, don't
 * substitute another product's stale link.
 */
export function pickFamilyStillUrl(
  detail: Pick<
    PublicProductDetail,
    "poster_asset_id" | "hero_asset_id" | "public_assets"
  >,
  publicPrimaryAssets: ReadonlyMap<string, PublicMediaRow>
): string | null {
  for (const id of [detail.poster_asset_id, detail.hero_asset_id]) {
    if (!id) continue;
    const match =
      publicPrimaryAssets.get(id) ??
      detail.public_assets.find((asset) => asset.asset_id === id);
    if (
      match &&
      match.bucket === "preset-media" &&
      isImageMimeType(match.mime_type)
    ) {
      return publicAssetUrl(match.bucket, match.storage_key);
    }
  }

  // A configured primary asset is missing/unavailable: never fall back to
  // an inherited hero link or an unrelated reference image.
  if (detail.poster_asset_id || detail.hero_asset_id) return null;

  // Legacy products with no primary pointer may still have public media links.
  const still =
    detail.public_assets.find(
      (a) => a.role === "poster" && isImageMimeType(a.mime_type)
    ) ??
    detail.public_assets.find(
      (a) => a.role === "hero" && isImageMimeType(a.mime_type)
    );
  return still ? publicAssetUrl(still.bucket, still.storage_key) : null;
}

function toRailMember(
  member: PresetFamilyMember,
  detail: PublicProductDetail | null,
  publicPrimaryAssets: ReadonlyMap<string, PublicMediaRow>
): FamilyRailMember {
  return {
    productId: member.product_id,
    slug: member.slug,
    name: member.name,
    label:
      member.variant_display_name ??
      (member.is_parent ? "Original" : member.name),
    isParent: member.is_parent,
    isCurrent: member.is_current,
    available: member.public_status === "active" && detail !== null,
    creditCost: Number(member.credit_cost),
    previewUrl: detail
      ? pickFamilyStillUrl(detail, publicPrimaryAssets)
      : null,
    inputCapability: detail?.input_capability ?? null,
  };
}

/**
 * Ordered root-then-siblings rail members for `product` — accepts a parent
 * or any variant (the RPC flattens to the one-level family). Returns `[]`
 * for standalone presets so callers can render nothing.
 *
 * One family RPC + one detail RPC per member; family sizes are small and
 * the current product's already-loaded detail is reused instead of
 * refetched.
 */
export async function getPresetFamilyRail(
  product: PublicProductDetail
): Promise<CatalogResult<FamilyRailMember[]>> {
  const { data: family, error } = await getPresetFamily(product.id);
  if (error) {
    return { data: [], error };
  }
  // Single-member families (or a product with no family) render no rail.
  if (family.length <= 1) {
    return { data: [] };
  }

  const details = await Promise.all(
    family.map((member) =>
      member.product_id === product.id
        ? Promise.resolve({ data: product })
        : getPublicProductBySlug(member.slug)
    )
  );

  // A single public-metadata lookup for the whole rail. This cannot use the
  // request-scoped anon client: assets RLS intentionally exposes public rows
  // only to authenticated users. The service client is server-only, and this
  // lookup explicitly restricts the result to public, non-deleted images in
  // the public preset-media bucket; no private reference assets are returned.
  const primaryIds = [
    ...new Set(
      details.flatMap(({ data }) =>
        data ? [data.poster_asset_id, data.hero_asset_id] : []
      ).filter((id): id is string => Boolean(id))
    ),
  ];
  const publicPrimaryAssets = new Map<string, PublicMediaRow>();
  if (primaryIds.length > 0) {
    try {
      const { data, error: assetError } = await createServiceClient()
        .from("assets")
        .select("id, bucket, storage_key, mime_type")
        .in("id", primaryIds)
        .eq("bucket", "preset-media")
        .eq("visibility", "public")
        .is("deleted_at", null);

      if (assetError) throw assetError;
      for (const asset of (data ?? []) as PublicMediaRow[]) {
        if (isImageMimeType(asset.mime_type)) {
          publicPrimaryAssets.set(asset.id, asset);
        }
      }
    } catch {
      // A missing metadata lookup should not take down the preset page. The
      // pure resolver may use an exactly matching public RPC asset instead.
      console.error("[getPresetFamilyRail] primary media lookup unavailable");
    }
  }

  return {
    data: family.map((member, i) =>
      toRailMember(member, details[i].data, publicPrimaryAssets)
    ),
  };
}
