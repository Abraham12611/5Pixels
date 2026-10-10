/**
 * Named pixel→resolution-tier maps. The quote (which tier is priced) and the
 * submit adapter (which `resolution` param is sent) MUST agree, so both sides
 * resolve through this module — never a local reimplementation.
 */

const TIER_MAPS: Record<string, (pixels: number) => string> = {
  // Fal nano-banana-2 family billing breakpoints: ≤1.1 MP → 1K, ≤4.5 MP →
  // 2K, above → 4K. (0.5K is priced in snapshots but the submit adapter
  // rounds up to 1K, so it is unreachable through the normal path.)
  fal_resolution: (pixels) =>
    pixels <= 1_100_000 ? "1K" : pixels <= 4_500_000 ? "2K" : "4K",
};

/** Tier key for an output size under a named map; null for unknown maps. */
export function resolutionTierFor(
  map: string | undefined,
  pixels: number
): string | null {
  const fn = map ? TIER_MAPS[map] : undefined;
  return fn ? fn(pixels) : null;
}

/** Submit-side helper: the fal_resolution tier for an output size. */
export function falResolutionTier(pixels: number): string {
  return TIER_MAPS.fal_resolution(pixels);
}
