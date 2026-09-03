import { createClient } from "@/lib/supabase/server";
import { getPublicProducts, getActiveCategories } from "@/lib/db/explore";
import { LandingPage } from "@/components/marketing/landing-page";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(userData.user);

  const [{ data: products }, categories] = await Promise.all([
    getPublicProducts(),
    getActiveCategories(),
  ]);

  // Pick curated products: first 8 active public products.
  const curated = products.slice(0, 8);

  // Spotlight products by category if present.
  const portraitCategory = categories?.find(
    (c) =>
      c.slug.toLowerCase().includes("portrait") ||
      c.name.toLowerCase().includes("portrait")
  );
  const cinematicCategory = categories.find(
    (c) =>
      c.slug.toLowerCase().includes("cinematic") ||
      c.name.toLowerCase().includes("cinematic")
  );
  const coverCategory = categories.find(
    (c) =>
      c.slug.toLowerCase().includes("cover") ||
      c.name.toLowerCase().includes("cover") ||
      c.slug.toLowerCase().includes("poster") ||
      c.name.toLowerCase().includes("poster")
  );

  const [portraitProducts, cinematicProducts, coverProducts] = await Promise.all(
    [
      portraitCategory
        ? getPublicProducts(undefined, portraitCategory.slug)
        : Promise.resolve({ data: [] }),
      cinematicCategory
        ? getPublicProducts(undefined, cinematicCategory.slug)
        : Promise.resolve({ data: [] }),
      coverCategory
        ? getPublicProducts(undefined, coverCategory.slug)
        : Promise.resolve({ data: [] }),
    ]
  );

  return (
    <LandingPage
      isAuthenticated={isAuthenticated}
      categories={categories}
      curatedProducts={curated}
      portraitProducts={portraitProducts.data.slice(0, 6)}
      cinematicProducts={cinematicProducts.data.slice(0, 6)}
      coverProducts={coverProducts.data.slice(0, 6)}
    />
  );
}
