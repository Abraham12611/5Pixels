import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  FrameCorners,
  UploadSimple,
  User,
  MagicWand,
} from "@phosphor-icons/react/dist/ssr";
import { MobileHero } from "./mobile-hero";
import { SearchEntryButton } from "./search-entry-button";
import { MobileFeed } from "./mobile-feed";
import { LandingQuickViewHost } from "./landing-quick-view";
import { PresetPreview } from "../preset-preview";
import { CategoryFaq } from "../category-faq";
import { MobileBottomNav } from "@/components/consumer/mobile-bottom-nav";
import { toFeedItem } from "./landing-feed-types";
import type { PublicProductSummary } from "@/types/catalog";

interface LandingMobileProps {
  isAuthenticated: boolean;
  products: PublicProductSummary[];
  categories: { slug: string; name: string }[];
}

const INTENT_TILES = [
  { label: "Portrait", query: "portrait", image: "/landing/cat-portraits.jpg" },
  { label: "Cover", query: "cover", image: "/landing/cat-covers.jpg" },
  { label: "Editorial", query: "editorial", image: "/landing/cat-cinematic.jpg" },
  { label: "Illustrated", query: "illustration", image: "/landing/cat-illustration.jpg" },
] as const;

const STEPS = [
  {
    icon: MagicWand,
    title: "Pick a look",
    body: "Every preset is a finished direction — no describing, no guessing.",
  },
  {
    icon: UploadSimple,
    title: "Add your photo",
    body: "One photo per result. Faces and subjects centered works best.",
  },
  {
    icon: FrameCorners,
    title: "Get your result",
    body: "Save it, download it, or adjust the look and run it again.",
  },
] as const;

/**
 * Mobile landing composition (below lg) — the leader-style tappable feed:
 * hero carousel → search → sticky chips + trending rail + feed → intent
 * tiles → preview → how it works → collections → FAQ → lime close.
 * Desktop renders the editorial sections.
 */
export function LandingMobile({
  isAuthenticated,
  products,
  categories,
}: LandingMobileProps) {
  const items = products.map(toFeedItem);
  const featured = items.slice(0, 3);
  const feed = items.slice(0, 18);

  return (
    <div className="pb-24 lg:hidden">
      <LandingQuickViewHost isAuthenticated={isAuthenticated}>
        {/* Hero */}
        <div className="pt-4">
          <MobileHero items={featured} />
        </div>

        {/* Search */}
        <div className="mt-5 px-5">
          <SearchEntryButton />
        </div>

        {/* Chips + trending rail + feed — sections own their 20px gutters */}
        <div className="mt-5">
          <MobileFeed items={feed} categories={categories} />
        </div>
      </LandingQuickViewHost>

      {/* What are you making? */}
      <section aria-label="Start from a goal" className="mt-10 px-5">
        <h2 className="text-lime-400 text-xs font-bold uppercase tracking-[0.18em]">
          What are you making?
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {INTENT_TILES.map((tile) => (
            <Link
              key={tile.label}
              href={`/explore?search=${tile.query}`}
              className="media-frame group relative aspect-square overflow-hidden rounded-xl"
            >
              <Image
                src={tile.image}
                alt=""
                fill
                className="object-cover transition-transform duration-300 group-active:scale-[1.03]"
              />
              <span className="bg-lime-400 absolute left-0 top-0 h-7 w-7 rounded-br-xl" aria-hidden />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent p-3 pt-8">
                <span className="text-cream-50 text-sm font-bold uppercase tracking-wide">
                  {tile.label}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Preview */}
      <div className="mt-4">
        <PresetPreview />
      </div>

      {/* How it works */}
      <section aria-label="How it works" className="mt-2 px-5">
        <h2 className="font-display text-cream-50 max-w-xs text-3xl leading-tight">
          One photo. Extraordinary directions.
        </h2>
        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4">
              <span className="border-lime-400/40 text-lime-400 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                <step.icon size={20} weight="bold" />
              </span>
              <div>
                <p className="text-cream-50 text-sm font-semibold">
                  <span className="text-lime-400 mr-1.5 tabular-nums">
                    {i + 1}
                  </span>
                  {step.title}
                </p>
                <p className="text-text-muted mt-0.5 text-[13px] leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Browse collections */}
      <section aria-label="Browse collections" className="mt-10 px-5">
        <h2 className="text-lime-400 text-xs font-bold uppercase tracking-[0.18em]">
          Browse collections
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              className="border-cream-100/10 bg-charcoal-850 text-cream-100 rounded-full border px-4 py-2.5 text-sm font-medium"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/categories"
            className="border-lime-400/30 text-lime-400 rounded-full border px-4 py-2.5 text-sm font-medium"
          >
            All categories
          </Link>
        </div>
      </section>

      {/* Questions */}
      <div className="mt-4">
        <CategoryFaq />
      </div>

      {/* Lime close */}
      <section aria-label="Get started" className="mx-5 mt-4 rounded-2xl bg-lime-400 px-6 py-10 text-center">
        <span aria-hidden className="mb-4 inline-flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="bg-ink-950 h-2 w-2 rounded-[2px]" />
          ))}
        </span>
        <h2 className="font-display text-ink-950 text-3xl leading-tight">
          You choose the look. We handle the rest.
        </h2>
        <div className="mt-6">
          <Link
            href="/explore"
            className="bg-ink-950 text-cream-50 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            Browse all presets
            <Camera size={16} weight="bold" />
          </Link>
        </div>
        <p className="text-ink-950/60 mt-4 flex items-center justify-center gap-1.5 text-xs">
          <User size={13} weight="bold" />
          No account needed to look around
        </p>
      </section>

      {/* Bottom nav breathing room handled by pb-24 */}
      <MobileBottomNav />
    </div>
  );
}
