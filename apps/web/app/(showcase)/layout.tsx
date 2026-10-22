import { createClient } from "@/lib/supabase/server";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { AppHeader } from "@/components/consumer/app-header";
import { MobileBottomNav } from "@/components/consumer/mobile-bottom-nav";
import { getActiveCategories, getPublicProducts } from "@/lib/db/explore";
import { buildSearchPresets } from "@/lib/search/search-presets";

/**
 * Showcase routes (/models/*) share the marketing chrome but NOT a shared
 * footer — each page renders its own (full MarketingFooter on model pages,
 * the compact bar on preset-grid pages), matching the per-surface footer
 * treatment of the reference design.
 */
export default async function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(userData.user);

  if (isAuthenticated) {
    return (
      <div className="bg-ink-950 flex min-h-screen flex-col">
        <AppHeader />
        <div className="flex-1 pb-24 md:pb-0">{children}</div>
        <MobileBottomNav />
      </div>
    );
  }

  const [featured, newest, categories] = await Promise.all([
    getPublicProducts(
      undefined,
      undefined,
      undefined,
      undefined,
      "featured",
      1,
      48
    ),
    getPublicProducts(undefined, undefined, undefined, undefined, "newest", 1, 8),
    getActiveCategories(),
  ]);

  return (
    <div className="bg-ink-950 flex min-h-screen flex-col">
      <MarketingHeader
        isAuthenticated={isAuthenticated}
        searchPresets={buildSearchPresets(featured.data, newest.data)}
        searchCategories={categories}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
