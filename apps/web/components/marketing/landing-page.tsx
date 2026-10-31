import { MarketingHeader } from "./marketing-header";
import { MarketingFooter } from "./marketing-footer";
import { LaunchCarousel, type LaunchCarouselCard } from "./launch-carousel";
import { CtaGrid } from "./cta-grid";
import { PresetShelf } from "./preset-shelf";
import { PromoBanner } from "./promo-banner";
import { BrowseGrid } from "./browse-grid";
import { PresetQuickViewHost } from "@/components/consumer/preset-quick-view";
import {
  publicAssetUrl,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import { resolveModelSections } from "@/lib/marketing/model-lines";
import {
  BROWSE_LINKS,
  LAUNCH_CARDS,
  LANDING_TILES,
  PROMO_BANNERS,
} from "@/lib/marketing/landing-content";
import type { PublicProductSummary } from "@/types/catalog";
import type { SearchPreset } from "@/lib/search";

function resolveCardMedia(
  products: PublicProductSummary[],
  slug: string,
  overrideUrl?: string
): { imageUrl: string | null; imageAlt: string } {
  const product = products.find((p) => p.slug === slug);
  if (overrideUrl) {
    return {
      imageUrl: overrideUrl,
      imageAlt: product ? `Artwork for ${product.name}` : "Featured launch artwork",
    };
  }
  const asset = product
    ? selectCatalogMediaAsset(product.public_assets, "hero")
    : null;
  return {
    imageUrl: asset ? publicAssetUrl(asset.bucket, asset.storage_key) : null,
    imageAlt: product ? `Artwork for ${product.name}` : "",
  };
}

export function LandingPage({
  isAuthenticated,
  products,
  latestProducts,
  categories,
  searchPresets = [],
  promoLabel = null,
}: {
  isAuthenticated: boolean;
  products: PublicProductSummary[];
  /** Newest presets — powers the closing "Latest drops" shelf so freshly
   *  shipped presets are visible before they are mapped to a model line. */
  latestProducts: PublicProductSummary[];
  categories: { slug: string; name: string }[];
  searchPresets?: SearchPreset[];
  promoLabel?: string | null;
}) {
  const launchCards: LaunchCarouselCard[] = LAUNCH_CARDS.map((card) => ({
    ...card,
    ...resolveCardMedia(products, card.presetSlug, card.imageUrl),
  }));

  const modelSections = resolveModelSections(products);

  const promos = PROMO_BANNERS.map(({ afterSection, banner }) => ({
    afterSection,
    banner,
    ...resolveCardMedia(products, banner.presetSlug ?? "", banner.imageUrl),
  }));

  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <MarketingHeader
        isAuthenticated={isAuthenticated}
        searchPresets={searchPresets}
        searchCategories={categories}
        promoLabel={promoLabel}
      />

      <PresetQuickViewHost isAuthenticated={isAuthenticated} returnPath="/">
        <main className="flex-1 pb-16">
          <LaunchCarousel cards={launchCards} />
          <CtaGrid isAuthenticated={isAuthenticated} tiles={LANDING_TILES} />

          {modelSections.map((section, i) => (
            <div key={section.line.slug}>
              <PresetShelf
                id={`model-${section.line.slug}`}
                title={section.line.name}
                tagline={section.line.tagline}
                products={section.products}
                viewAllHref={section.line.presetsHref}
                viewAllLabel={`View all of ${section.line.name}`}
                startHref={`/presets/${section.line.ctaPresetSlug}`}
                learnMoreHref={section.line.pageHref}
                isAuthenticated={isAuthenticated}
              />
              {promos
                .filter((p) => p.afterSection === i)
                .map((p) => (
                  <PromoBanner
                    key={p.banner.id}
                    banner={p.banner}
                    imageUrl={p.imageUrl}
                    imageAlt={p.imageAlt}
                  />
                ))}
            </div>
          ))}

          <PresetShelf
            id="latest-drops"
            title="Latest drops"
            tagline="Fresh presets as they ship — across every engine and format."
            products={latestProducts}
            viewAllHref="/explore?sort=newest"
            viewAllLabel="View all presets"
            startHref="/explore"
            isAuthenticated={isAuthenticated}
            clipHeight="max-h-[44rem]"
          />

          <BrowseGrid links={BROWSE_LINKS} />
        </main>
      </PresetQuickViewHost>

      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
