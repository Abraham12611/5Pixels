import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/marketing/landing-page";
import { getPublicProducts, getActiveCategories } from "@/lib/db/explore";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: userData }, { data: products }, categories] =
    await Promise.all([
      supabase.auth.getUser(),
      getPublicProducts(
        undefined,
        undefined,
        undefined,
        undefined,
        "featured",
        1,
        18
      ),
      getActiveCategories(),
    ]);

  return (
    <LandingPage
      isAuthenticated={Boolean(userData.user)}
      products={products}
      categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
    />
  );
}
