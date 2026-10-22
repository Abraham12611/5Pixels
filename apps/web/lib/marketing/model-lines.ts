import type { PublicProductSummary } from "@/types/catalog";

/**
 * Public "model lines" — marketing-facing groupings of presets by the engine
 * family they showcase. These are curated labels, NOT a leak of provider
 * internals: the private provider_strategy stays server-side; membership is
 * declared here by product slug.
 *
 * Adding a new model later:
 *   1. Append a ModelLine below with its preset slugs (production catalog).
 *   2. Give it a /models/[slug] page entry when its showcase page ships.
 *   3. Sections render only when at least one slug resolves to a live public
 *      product, so a line with no live presets stays invisible automatically.
 */
export interface ModelLine {
  /** URL slug — also the future /models/[slug] route. */
  slug: string;
  /** Public marketing name. */
  name: string;
  /** One-line hook shown under the section/page title. */
  tagline: string;
  /** Longer intro for the model page + presets page. */
  description: string;
  /** Curated preset membership, in display order. Slugs that don't resolve
   *  to a live public product are skipped (and warned about in dev). */
  presetSlugs: string[];
  /** Preset the "Try it" / "Start creating" CTAs point at. Must be one of
   *  presetSlugs. */
  ctaPresetSlug: string;
  /** Where "View all" links until /models/[slug]/presets ships (PR 2 flips
   *  these to the dedicated community-style page). */
  presetsHref: string;
  /** Where the model page will live once /models/[slug] ships. */
  pageHref: string;
}

export const MODEL_LINES: ModelLine[] = [
  {
    slug: "nano-banana-2",
    name: "Nano Banana 2",
    tagline: "Our flagship engine — sharper detail, truer likeness, faster.",
    description:
      "Nano Banana 2 powers most of the 5Pixels catalog. It holds skin texture and facial identity across dramatic restyles, so filters land as magazine-grade transformations instead of obvious AI output.",
    presetSlugs: [
      "cover-star",
      "creative-headshot",
      "editorial-profile",
      "founder-portrait",
      "ink-portrait",
      "loud-yellow",
      "manga-cutout",
      "modern-professional",
      "studio-standard",
    ],
    ctaPresetSlug: "cover-star",
    // TODO(#PR2): "/models/nano-banana-2/presets" once the community page ships.
    presetsHref: "/explore",
    // TODO(#PR2): "/models/nano-banana-2" once the model page ships.
    pageHref: "/explore",
  },
  {
    slug: "nano-banana",
    name: "Nano Banana",
    tagline: "The original 5Pixels engine — bold, stylized transformations.",
    description:
      "Nano Banana is where 5Pixels started. It leans into stylization: ink, manga, and cinematic looks that redraw your photo rather than retouch it.",
    presetSlugs: ["cinematic-still", "retro-slam-manga"],
    ctaPresetSlug: "cinematic-still",
    // TODO(#PR2): "/models/nano-banana/presets".
    presetsHref: "/explore",
    // TODO(#PR2): "/models/nano-banana".
    pageHref: "/explore",
  },
];

export interface ResolvedModelSection {
  line: ModelLine;
  products: PublicProductSummary[];
}

/**
 * Resolve a model line's curated slugs against the live public catalog,
 * preserving config order. Unknown/retired slugs are dropped.
 */
export function resolveModelSection(
  line: ModelLine,
  catalog: PublicProductSummary[]
): ResolvedModelSection {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const products = line.presetSlugs.flatMap((slug) => {
    const product = bySlug.get(slug);
    if (!product && process.env.NODE_ENV !== "production") {
      console.warn(`[model-lines] "${line.slug}" references missing product "${slug}"`);
    }
    return product ? [product] : [];
  });
  return { line, products };
}

/** All model lines that currently resolve to at least one live preset. */
export function resolveModelSections(
  catalog: PublicProductSummary[],
  lines: ModelLine[] = MODEL_LINES
): ResolvedModelSection[] {
  return lines
    .map((line) => resolveModelSection(line, catalog))
    .filter((section) => section.products.length > 0);
}
