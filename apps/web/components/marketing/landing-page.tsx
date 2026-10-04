import { MarketingHeader } from "./marketing-header";
import { HeroLanding } from "./hero-landing";
import { LookGallery } from "./look-gallery";
import { FanShowcase } from "./fan-showcase";
import { CinematicSpotlight } from "./cinematic-spotlight";
import { ProfessionalLooks } from "./professional-looks";
import { CoversShowcase } from "./covers-showcase";
import { PresetPreview } from "./preset-preview";
import { FeatureHowItWorks } from "./feature-how-it-works";
import { CategoryFaq } from "./category-faq";
import { LightBreak } from "./light-break";
import { MarketingFooter } from "./marketing-footer";
import { LandingMobile } from "./mobile/landing-mobile";
import type { PublicProductSummary } from "@/types/catalog";
import type { SearchPreset } from "@/lib/search";

export function LandingPage({
  isAuthenticated,
  products,
  categories,
  searchPresets = [],
  promoLabel = null,
}: {
  isAuthenticated: boolean;
  products: PublicProductSummary[];
  categories: { slug: string; name: string }[];
  searchPresets?: SearchPreset[];
  promoLabel?: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader
        isAuthenticated={isAuthenticated}
        searchPresets={searchPresets}
        searchCategories={categories}
        promoLabel={promoLabel}
      />

      {/* Desktop composition — untouched editorial sections */}
      <main className="hidden flex-1 lg:block">
        <HeroLanding />
        <LookGallery />
        <FanShowcase />
        <CinematicSpotlight />
        <ProfessionalLooks />
        <CoversShowcase />
        <PresetPreview />
        <FeatureHowItWorks />
        <CategoryFaq />
        <LightBreak />
      </main>

      {/* Mobile composition — tappable feed-first flow */}
      <main className="flex-1 lg:hidden">
        <LandingMobile
          isAuthenticated={isAuthenticated}
          products={products}
          categories={categories}
        />
      </main>

      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
