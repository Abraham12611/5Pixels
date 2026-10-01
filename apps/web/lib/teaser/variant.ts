export interface TeaserVariant {
  blurPx: number;
  cropX: number;
  cropY: number;
  zoom: number;
}

/**
 * Deterministic per-pending blur/crop variation (02 §4 M1) — the same teaser
 * never renders identically for two people. Pure function for testability.
 */
export function deriveTeaserVariant(seed: string): TeaserVariant {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash);
  return {
    blurPx: 24 + (h % 12),
    cropX: (h >> 4) % 15,
    cropY: (h >> 8) % 15,
    zoom: 1.05 + ((h >> 12) % 10) / 40,
  };
}
