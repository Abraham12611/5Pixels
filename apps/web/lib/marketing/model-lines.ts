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
export interface ModelPageFeature {
  title: string;
  body: string;
  /** Preset whose image illustrates the block. */
  presetSlug: string;
}

export interface ModelPageFaq {
  q: string;
  a: string;
}

export interface ModelPageContent {
  /** Preset supplying the hero media (defaults to ctaPresetSlug). */
  heroPresetSlug?: string;
  /** Alternating feature blocks — keep to 2-4. */
  features: ModelPageFeature[];
  faq: ModelPageFaq[];
}

export interface ModelLine {
  /** URL slug — also the /models/[slug] route. */
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
  /** Full listing of the line's presets. */
  presetsHref: string;
  /** The model's showcase page. */
  pageHref: string;
  /** /models/[slug] page content. */
  page: ModelPageContent;
}

export const MODEL_LINES: ModelLine[] = [
  {
    slug: "nano-banana-2",
    name: "Nano Banana 2",
    tagline:
      "4K editorial transformations and typographic posters with razor-sharp identity lock.",
    description:
      "Nano Banana 2 powers the flagship 5Pixels catalog. It preserves facial structure, skin micro-texture, and lighting continuity across dramatic restyles — from neon light-trail campaigns and translucent X-ray street frames to print-ready posters.",
    presetSlugs: [
      "loud-yellow",
      "dream-aura",
      "cover-star",
      "motion-trail-luxe",
      "creative-headshot",
      "x-ray-street",
      "editorial-profile",
      "crayon-chibi-overlay",
      "founder-portrait",
      "retro-cafe-print",
      "ink-portrait",
      "social-sketch-cutout",
      "manga-cutout",
      "sumi-e-scene",
      "modern-professional",
      "studio-standard",
    ],
    ctaPresetSlug: "cover-star",
    presetsHref: "/models/nano-banana-2/presets",
    pageHref: "/models/nano-banana-2",
    page: {
      features: [
        {
          title: "Likeness that actually holds",
          body: "Skin texture, lighting, and facial identity survive the transformation. Portraits come back looking like you — restyled, not replaced.",
          presetSlug: "founder-portrait",
        },
        {
          title: "Real text, rendered into the image",
          body: "Poster presets bake headlines and names into the artwork itself — release covers, event drops, and title cards that read like they were designed, not captioned.",
          presetSlug: "loud-yellow",
        },
        {
          title: "Controls instead of prompts",
          body: "Every preset exposes a few schema-driven controls — intensity, layout, palette. You tune sliders; the recipe stays private and consistent.",
          presetSlug: "editorial-profile",
        },
      ],
      faq: [
        {
          q: "What is Nano Banana 2?",
          a: "It's the engine behind most of the 5Pixels catalog — our current flagship for likeness-preserving photo transformation. You never write prompts; each preset packages a tuned recipe for it.",
        },
        {
          q: "Which presets run on Nano Banana 2?",
          a: "Most of the catalog — portrait, editorial, manga, street, and poster presets. Every card in the grid on this page is powered by it.",
        },
        {
          q: "How do I try it?",
          a: "Pick any preset, upload one photo, adjust the controls if you like, and generate. Each preset shows its credit cost before you confirm.",
        },
        {
          q: "How is it different from Nano Banana?",
          a: "Nano Banana leans into bold, stylized redraws. Nano Banana 2 favors fidelity — sharper detail and truer likeness across dramatic restyles, plus poster presets with rendered text.",
        },
      ],
    },
  },
  {
    slug: "nano-banana",
    name: "Nano Banana",
    tagline:
      "Bold stylized redraws — widescreen manga frames, ink-wash worlds, and cinema stills.",
    description:
      "Nano Banana is where 5Pixels started. It leans into full-frame stylization: high-contrast slam manga panels, hand-drawn sketch worlds, and anamorphic film stills that redraw your photo from the ground up.",
    presetSlugs: ["retro-slam-manga", "cinematic-still", "sketch-world"],
    ctaPresetSlug: "retro-slam-manga",
    presetsHref: "/models/nano-banana/presets",
    pageHref: "/models/nano-banana",
    page: {
      features: [
        {
          title: "Stylization-first",
          body: "Nano Banana redraws rather than retouches — ink linework, halftone, and manga framing that commit to a look instead of hedging toward realism.",
          presetSlug: "retro-slam-manga",
        },
        {
          title: "Cinematic color and light",
          body: "Film-stock grades, motivated lighting, and frame-worthy composition. Stills that look pulled from a sequence, not filtered after the fact.",
          presetSlug: "cinematic-still",
        },
      ],
      faq: [
        {
          q: "What is Nano Banana?",
          a: "The original 5Pixels engine — tuned for bold, stylized transformations like manga cutouts, sketch worlds, and cinematic stills.",
        },
        {
          q: "Which presets run on Nano Banana?",
          a: "The stylized classics in the grid on this page — cinematic, sketch, and manga looks that redraw your photo.",
        },
        {
          q: "How do I try it?",
          a: "Pick a preset, upload one photo, and generate. Each preset shows its credit cost before you confirm.",
        },
      ],
    },
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
