import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProducts, getUserFavoriteProductIds } from "@/lib/db/explore";
import { ProductCard } from "@/components/consumer/product-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart } from "lucide-react";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/app/favorites");
  }

  const favoriteIds = await getUserFavoriteProductIds();
  const { data: products, error } =
    favoriteIds.length > 0
      ? await getPublicProducts(undefined, undefined, favoriteIds)
      : { data: [], error: undefined };

  if (error) {
    throw new Error("Unable to load favorites. Please try again.");
  }

  const favoriteIdSet = new Set(favoriteIds);

  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-8">
        <h1 className="text-cream-50 text-3xl font-bold sm:text-4xl">
          Your favorites
        </h1>
        <p className="text-text-secondary mt-2">
          Presets you have saved for quick access.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <Heart className="text-text-muted h-12 w-12" aria-hidden />
          <h2 className="text-cream-50 mt-4 text-xl font-semibold">
            No favorites yet
          </h2>
          <p className="text-text-secondary mt-2 max-w-md">
            Browse the catalog and tap the heart on any preset to save it here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/explore">Explore presets</Link>
          </Button>
        </div>
      ) : (
        <section
          aria-label="Favorite presets"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              isAuthenticated
              initialIsFavorite={favoriteIdSet.has(product.id)}
              returnPath="/app/favorites"
              priority={index < 4}
            />
          ))}
        </section>
      )}
    </main>
  );
}
