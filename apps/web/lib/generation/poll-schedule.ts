/**
 * Client-side poll cadence for the progress surface (09 §4.1): 4 s while the
 * run is fresh, backing off as it ages to save battery and data on mobile.
 * Polling pauses entirely while the tab is hidden — handled by the caller,
 * which schedules the next tick from this interval.
 */
export function pollIntervalMs(elapsedMs: number): number {
  if (elapsedMs >= 180_000) return 15_000;
  if (elapsedMs >= 60_000) return 8_000;
  return 4_000;
}
