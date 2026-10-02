import { createClient } from "@/lib/supabase/server";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { AppHeader } from "@/components/consumer/app-header";
import { MobileBottomNav } from "@/components/consumer/mobile-bottom-nav";
import { getActiveCategories, getPublicProducts } from "@/lib/db/explore";
import { buildSearchPresets } from "@/lib/search/search-presets";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(userData.user);

  // Signed-in users get the app shell (app header + mobile bottom nav) on
  // marketing surfaces like /explore and /presets so navigation stays
  // consistent. Anonymous visitors keep the marketing chrome.
  if (isAuthenticated) {
    return (
      <div className="bg-ink-950 flex min-h-screen flex-col">
        <AppHeader />
        <div className="flex-1 pb-24 md:pb-0">{children}</div>
        <MobileBottomNav />
      </div>
    );
  }

  // Anonymous palette data — presets + categories only, no library scope.
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
    <div className="flex min-h-screen flex-col">
      <MarketingHeader
        isAuthenticated={isAuthenticated}
        searchPresets={buildSearchPresets(featured.data, newest.data)}
        searchCategories={categories}
      />
      <div className="flex-1">{children}</div>
      <MarketingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
