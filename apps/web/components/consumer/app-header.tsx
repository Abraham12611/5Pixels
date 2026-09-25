import { createClient } from "@/lib/supabase/server";
import { getUserCreditBalance } from "@/lib/generation/balance";
import { getActivePlan } from "@/lib/billing/entitlements";
import {
  getMyNotifications,
  getUnreadNotificationCount,
} from "@/lib/db/notifications";
import {
  getActiveCategories,
  getPublicProducts,
  getUserFavoriteProductIds,
} from "@/lib/db/explore";
import { getAvatarUrl } from "@/lib/profile/actions";
import { getSignedAssetUrl } from "@/lib/generation/upload";
import { publicAssetUrl, selectCatalogMediaAsset } from "@/lib/catalog/media";
import { toQuickSheetPreset } from "@/lib/catalog/quick-sheet";
import type { SafeGeneration } from "@/lib/generation/types";
import type {
  SearchCategory,
  SearchLibraryItem,
  SearchPreset,
} from "@/lib/search";
import { AppHeaderClient } from "@/components/consumer/app-header-client";

const TERMINAL_STATUSES = new Set([
  "completed",
  "failed",
  "blocked",
  "cancelled",
]);

export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_asset_id, is_admin, is_owner")
    .eq("id", user.id)
    .single();

  const [
    creditBalance,
    unreadCount,
    notifications,
    avatarUrl,
    activePlan,
    featured,
    newest,
    categories,
    generationsResult,
    favoriteIds,
  ] = await Promise.all([
    getUserCreditBalance(),
    getUnreadNotificationCount(),
    getMyNotifications(15),
    getAvatarUrl(profile?.avatar_asset_id as string | null | undefined),
    getActivePlan(),
    getPublicProducts(
      undefined,
      undefined,
      undefined,
      undefined,
      "featured",
      1,
      48
    ),
    getPublicProducts(
      undefined,
      undefined,
      undefined,
      undefined,
      "newest",
      1,
      8
    ),
    getActiveCategories(),
    supabase.rpc("get_user_generations"),
    getUserFavoriteProductIds(),
  ]);

  const generations = (generationsResult.data ?? []) as SafeGeneration[];

  const newSlugs = new Set(newest.data.map((p) => p.slug));
  const searchPresets: SearchPreset[] = featured.data.map((p, index) => {
    const asset = selectCatalogMediaAsset(p.public_assets, "card");
    const badge =
      p.featured_rank !== null && index < 5
        ? "trending"
        : newSlugs.has(p.slug)
          ? "new"
          : null;
    return {
      slug: p.slug,
      name: p.name,
      description: p.short_description,
      categoryName: p.category_name,
      categorySlug: p.category_slug,
      type: p.type,
      creditCost: p.credit_cost,
      thumbUrl: asset ? publicAssetUrl(asset.bucket, asset.storage_key) : null,
      badge,
      quickView: toQuickSheetPreset(p),
    };
  });

  const searchCategories: SearchCategory[] = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  // Library scope: most recent generations. Signed thumbs for completed
  // outputs only — failures/in-progress fall back to an icon.
  const recentGenerations = generations.slice(0, 8);
  const libraryItems: SearchLibraryItem[] = await Promise.all(
    recentGenerations.map(async (g) => {
      let thumbUrl: string | null = null;
      if (g.status === "completed" && g.outputBucket && g.outputStorageKey) {
        try {
          thumbUrl = await getSignedAssetUrl(
            g.outputBucket,
            g.outputStorageKey
          );
        } catch {
          thumbUrl = null;
        }
      }
      return {
        id: g.id,
        productName: g.productName,
        productSlug: g.productSlug,
        status: g.status,
        createdAt: g.createdAt,
        thumbUrl,
      };
    })
  );

  const inProgressCount = generations.filter(
    (g) => !TERMINAL_STATUSES.has(g.status)
  ).length;

  const minPresetCost = searchPresets.length
    ? Math.min(...searchPresets.map((p) => p.creditCost))
    : 5;

  const name =
    (profile?.display_name as string | null) ??
    (user.user_metadata?.name as string | null) ??
    "";
  const email = user.email ?? "";
  const isAdmin = Boolean(profile?.is_admin || profile?.is_owner);

  return (
    <AppHeaderClient
      isAdmin={isAdmin}
      creditBalance={creditBalance}
      userName={name}
      userEmail={email}
      avatarUrl={avatarUrl}
      unreadCount={unreadCount}
      notifications={notifications}
      planName={activePlan?.name ?? null}
      planRenewsAt={activePlan?.currentPeriodEnd ?? null}
      creditsGrant={activePlan ? activePlan.creditsGrant : null}
      inProgressCount={inProgressCount}
      lowCreditAt={minPresetCost}
      searchPresets={searchPresets}
      searchCategories={searchCategories}
      searchLibrary={libraryItems}
      searchFavoriteIds={favoriteIds}
      catalogError={Boolean(featured.error)}
    />
  );
}
