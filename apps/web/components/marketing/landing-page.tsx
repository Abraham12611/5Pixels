import { PromoCountdownBar } from "./promo-countdown-bar";
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

export function LandingPage({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PromoCountdownBar />
      <MarketingHeader isAuthenticated={isAuthenticated} />

      <main className="flex-1">
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

      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
