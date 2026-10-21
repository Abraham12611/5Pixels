"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { PresetFamilySelector } from "./preset-family-selector";
import { ProductMedia } from "./product-media";
import { ProductVideoPlayer } from "./product-video-player";
import { FavoriteButton } from "./favorite-button";
import { TeaserLauncher } from "./teaser-launcher";
import { ControlPreview } from "./control-preview";
import { ExampleGallery } from "./example-gallery";
import { RelatedPresetsSection } from "./related-presets-section";
import { RecentPresetRecorder } from "./recent-preset-recorder";
import { PresetPromptCard } from "./preset-prompt-card";
import { PresetShareButton } from "./preset-share-button";
import { PresetScrollLock } from "./preset-scroll-lock";
import {
  DockedActionBar,
  MobilePageBottomSpacer,
} from "./mobile/docked-action-bar";
import {
  isImageMimeType,
  publicAssetUrl,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import { familyAttribution } from "@/lib/catalog/discovery";
import { fidelityLabel } from "@/lib/catalog/badges";
import { fetchPresetView } from "@/lib/catalog/actions";
import type { PresetView } from "@/lib/catalog/preset-view";
import type { FamilyRailMember } from "@/lib/catalog/family";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PresetLightboxProps {
  initial: PresetView;
  /** Shared family rail — the RPC returns the same one-level list for every
   *  sibling, so swaps only flip `isCurrent` locally. */
  familyMembers: FamilyRailMember[];
  isAuthenticated: boolean;
  favoriteIds: string[];
}

/**
 * The preset detail composition (#246-style lightbox) as a client surface so
 * family variants swap in place: chips call `onSelect` instead of linking,
 * the URL updates via pushState (no soft navigation → no refetch/remount),
 * and the variant payload comes from the `fetchPresetView` action. Back /
 * Forward re-sync through `usePathname`.
 */
export function PresetLightbox({
  initial,
  familyMembers,
  isAuthenticated,
  favoriteIds,
}: PresetLightboxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);

  // Slug → in-flight/resolved view promise. Seeded with the SSR payload so
  // popping back to the entry variant is instant.
  const cacheRef = useRef<Map<string, Promise<PresetView | null>> | null>(
    null
  );
  if (cacheRef.current === null) {
    cacheRef.current = new Map([
      [initial.product.slug, Promise.resolve(initial)],
    ]);
  }
  const latestSlug = useRef(initial.product.slug);

  const ensureView = useCallback((slug: string) => {
    const cache = cacheRef.current!;
    let entry = cache.get(slug);
    if (!entry) {
      entry = fetchPresetView(slug).catch(() => null);
      cache.set(slug, entry);
    }
    return entry;
  }, []);

  const applySlug = useCallback(
    async (slug: string) => {
      latestSlug.current = slug;
      setPending(true);
      const next = await ensureView(slug);
      if (latestSlug.current !== slug) return; // a newer pick won
      setPending(false);
      if (!next) {
        // Payload failed — degrade to a real navigation.
        router.push(`/presets/${slug}`);
        return;
      }
      setView(next);
      document.title = `${next.product.name} — 5Pixels`;
    },
    [ensureView, router]
  );

  // URL → view sync: covers Back/Forward (pushState entries pop here through
  // usePathname) and any external same-page navigation. Runs only on real
  // pathname changes — a ref keeps callback identity out of the dep list so
  // a re-render mid-swap can't re-trigger and revert to the stale URL slug.
  const applySlugRef = useRef(applySlug);
  useEffect(() => {
    applySlugRef.current = applySlug;
  }, [applySlug]);
  useEffect(() => {
    const match = pathname?.match(/^\/presets\/([^/?#]+)/);
    if (!match) return;
    const slug = decodeURIComponent(match[1]);
    if (slug !== latestSlug.current) void applySlugRef.current(slug);
  }, [pathname]);

  // Warm every sibling payload while idle so rail taps resolve from cache.
  useEffect(() => {
    if (familyMembers.length > 24) return;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection;
    if (connection?.saveData) return;

    const prefetch = () => {
      for (const member of familyMembers) {
        if (member.available) void ensureView(member.slug);
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(prefetch);
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(prefetch, 1500);
    return () => window.clearTimeout(timer);
  }, [familyMembers, ensureView]);

  const selectVariant = useCallback(
    (member: FamilyRailMember) => {
      if (!member.available || member.productId === view.product.id) {
        return;
      }
      window.history.pushState(null, "", `/presets/${member.slug}`);
      void applySlug(member.slug);
    },
    [view.product.id, applySlug]
  );

  const product = view.product;
  const railMembers = useMemo(
    () =>
      familyMembers.map((member) =>
        member.isCurrent !== (member.productId === product.id)
          ? { ...member, isCurrent: member.productId === product.id }
          : member
      ),
    [familyMembers, product.id]
  );

  const attribution = familyAttribution(product);
  const heroAsset = selectCatalogMediaAsset(product.public_assets, "hero");
  const stillAsset =
    product.public_assets.find((a) => isImageMimeType(a.mime_type)) ?? null;
  const presetThumbUrl = stillAsset
    ? publicAssetUrl(stillAsset.bucket, stillAsset.storage_key)
    : null;
  const videoAsset = product.public_assets.find(
    (asset) => asset.role === "preview_video"
  );
  const ctaHref = `/app/create/${product.slug}`;
  const returnPath = `/presets/${product.slug}`;
  const isFavorite = favoriteIds.includes(product.id);
  const dockedInfo = "Each run is unique — results will differ";

  // Console prompt card: the approved public recipe when one exists, else
  // the preset description — matching the admin's optional-recipe contract.
  const description =
    product.short_description || product.long_description || null;
  const recipeText = view.publicPromptRecipe;
  const promptCardText = recipeText ?? description;

  const cta = isAuthenticated ? (
    <Button asChild className="w-full" variant="brand" size="lg">
      <Link
        href={ctaHref}
        prefetch={false}
        aria-label={`Try ${product.name}`}
      >
        Try this look
      </Link>
    </Button>
  ) : (
    <TeaserLauncher
      key={product.id}
      productVersionId={product.version_id}
      presetName={product.name}
      heroUrl={presetThumbUrl}
      className="w-full"
    />
  );

  return (
    <>
      {isAuthenticated && (
        <RecentPresetRecorder
          slug={product.slug}
          name={product.name}
          thumbUrl={presetThumbUrl}
        />
      )}
      <PresetScrollLock />

      {/*
        Lightbox composition (#246-style detail view): the artwork fills the
        stage while a fixed-width console carries everything else. On
        desktop the surface is a fixed takeover covering the site header and
        footer entirely — the console scrolls internally and document scroll
        is locked — while mobile keeps the normal chrome and page flow.
        z-40 sits above the header/docked chrome but under every overlay
        (teaser sheet, auth modal, quick view) at z-50+.
      */}
      <main
        className="bg-ink-950 relative flex flex-1 flex-col md:fixed md:inset-0 md:z-40"
        aria-busy={pending}
      >
        {presetThumbUrl && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative blur, not content */}
            <img
              src={presetThumbUrl}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-40 blur-3xl"
            />
            <div className="bg-ink-950/60 absolute inset-0" />
          </div>
        )}

        <div className="flex flex-1 flex-col md:grid md:h-full md:grid-cols-[1fr_23rem] md:overflow-hidden">
          {/* ============ Image stage ============ */}
          <div
            className={cn(
              "relative flex h-[46dvh] shrink-0 items-center justify-center p-3 transition-opacity duration-150 md:h-auto md:min-h-0 md:p-6",
              pending && "opacity-80"
            )}
          >
            <div className="bg-charcoal-800 relative h-full w-full overflow-hidden rounded-2xl">
              <ProductMedia
                key={product.id}
                asset={heroAsset}
                alt={product.name}
                className="h-full w-full object-contain"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 70vw"
              />
            </div>
          </div>

          {/* ============ Console ============ */}
          <aside className="border-cream-100/10 bg-ink-900/95 supports-[backdrop-filter]:bg-ink-900/80 flex min-h-0 flex-1 flex-col border-t backdrop-blur md:h-full md:border-l md:border-t-0">
            {/* Header — name + category/type + close */}
            <div className="border-cream-100/10 flex items-start justify-between gap-3 border-b px-5 py-4">
              <div className="min-w-0">
                <h1 className="font-display text-cream-50 truncate text-xl font-bold leading-tight">
                  {product.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {product.category_name && (
                    <Link
                      href={`/explore?category=${product.category_slug}`}
                      className="font-medium text-lime-400 hover:underline"
                    >
                      {product.category_name}
                    </Link>
                  )}
                  <span className="text-text-muted capitalize">
                    {product.type}
                  </span>
                  {fidelityLabel(product.likeness_level) && (
                    <span className="text-text-muted">
                      · {fidelityLabel(product.likeness_level)}
                    </span>
                  )}
                </div>
                {attribution && (
                  <Link
                    href={`/presets/${attribution.slug}`}
                    className="text-text-secondary mt-1 block text-xs hover:underline"
                  >
                    Part of the {attribution.name} look
                  </Link>
                )}
              </div>
              <Link
                href="/explore"
                prefetch={false}
                aria-label="Back to explore"
                className="text-text-secondary hover:text-cream-50 hover:bg-charcoal-800 shrink-0 rounded-full p-2 transition-colors"
              >
                <X size={18} weight="bold" />
              </Link>
            </div>

            {/* Scroll body — hidden-scrollbar, page-level scroll on mobile */}
            <div className="scrollbar-none min-h-0 flex-1 space-y-5 px-5 py-5 md:overflow-y-auto">
              {/* Description stands alone only when a recipe fills the card —
                  otherwise the card already carries it. */}
              {recipeText && description && (
                <p className="text-text-secondary text-[0.875rem] leading-5">
                  {description}
                </p>
              )}
              {recipeText &&
                product.long_description &&
                product.short_description && (
                  <p className="text-text-secondary text-[0.875rem] leading-5">
                    {product.long_description}
                  </p>
                )}

              {promptCardText && (
                <PresetPromptCard
                  text={promptCardText}
                  isRecipe={Boolean(recipeText)}
                />
              )}

              {product.active_fields.length > 0 && (
                <section>
                  <h2 className="text-cream-50 text-base font-semibold">
                    Controls
                  </h2>
                  <div className="border-cream-100/10 bg-charcoal-850 mt-3 rounded-2xl border p-5">
                    <ControlPreview fields={product.active_fields} />
                  </div>
                </section>
              )}

              {railMembers.length > 0 && (
                <PresetFamilySelector
                  members={railMembers}
                  currentProductId={product.id}
                  onSelect={selectVariant}
                />
              )}

              {videoAsset && (
                <ProductVideoPlayer
                  key={product.id}
                  publicUrl={publicAssetUrl(
                    videoAsset.bucket,
                    videoAsset.storage_key
                  )}
                  posterUrl={presetThumbUrl ?? undefined}
                  label={`${product.name} preview`}
                />
              )}

              <ExampleGallery
                key={product.id}
                publicAssets={product.public_assets}
              />

              <p className="text-text-muted text-xs">
                Works best with clear, well-lit photos — keep the subject
                centered.
              </p>

              <RelatedPresetsSection
                related={view.related}
                anchor={product}
                isAuthenticated={isAuthenticated}
                favoriteIds={favoriteIds}
                variant="rail"
              />

              {/* Signed-in shells already carry bottom-nav clearance. */}
              {!isAuthenticated && (
                <div className="md:hidden">
                  <MobilePageBottomSpacer withDockedBar />
                </div>
              )}
            </div>

            {/* Footer — primary CTA (desktop; mobile uses the docked bar)
                + share/like cluster on every breakpoint */}
            <div className="border-cream-100/10 shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <div className="max-md:hidden">{cta}</div>
              <div className="mt-3 flex items-center gap-2 max-md:mt-0">
                <PresetShareButton
                  path={returnPath}
                  name={product.name}
                  className="flex-1"
                />
                <FavoriteButton
                  key={product.id}
                  productId={product.id}
                  initialIsFavorite={isFavorite}
                  isAuthenticated={isAuthenticated}
                  returnPath={returnPath}
                  preset={{ name: product.name, thumbUrl: presetThumbUrl }}
                  compact
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile pinned CTA — same docked-bar pattern as the rest of the app. */}
        <div className="md:hidden">
          <DockedActionBar info={dockedInfo}>{cta}</DockedActionBar>
        </div>
      </main>
    </>
  );
}
