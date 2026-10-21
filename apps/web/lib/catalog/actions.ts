"use server";

import { loadPresetView, type PresetView } from "./preset-view";

/**
 * Public preset payload for the detail lightbox's in-place variant swap.
 * Anon-safe: everything in `loadPresetView` reads through the public catalog
 * RPCs. Returns null for unknown/invalid slugs so the client can fall back
 * to a real navigation.
 */
export async function fetchPresetView(
  slug: string
): Promise<PresetView | null> {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
    return null;
  }
  try {
    return await loadPresetView(slug);
  } catch {
    return null;
  }
}
