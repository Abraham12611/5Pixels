import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserFavoriteProducts } from "@/lib/db/explore";
import { FavoritesGrid } from "@/components/consumer/favorites-grid";
import { Button } from "@/components/ui/button";
import { FivePixelMark } from "@/components/consumer/five-pixel";
import Link from "next/link";

function GhostCards() {
  const aspects = ["4 / 5", "1 / 1", "4 / 3", "3 / 4"];
  return (
    <div
      aria-hidden
      className="columns-2 gap-5 opacity-60 md:columns-4 [&>*]:mb-5 [&>*]:break-inside-avoid"
    >
      {aspects.map((aspect, i) => (
        <div
          key={i}
          className="shadow-border rounded-xl bg-charcoal-850/50"
          style={{ aspectRatio: aspect }}
        />
      ))}
    </div>
  );
}

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/app/favorites");
  }

  const { data: favorites, error } = await getUserFavoriteProducts();

  if (error) {
    throw new Error(error);
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-cream-50 text-2xl font-bold sm:text-3xl">
              Favorites
            </h1>
            <p className="text-text-secondary mt-1 text-sm">
              {favorites.length === 0
                ? "Looks you save live here."
                : `${favorites.length} saved ${
                    favorites.length === 1 ? "look" : "looks"
                  }`}
            </p>
          </div>
          {favorites.length > 0 && (
            <span className="text-text-muted text-[13px]">Recently saved</span>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="relative">
            <GhostCards />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <FivePixelMark className="mb-4 opacity-70" />
              <h2 className="text-cream-50 text-lg font-semibold">
                Save looks you want to try later.
              </h2>
              <p className="text-text-secondary mt-1.5 max-w-sm text-sm">
                Tap the heart on any preset and it will wait for you here.
              </p>
              <Button asChild className="mt-5">
                <Link href="/explore">Explore presets</Link>
              </Button>
            </div>
          </div>
        ) : (
          <FavoritesGrid favorites={favorites} />
        )}
      </div>
    </main>
  );
}
