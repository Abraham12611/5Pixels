/**
 * Curated landing content — launch carousel cards, CTA tiles, promo banners,
 * and the browse-everything link grid. All imagery resolves from live product
 * assets via `presetSlug` until dedicated Flora artwork replaces it.
 *
 * `href` values that point at /models/* resolve to the showcase pages
 * shipped in the model-pages PR.
 */

export interface LaunchCard {
  id: string;
  /** Small eyebrow label rendered on the card ("NEW MODEL", "NEW FEATURE"). */
  eyebrow: string;
  title: string;
  tagline: string;
  href: string;
  /** Preset whose hero/poster image illustrates the card. */
  presetSlug: string;
}

export const LAUNCH_CARDS: LaunchCard[] = [
  {
    id: "launch-nano-banana-2",
    eyebrow: "FLAGSHIP ENGINE",
    title: "Nano Banana 2",
    tagline: "Sharper detail. Truer likeness. Magazine-grade transformations.",
    href: "/models/nano-banana-2",
    presetSlug: "cover-star",
  },
  {
    id: "launch-posters",
    eyebrow: "NEW FORMAT",
    title: "Posters are here",
    tagline: "AI visuals with real text baked in — covers, headlines, drop art.",
    href: "/explore?type=poster",
    presetSlug: "loud-yellow",
  },
  {
    id: "launch-manga",
    eyebrow: "TRENDING",
    title: "Retro Slam Manga",
    tagline: "Ink-heavy manga frames from a single photo.",
    href: "/presets/retro-slam-manga",
    presetSlug: "retro-slam-manga",
  },
  {
    id: "launch-headshot",
    eyebrow: "MOST SAVED",
    title: "Creative Headshot",
    tagline: "Studio-portrait polish without the studio.",
    href: "/presets/creative-headshot",
    presetSlug: "creative-headshot",
  },
  {
    id: "launch-cinematic",
    eyebrow: "EDITOR'S PICK",
    title: "Cinematic Still",
    tagline: "One photo, film-still grade.",
    href: "/presets/cinematic-still",
    presetSlug: "cinematic-still",
  },
];

export interface LandingTile {
  id: string;
  title: string;
  description: string;
  href: string;
  /** Optional "NEW" badge. */
  badge?: string;
  /** Phosphor icon name resolved in the component — keeps config serializable. */
  icon: "sparkle" | "image" | "fire" | "squares" | "article" | "tag";
}

export const LANDING_TILES: LandingTile[] = [
  {
    id: "tile-nb2",
    title: "Nano Banana 2",
    description: "Flagship presets with uncanny likeness.",
    href: "/models/nano-banana-2",
    badge: "NEW",
    icon: "sparkle",
  },
  {
    id: "tile-posters",
    title: "Posters",
    description: "Text-on-image presets for covers and drops.",
    href: "/explore?type=poster",
    badge: "NEW",
    icon: "image",
  },
  {
    id: "tile-trending",
    title: "Trending now",
    description: "What everyone is trying this week.",
    href: "/explore?sort=popular",
    icon: "fire",
  },
  {
    id: "tile-categories",
    title: "Browse categories",
    description: "Portraits, editorial, manga, and more.",
    href: "/categories",
    icon: "squares",
  },
  {
    id: "tile-nb",
    title: "Nano Banana",
    description: "Bold, stylized looks from the original engine.",
    href: "/models/nano-banana",
    icon: "sparkle",
  },
  {
    id: "tile-articles",
    title: "Articles",
    description: "Guides and behind-the-scenes on every look.",
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
