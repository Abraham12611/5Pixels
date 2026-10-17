import {
  isVideoMimeType,
  publicAssetUrl,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import type { PublicProductSummary } from "@/types/catalog";

/**
 * Public-safe preset card contract for article preset blocks (#127).
 *
 * Client-safe module: it must stay importable from editor components, so it
 * may NOT import server-only code (db/explore, next/headers). The shape is
 * the ONLY thing a preset block renders from — built exclusively from
 * public catalog rows, private recipe/version internals cannot reach a card.
 */
export interface PresetCardData {
  /** products.id — canonical, matches the block's presetId. */
  productId: string;
  slug: string;
  name: string;
  type: "filter" | "poster";
  shortDescription: string | null;
  categoryName: string | null;
  creditCost: number;
  /** The product's CURRENT public version as resolved by the catalog RPC.
   * A block pinned to a different selectedPublicVersionId is stale —
   * readers see this version. */
  activeVersionId: string | null;
  versionNumber: number | null;
  /** Public bucket URLs — no signing, no private storage keys. */
  imageUrl: string | null;
  videoUrl: string | null;
  /** Canonical deep link — /presets/{slug} routes signed-out readers to the
   * teaser flow and signed-in readers to /app/create/{slug}. */
  href: string;
}

/** True when the block's pinned version is no longer the public one. */
export function isPinnedVersionStale(
  card: PresetCardData,
  selectedPublicVersionId: string
): boolean {
  return (
    selectedPublicVersionId !== "" &&
    selectedPublicVersionId !== card.activeVersionId
  );
}

/**
 * Map a public catalog row to card data. Pure — public input only.
 * Picks the card-preferred media (motion preview first, per the catalog
 * convention) and degrades gracefully when no public asset exists.
 */
export function presetCardDataFromProduct(
  product: PublicProductSummary
): PresetCardData {
  const media = selectCatalogMediaAsset(product.public_assets, "card");
  const mediaUrl = media
    ? publicAssetUrl(media.bucket, media.storage_key)
    : null;
  const isVideo = media ? isVideoMimeType(media.mime_type) : false;
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type,
    shortDescription: product.short_description,
    categoryName: product.category_name,
    creditCost: product.credit_cost,
    activeVersionId: product.version_id ?? null,
    versionNumber: product.version_number ?? null,
    // Video goes to <video>; gif previews stay on <img> (gif is motion but
    // not a video container — <video src=*.gif> never plays).
    imageUrl: media && !isVideo ? mediaUrl : null,
    videoUrl: media && isVideo ? mediaUrl : null,
    href: `/presets/${product.slug}`,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPresetUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Collect the presetIds a document references — every `preset` block,
 * nested included. Mirrors article_document_asset_ids() for the app layer.
 */
export function collectDocumentPresetIds(
  blocks: {
    type?: string;
    props?: Record<string, unknown>;
    children?: unknown[];
  }[]
): string[] {
  const ids: string[] = [];
  const walk = (list: unknown[]): void => {
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const block = raw as {
        type?: string;
        props?: Record<string, unknown>;
        children?: unknown[];
      };
      if (
        block.type === "preset" &&
        typeof block.props?.presetId === "string" &&
        block.props.presetId !== ""
      ) {
        ids.push(block.props.presetId);
      }
      if (Array.isArray(block.children)) walk(block.children);
    }
  };
  walk(blocks);
  return [...new Set(ids)];
}
