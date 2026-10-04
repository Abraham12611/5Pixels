import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/marketing/landing-page";
import { LandingSkeleton } from "@/components/marketing/landing-skeleton";
import { getPublicProducts, getActiveCategories } from "@/lib/db/explore";
import { buildSearchPresets } from "@/lib/search/search-presets";
import { hasEverPaid } from "@/lib/billing/entitlements";
import { getExistingAssignmentForUser } from "@/lib/offers/engine";

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

  // Logged-in, never-paid visitors get a promo pill in the header that
  // links straight to pricing. Copy comes from the user's assigned live
  // campaign when one exists (admin-authored headline), else a neutral
  // "view plans" nudge — never a made-up discount figure.
  let promoLabel: string | null = null;
  if (userData.user && !(await hasEverPaid(userData.user.id))) {
    const offer = await getExistingAssignmentForUser(userData.user.id);
    const step =
      offer?.steps.find((s) => s.kind === "discount") ?? offer?.steps[0];
    promoLabel =
      typeof step?.payload.headline === "string"
        ? (step.payload.headline as string)
        : "View member pricing";
  }

  return (
    <LandingPage
      isAuthenticated={Boolean(userData.user)}
      products={products}
      categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      searchPresets={buildSearchPresets(products, newest)}
      promoLabel={promoLabel}
    />
  );
}
