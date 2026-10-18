import {
  getPresetFamily,
  getPublicProductBySlug,
  type CatalogResult,
} from "@/lib/db/explore";
import { isImageMimeType, publicAssetUrl } from "@/lib/catalog/media";
import type {
  PresetFamilyMember,
  PublicInputCapability,
  PublicProductAsset,
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

function pickStillUrl(assets: PublicProductAsset[]): string | null {
  const still =
    assets.find((a) => a.role === "poster" && isImageMimeType(a.mime_type)) ??
    assets.find((a) => a.role === "hero" && isImageMimeType(a.mime_type)) ??
    assets.find((a) => isImageMimeType(a.mime_type));
  return still ? publicAssetUrl(still.bucket, still.storage_key) : null;
}

function toRailMember(
  member: PresetFamilyMember,
  detail: PublicProductDetail | null
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
    previewUrl: detail ? pickStillUrl(detail.public_assets) : null,
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

  return {
    data: family.map((member, i) => toRailMember(member, details[i].data)),
  };
}
