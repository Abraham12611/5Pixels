/**
 * Stacking ladder for fixed chrome and overlays. Documented here so surfaces
 * never invent a z-index: bottom nav sits under the docked action bar, both sit
 * under overlays, a nested overlay sits above its parent, toasts sit above all.
 */
export const LAYER = {
  nav: 30,
  dockedBar: 40,
  overlay: 50,
  nestedOverlay: 60,
  toast: 70,
} as const;

export type Layer = keyof typeof LAYER;

/**
 * Static Tailwind classes per layer. Written out rather than interpolated so
 * the classes survive Tailwind's content scan.
 */
export const LAYER_CLASS: Record<Layer, string> = {
  nav: "z-30",
  dockedBar: "z-40",
  overlay: "z-50",
  nestedOverlay: "z-[60]",
  toast: "z-[70]",
};
