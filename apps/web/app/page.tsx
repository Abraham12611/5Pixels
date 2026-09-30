import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/marketing/landing-page";
import { LandingSkeleton } from "@/components/marketing/landing-skeleton";
import { getPublicProducts, getActiveCategories } from "@/lib/db/explore";
import { buildSearchPresets } from "@/lib/search/search-presets";

export default function HomePage() {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <LandingData />
    </Suspense>
  );
}

async function LandingData() {
  const supabase = await createClient();
  const [
    { data: userData },
    { data: products },
    { data: newest },
    categories,
  ] = await Promise.all([
    supabase.auth.getUser(),
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
    <LandingPage
      isAuthenticated={Boolean(userData.user)}
      products={products}
      categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      searchPresets={buildSearchPresets(products, newest)}
    />
  );
}
