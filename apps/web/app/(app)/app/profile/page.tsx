import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getAvatarUrl } from "@/lib/profile/actions";
import { getUserFavoriteProductIds } from "@/lib/db/explore";
import { PublicProfileCard } from "@/components/consumer/public-profile-card";
import { Button } from "@/components/ui/button";
import { Gear } from "@phosphor-icons/react/dist/ssr";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=/app/profile");
  }

  const [profile, generationsResult, favoriteIds] = await Promise.all([
    getMyProfile(),
    supabase.rpc("get_user_generations"),
    getUserFavoriteProductIds(),
  ]);

  if (!profile) {
    redirect("/app");
  }

  const generations = (generationsResult.data ?? []) as {
    id: string;
    productName: string;
    status: string;
    creditCost: number;
    createdAt: string;
  }[];

  const avatarUrl = await getAvatarUrl(profile.avatar_asset_id);
  const totalSpent = profile.show_spent_credits
    ? generations.reduce((sum, g) => sum + (g.creditCost ?? 0), 0)
    : null;

  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const recentGenerations = generations.slice(0, 6);

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <PublicProfileCard
              profile={profile}
              avatarUrl={avatarUrl}
              stats={{
                generations: generations.length,
                favorites: favoriteIds.length,
                spent: totalSpent,
                joined: joinedDate,
              }}
            />

            <Button asChild variant="secondary" className="w-full">
              <Link href="/app/settings">
                <Gear className="mr-2 h-4 w-4" />
                Account settings
              </Link>
            </Button>
          </aside>

          <section className="space-y-6">
            <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-cream-50 text-lg font-semibold">
                  Recent generations
                </h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/app/generations">View all</Link>
                </Button>
              </div>

              {recentGenerations.length === 0 ? (
                <p className="text-text-secondary py-8 text-center">
                  No generations yet. Pick a preset and start creating.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentGenerations.map((gen) => (
                    <li
                      key={gen.id}
                      className="border-cream-100/10 bg-charcoal-800 flex items-center justify-between rounded-xl border p-4"
                    >
                      <div>
                        <p className="text-cream-50 font-medium">
                          {gen.productName}
                        </p>
                        <p className="text-text-secondary text-sm">
                          {new Date(gen.createdAt).toLocaleDateString()} ·{" "}
                          <span className="capitalize">
                            {gen.status.replace(/_/g, " ")}
                          </span>
                          {gen.status === "completed" && (
                            <span className="text-text-muted ml-2">
                              ({gen.creditCost} cr)
                            </span>
                          )}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={
                            gen.status === "completed"
                              ? `/app/results/${gen.id}`
                              : `/app/generations/${gen.id}`
                          }
                        >
                          View
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-6">
              <h2 className="text-cream-50 text-lg font-semibold">
                Saved presets
              </h2>
              <p className="text-text-secondary mt-2">
                {favoriteIds.length} saved preset
                {favoriteIds.length === 1 ? "" : "s"}.
              </p>
              <Button asChild variant="secondary" className="mt-4">
                <Link href="/app/favorites">View favorites</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
