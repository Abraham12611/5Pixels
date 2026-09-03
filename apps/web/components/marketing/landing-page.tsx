import { LandingHero } from "./landing-hero";
import { CuratedPresets } from "./curated-presets";
import { SignUpCTA } from "./sign-up-cta";
import { OnePhotoFiveDirections } from "./one-photo-five-directions";
import { HowItWorks } from "./how-it-works";
import { CollectionSpotlight } from "./collection-spotlight";
import { BrandBillboard } from "./brand-billboard";
import { TrustSection } from "./trust-section";
import { PricingTeaser } from "./pricing-teaser";
import { FAQSection } from "./faq-section";
import { FinalCTA } from "./final-cta";
import { MarketingFooter } from "./marketing-footer";
import { AnnouncementBanner } from "./announcement-banner";
import { MarketingHeader } from "./marketing-header";
import { CategoryTagCloud } from "./category-tag-cloud";
import type { PublicProductSummary } from "@/types/catalog";

interface LandingPageProps {
  isAuthenticated: boolean;
  categories: { slug: string; name: string }[];
  curatedProducts: PublicProductSummary[];
  portraitProducts: PublicProductSummary[];
  cinematicProducts: PublicProductSummary[];
  coverProducts: PublicProductSummary[];
}

export function LandingPage({
  isAuthenticated,
  categories,
  curatedProducts,
  portraitProducts,
  cinematicProducts,
  coverProducts,
}: LandingPageProps) {
  const getCategoryHref = (products: PublicProductSummary[], fallback: string) => {
    if (products.length > 0 && products[0]?.category_slug) {
      return `/explore?category=${products[0].category_slug}`;
    }
    return fallback;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBanner />
      <MarketingHeader isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        <LandingHero />
        <CuratedPresets products={curatedProducts} />
        <SignUpCTA />
        <OnePhotoFiveDirections />
        <HowItWorks />

        <CollectionSpotlight
          title="For your profile"
          eyebrow="Portraits"
          description="Professional, cinematic, and expressive portrait presets."
          products={portraitProducts}
          exploreHref={getCategoryHref(portraitProducts, "/explore?type=filter")}
        />

        <BrandBillboard />

        <CollectionSpotlight
          title="Make it a movie"
          eyebrow="Cinematic"
          description="Dramatic lighting, mood, and scene transformations."
          products={cinematicProducts}
          exploreHref={getCategoryHref(cinematicProducts, "/explore?type=filter")}
        />

        <CollectionSpotlight
          title="Make the cover"
          eyebrow="Posters & Covers"
          description="Magazine, album, event, and film poster layouts with exact text."
          products={coverProducts}
          exploreHref={getCategoryHref(coverProducts, "/explore?type=poster")}
        />

        <CategoryTagCloud categories={categories} />

        <TrustSection />
        <PricingTeaser />
        <FAQSection />
        <FinalCTA />
      </main>

      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
