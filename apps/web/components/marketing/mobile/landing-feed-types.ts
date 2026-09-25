import type { PublicProductSummary } from "@/types/catalog";
import { publicAssetUrl, selectCatalogMediaAsset } from "@/lib/catalog/media";
import {
  toQuickSheetPreset,
  type QuickSheetPreset,
} from "@/lib/catalog/quick-sheet";

export interface LandingFeedItem extends QuickSheetPreset {
  thumbUrl: string | null;
}

export function toFeedItem(p: PublicProductSummary): LandingFeedItem {
  const card = selectCatalogMediaAsset(p.public_assets, "card");
  return {
    ...toQuickSheetPreset(p),
    thumbUrl: card ? publicAssetUrl(card.bucket, card.storage_key) : null,
  };
}
