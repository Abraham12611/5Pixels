import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveCategories,
  getPublicProducts,
  getUserFavoriteProductIds,
} from "@/lib/db/explore";
import { getSignedAssetUrl } from "@/lib/generation/upload";
import { isFailureStatus, isTerminalStatus } from "@/lib/generation/stages";
import { mapSafeGenerationRow } from "@/lib/generation/map";
import { ProductCard } from "@/components/consumer/product-card";
import { PresetQuickViewHost } from "@/components/consumer/preset-quick-view";
import { MobileSection } from "@/components/consumer/mobile/mobile-section";
import {
  MobileRail,
  MobileRailMoreCard,
} from "@/components/consumer/mobile/mobile-rail";
import { cn } from "@/lib/utils";
import type { PublicProductSummary } from "@/types/catalog";

const RAIL_SIZE = 6;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function generationStatusChip(status: string): {
  label: string;
  className: string;
} {
  if (status === "completed") {
    return { label: "Ready", className: "bg-lime-400/15 text-lime-300" };
  }
  if (isFailureStatus(status)) {
    return { label: "Failed", className: "bg-error/15 text-error" };
  }
  if (!isTerminalStatus(status)) {
    return {
      label: "In progress",
      className: "bg-cream-100/10 text-cream-100",
    };
  }
  return { label: status, className: "bg-cream-100/10 text-cream-100" };
}

function ProductRail({
  products,
  label,
  moreHref,
  favoriteIds,
}: {
  products: PublicProductSummary[];
  label: string;
  moreHref: string;
  favoriteIds?: Set<string>;
}) {
  return (
    <MobileRail label={label} itemClassName="w-44 sm:w-52">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isAuthenticated
          variant="rail"
          initialIsFavorite={favoriteIds?.has(product.id)}
          returnPath="/app"
        />
      ))}
      <MobileRailMoreCard href={moreHref} />
    </MobileRail>
  );
}

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const [
    generationsResult,
    trendingResult,
    newestResult,
    categories,
    favoriteIds,
  ] = await Promise.all([
    supabase.rpc("get_user_generations"),
    getPublicProducts(
      undefined,
      undefined,
      undefined,
      undefined,
      "featured",
      1,
      RAIL_SIZE
    ),
    getPublicProducts(
      undefined,
      undefined,
      undefined,
      undefined,
      "newest",
      1,
      RAIL_SIZE
    ),
    getActiveCategories(),
    getUserFavoriteProductIds(),
  ]);

  const generations = (
    (generationsResult.data ?? []) as Record<string, unknown>[]
  )
    .map(mapSafeGenerationRow)
    .slice(0, 8);
  const trending = trendingResult.data ?? [];
  const newest = newestResult.data ?? [];

  const favoriteIdSet = new Set(favoriteIds);
  const favoritesResult =
    favoriteIds.length > 0
      ? await getPublicProducts(
          undefined,
          undefined,
          favoriteIds.slice(0, RAIL_SIZE),
          undefined,
          "featured",
          1,
          RAIL_SIZE
        )
      : { data: [] };
  const favorites = favoritesResult.data ?? [];

  // Sign recent-work thumbnails (private user assets).
  const continueItems = await Promise.all(
    generations.map(async (gen) => {
      let thumb: string | null = null;
      if (gen.outputBucket && gen.outputStorageKey) {
        thumb = await getSignedAssetUrl(
          gen.outputBucket,
          gen.outputStorageKey,
          3600
        );
      }
      const isDone = gen.status === "completed";
      return {
        id: gen.id,
        productName: gen.productName,
        thumb,
        status: gen.status,
        when: relativeTime(gen.createdAt),
        href: isDone ? `/app/results/${gen.id}` : `/app/generations/${gen.id}`,
      };
    })
  );

  const isNewUser = continueItems.length === 0;

  return (
    <main className="flex flex-1 flex-col">
      <PresetQuickViewHost
        isAuthenticated
        favoriteIds={favoriteIds}
        returnPath="/app"
      >
        <div className="mx-auto w-full max-w-7xl py-8">
          {isNewUser ? (
            /* Orientation for a brand-new user */
            <div className="px-5">
              <section className="shadow-border from-charcoal-850 to-charcoal-850 relative overflow-hidden rounded-xl bg-gradient-to-br p-8 sm:p-10">
                <h1 className="text-cream-50 max-w-lg text-2xl font-bold sm:text-3xl">
                  Pick a look. We&apos;ll handle the rest.
                </h1>
                <p className="text-text-secondary mt-3 max-w-md text-sm sm:text-base">
                  Every preset is a complete transformation — add one photo,
                  adjust a couple of options, and get a finished result. No
                  prompts, no settings rabbit holes.
                </p>
                <Link
                  href="/explore"
                  className="text-ink-950 mt-6 inline-flex items-center gap-2 rounded-md bg-lime-400 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-lime-300"
                >
                  Browse looks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            </div>
          ) : (
            <MobileSection
              title="Continue"
              seeAllHref="/app/library"
              seeAllLabel="View all"
              bleed
            >
              <MobileRail label="Continue editing" itemClassName="w-36 sm:w-40">
                {continueItems.map((item) => {
                  const chip = generationStatusChip(item.status);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group shadow-border hover:shadow-border-hover bg-charcoal-850 block w-full overflow-hidden rounded-xl transition-shadow"
                    >
                      <div className="bg-charcoal-800 relative aspect-square overflow-hidden">
                        {item.thumb ? (
                          <Image
                            src={item.thumb}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                            sizes="160px"
                          />
                        ) : (
                          <div className="bg-charcoal-700 h-full w-full" />
                        )}
                        <span
                          className={cn(
                            "absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
                            chip.className
                          )}
                        >
                          {chip.label}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-cream-50 truncate text-[13px] font-medium">
                          {item.productName}
                        </p>
                        <p className="text-text-muted mt-0.5 text-[11px]">
                          {item.when}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </MobileRail>
            </MobileSection>
          )}

          {trending.length > 0 && (
            <MobileSection
              title="Trending now"
              seeAllHref="/explore"
              seeAllLabel="Explore all"
              bleed
            >
              <ProductRail
                products={trending}
                label="Trending looks"
                moreHref="/explore"
                favoriteIds={favoriteIdSet}
              />
            </MobileSection>
          )}

          {newest.length > 0 && (
            <MobileSection
              title="New looks"
              seeAllHref="/explore?sort=newest"
              seeAllLabel="See what's new"
              bleed
            >
              <ProductRail
                products={newest}
                label="New looks"
                moreHref="/explore?sort=newest"
                favoriteIds={favoriteIdSet}
              />
            </MobileSection>
          )}

          {favorites.length > 0 && (
            <MobileSection
              title="Your saved looks"
              seeAllHref="/app/library?tab=presets"
              seeAllLabel="View favorites"
              bleed
            >
              <ProductRail
                products={favorites}
                label="Saved looks"
                moreHref="/app/library?tab=presets"
                favoriteIds={favoriteIdSet}
              />
            </MobileSection>
          )}

          {categories.length > 0 && (
            <MobileSection
              title="Browse by category"
              seeAllHref="/categories"
              seeAllLabel="All categories"
            >
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/explore?category=${category.slug}`}
                    className="shadow-border hover:shadow-border-hover text-text-secondary hover:text-cream-50 bg-charcoal-800/80 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-shadow"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </MobileSection>
          )}
        </div>
      </PresetQuickViewHost>
    </main>
  );
}
