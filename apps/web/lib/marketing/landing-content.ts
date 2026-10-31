/**
 * Curated landing content — launch carousel cards, CTA tiles, promo banners,
 * and the browse-everything link grid. Cards can supply a dedicated `imageUrl`
 * (Flora-generated 16:9 artwork in `/marketing/*`) or fall back to the live
 * product asset of `presetSlug`.
 */

export interface LaunchCard {
  id: string;
  /** Small eyebrow label ("FLAGSHIP ENGINE", "NEW FORMAT"). */
  eyebrow: string;
  title: string;
  tagline: string;
  href: string;
  /** Preset whose hero/poster image illustrates the card when `imageUrl` is omitted. */
  presetSlug: string;
  /** Optional dedicated 16:9 launch visual generated via Flora. */
  imageUrl?: string;
}

export const LAUNCH_CARDS: LaunchCard[] = [
  {
    id: "launch-nano-banana-2",
    eyebrow: "FLAGSHIP ENGINE",
    title: "Nano Banana 2",
    tagline: "4K identity-locked restyles, neon light trails, and editorial portraits.",
    href: "/models/nano-banana-2",
    presetSlug: "cover-star",
    imageUrl: "/marketing/launch-nb2.jpg",
  },
  {
    id: "launch-posters",
    eyebrow: "NEW FORMAT",
    title: "Typographic Posters",
    tagline: "AI visuals with real typography baked in — covers, headlines, drop art.",
    href: "/explore?type=poster",
    presetSlug: "loud-yellow",
    imageUrl: "/marketing/launch-posters.jpg",
  },
  {
    id: "launch-manga",
    eyebrow: "TRENDING",
    title: "Retro Slam Manga",
    tagline: "Widescreen ink-heavy shonen action frames from a single photo.",
    href: "/presets/retro-slam-manga",
    presetSlug: "retro-slam-manga",
  },
  {
    id: "launch-dream-aura",
    eyebrow: "NEW DROP",
    title: "Dream Aura",
    tagline: "Smoky teal-and-tangerine halation with medium-format film grain.",
    href: "/presets/dream-aura",
    presetSlug: "dream-aura",
    imageUrl: "/marketing/preset-dream-aura.jpg",
  },
  {
    id: "launch-headshot",
    eyebrow: "MOST SAVED",
    title: "Creative Headshot",
    tagline: "Dual-tone gel lighting and studio depth without the studio.",
    href: "/presets/creative-headshot",
    presetSlug: "creative-headshot",
  },
];

export interface LandingTile {
  id: string;
  title: string;
  description: string;
  href: string;
  /** Optional "NEW" badge rendered inline beside the title. */
  badge?: string;
  /** Ambient bottom glow treatment (matches Higgsfield's featured release tile). */
  featuredGlow?: boolean;
  /** Phosphor icon name resolved in the component — keeps config serializable. */
  icon: "sparkle" | "image" | "fire" | "squares" | "article" | "tag";
}

export const LANDING_TILES: LandingTile[] = [
  {
    id: "tile-nb2",
    title: "Nano Banana 2",
    description: "4K identity-locked flagship engine",
    href: "/models/nano-banana-2",
    badge: "NEW",
    icon: "sparkle",
  },
  {
    id: "tile-posters",
    title: "Posters",
    description: "Covers, tracklists & release art",
    href: "/explore?type=poster",
    badge: "NEW",
    icon: "image",
  },
  {
    id: "tile-trending",
    title: "Trending presets",
    description: "Most-run looks across the studio",
    href: "/explore",
    icon: "fire",
  },
  {
    id: "tile-nb",
    title: "Nano Banana",
    description: "Now available on 5Pixels",
    href: "/models/nano-banana",
    featuredGlow: true,
    icon: "sparkle",
  },
  {
    id: "tile-categories",
    title: "Categories",
    description: "Portraits, editorial, manga & street",
    href: "/categories",
    icon: "squares",
  },
  {
    id: "tile-articles",
    title: "Editorial Playbook",
    description: "Breakdowns behind every signature look",
    href: "/articles",
    icon: "article",
  },
];

export interface PromoBanner {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  /** Preset whose image backs the banner, or null for a plain gradient. */
  presetSlug: string | null;
  /** Optional dedicated widescreen banner image. */
  imageUrl?: string;
}

/** Rendered between model sections — position is the index of the section it
 *  follows in the resolved-sections list. */
export const PROMO_BANNERS: { afterSection: number; banner: PromoBanner }[] = [
  {
    afterSection: 0,
    banner: {
      id: "promo-posters",
      eyebrow: "NEW FORMAT",
      title: "Posters put real text on your photos",
      body: "Headlines, names, and release art rendered into the image — not a caption taped on after.",
      ctaLabel: "Try a poster preset",
      href: "/explore?type=poster",
      presetSlug: "loud-yellow",
      imageUrl: "/marketing/launch-posters.jpg",
    },
  },
];

export interface BrowseLink {
  label: string;
  href: string;
}

export const BROWSE_LINKS: BrowseLink[] = [
  { label: "All presets", href: "/explore" },
  { label: "Filters", href: "/explore?type=filter" },
  { label: "Posters", href: "/explore?type=poster" },
  { label: "Categories", href: "/categories" },
  { label: "Articles", href: "/articles" },
  { label: "Pricing", href: "/pricing" },
];
