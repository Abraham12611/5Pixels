import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicProductBySlug,
  getUserFavoriteProductIds,
} from "@/lib/db/explore";
import { getPresetFamilyRail } from "@/lib/catalog/family";
import {
  familyAttribution,
  presetIndexPolicy,
} from "@/lib/catalog/discovery";
import { PresetFamilySelector } from "@/components/consumer/preset-family-selector";
import { ProductMedia } from "@/components/consumer/product-media";
import { ProductVideoPlayer } from "@/components/consumer/product-video-player";
import { FavoriteButton } from "@/components/consumer/favorite-button";
import { TeaserFlow } from "@/components/consumer/teaser-flow";
import { TeaserLauncher } from "@/components/consumer/teaser-launcher";
import { ControlPreview } from "@/components/consumer/control-preview";
import { ExampleGallery } from "@/components/consumer/example-gallery";
import { RelatedPresets } from "@/components/consumer/related-presets";
import { RecentPresetRecorder } from "@/components/consumer/recent-preset-recorder";
import { PresetDetailHero } from "@/components/consumer/mobile/preset-detail-hero";
import { PresetExamples } from "@/components/consumer/mobile/preset-examples";
import { WhatYouGet } from "@/components/consumer/what-you-get";
import { WorksBestWith } from "@/components/consumer/works-best-with";
import { MobileSection } from "@/components/consumer/mobile/mobile-section";
import {
  DockedActionBar,
  MobilePageBottomSpacer,
} from "@/components/consumer/mobile/docked-action-bar";
import {
  isImageMimeType,
  publicAssetUrl,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import { fidelityLabel } from "@/lib/catalog/badges";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

interface PresetDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PresetDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: product } = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: "Preset not found — 5Pixels",
    };
  }

  const title = `${product.name} — 5Pixels`;
  const description =
    product.short_description ??
    product.long_description ??
    "Curated AI photo transformation preset on 5Pixels.";
  const heroAsset = selectCatalogMediaAsset(product.public_assets, "hero");
  const ogImage = heroAsset
    ? publicAssetUrl(heroAsset.bucket, heroAsset.storage_key)
    : undefined;
  // #181: dependent variants are direct-URL-only — consolidate indexing at
  // the family root (or noindex when the parent itself is unreachable).
  const indexPolicy = presetIndexPolicy(product);

  return {
    title,
    description,
    robots: indexPolicy.noindex
      ? { index: false, follow: true }
      : undefined,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: indexPolicy.canonical
      ? { canonical: indexPolicy.canonical }
      : undefined,
  };
}

function buildJsonLd(product: Awaited<ReturnType<typeof getPublicProductBySlug>>["data"]) {
  if (!product) return null;
  const heroAsset = selectCatalogMediaAsset(product.public_assets, "hero");
  return {
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: product.name,
      description: product.short_description ?? product.long_description,
      applicationCategory: "PhotoApplication",
      image: heroAsset
        ? publicAssetUrl(heroAsset.bucket, heroAsset.storage_key)
        : undefined,
    }),
  };
}

export default async function PresetDetailPage({
  params,
}: PresetDetailPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(userData.user);

  const [{ data: product, error }, favoriteIds] = await Promise.all([
    getPublicProductBySlug(slug),
    isAuthenticated ? getUserFavoriteProductIds() : Promise.resolve([]),
  ]);

  if (error || !product) {
    notFound();
  }

  const isFavorite = favoriteIds.includes(product.id);
  const { data: familyMembers } = await getPresetFamilyRail(product);
  // #181: dependent variants are reached by direct link — attribute them to
  // the family root so the shared URL still leads back to discoverable
  // context.
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
  const exampleUrls = product.public_assets
    .filter(
      (asset) =>
        asset.role === "example_result" && isImageMimeType(asset.mime_type)
    )
    .slice(0, 3)
    .map((asset) => publicAssetUrl(asset.bucket, asset.storage_key));
  const ctaHref = `/app/create/${product.slug}`;
  const returnPath = `/presets/${product.slug}`;
  const jsonLd = buildJsonLd(product);
  const dockedInfo = "Each run is unique — results will differ";

  const mobileCta = isAuthenticated ? (
    <Button asChild className="w-full" variant="brand">
      <Link
        href={ctaHref}
        prefetch={false}
        aria-label={`Use ${product.name}`}
      >
        Use this look
      </Link>
    </Button>
  ) : (
    <TeaserLauncher
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
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd}
        />
      )}

      <main className="flex flex-1 flex-col">
        {/* ============ Mobile composition (07 §3) ============ */}
        <div className="md:hidden">
          <PresetDetailHero
            asset={heroAsset}
            stillAsset={stillAsset}
            name={product.name}
            isPoster={product.type === "poster"}
          />

          <div className="px-5 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display text-cream-50 text-[28px] leading-tight">
                  {product.name}
                </h1>
                {product.category_name && (
                  <Link
                    href={`/explore?category=${product.category_slug}`}
                    className="text-sm font-medium text-lime-400 hover:underline"
                  >
                    {product.category_name}
                  </Link>
                )}
                {attribution && (
                  <Link
                    href={`/presets/${attribution.slug}`}
                    className="text-text-secondary mt-0.5 block text-[13px] hover:underline"
                  >
                    Part of the {attribution.name} look
                  </Link>
                )}
              </div>
              <FavoriteButton
                productId={product.id}
                initialIsFavorite={isFavorite}
                isAuthenticated={isAuthenticated}
                returnPath={returnPath}
                preset={{ name: product.name, thumbUrl: presetThumbUrl }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="bg-charcoal-800 text-text-secondary rounded-md px-2.5 py-1 text-[13px] capitalize">
                {product.type}
              </span>
              {fidelityLabel(product.likeness_level) && (
                <span className="bg-charcoal-800 text-text-secondary rounded-md px-2.5 py-1 text-[13px]">
                  {fidelityLabel(product.likeness_level)}
                </span>
              )}
            </div>

            {(product.short_description || product.long_description) && (
              <p className="text-text-secondary mt-3 text-[15px] leading-relaxed">
                {product.short_description || product.long_description}
              </p>
            )}

            {familyMembers.length > 0 && (
              <div className="mt-5">
                <PresetFamilySelector
                  members={familyMembers}
                  currentProductId={product.id}
                />
              </div>
            )}
          </div>

          <MobileSection title="What you get">
            <WhatYouGet product={product} />
          </MobileSection>

          {exampleUrls.length > 0 && (
            <MobileSection title="Examples">
              <PresetExamples urls={exampleUrls} name={product.name} />
            </MobileSection>
          )}

          <MobileSection title="Works best with">
            <WorksBestWith />
          </MobileSection>

          {product.active_fields.length > 0 && (
            <MobileSection title="Adjustments">
              <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-5">
                <ControlPreview fields={product.active_fields} />
              </div>
            </MobileSection>
          )}

          <RelatedPresets
            product={product}
            isAuthenticated={isAuthenticated}
            favoriteIds={favoriteIds}
            variant="rail"
          />

          {/* Signed-in shells already carry bottom-nav clearance (pb-24). */}
          {!isAuthenticated && <MobilePageBottomSpacer />}

          <DockedActionBar info={dockedInfo}>{mobileCta}</DockedActionBar>
        </div>

        {/* ============ Desktop composition (unchanged) ============ */}
        <div className="hidden md:block">
          <div className="border-cream-100/10 bg-charcoal-850 border-b">
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
              <Button asChild variant="ghost" size="sm">
                <Link href="/explore" prefetch={false}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Explore
                </Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:py-12">
            <div>
              {/* Height-bounded width: keeps the 4:5 ratio but never grows
                  taller than the viewport, so the whole preview stays on
                  screen instead of requiring a scroll (same technique as
                  StudioStage). 10rem covers the top bar + section padding. */}
              <div className="bg-charcoal-800 relative aspect-[4/5] overflow-hidden rounded-2xl lg:sticky lg:top-6 lg:w-[min(100%,calc((100dvh_-_10rem)*0.8))]">
                <ProductMedia
                  asset={heroAsset}
                  alt={product.name}
                  className="h-full w-full"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>

              {videoAsset && (
                <div className="mt-6">
                  <ProductVideoPlayer
                    publicUrl={publicAssetUrl(
                      videoAsset.bucket,
                      videoAsset.storage_key
                    )}
                    posterUrl={presetThumbUrl ?? undefined}
                    label={`${product.name} preview`}
                  />
                </div>
              )}

              <ExampleGallery publicAssets={product.public_assets} />
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {product.category_name && (
                    <Link
                      href={`/explore?category=${product.category_slug}`}
                      className="text-sm font-medium text-lime-400 hover:underline"
                    >
                      {product.category_name}
                    </Link>
                  )}
                  <h1 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
                    {product.name}
                  </h1>
                  <p className="text-text-muted mt-1 text-sm capitalize">
                    {product.type}
                  </p>
                  {attribution && (
                    <Link
                      href={`/presets/${attribution.slug}`}
                      className="text-text-secondary mt-1 block text-sm hover:underline"
                    >
                      Part of the {attribution.name} look
                    </Link>
                  )}
                </div>
                <FavoriteButton
                  productId={product.id}
                  initialIsFavorite={isFavorite}
                  isAuthenticated={isAuthenticated}
                  returnPath={returnPath}
                  preset={{ name: product.name, thumbUrl: presetThumbUrl }}
                />
              </div>

              <p className="text-text-secondary text-lg">
                {product.short_description || product.long_description}
              </p>

              {product.long_description && product.short_description && (
                <p className="text-text-secondary">{product.long_description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {fidelityLabel(product.likeness_level) && (
                  <span className="bg-charcoal-800 text-text-secondary rounded-md px-2.5 py-1 text-[13px]">
                    {fidelityLabel(product.likeness_level)}
                  </span>
                )}
                <span className="bg-charcoal-800 text-text-secondary rounded-md px-2.5 py-1 text-[13px] capitalize">
                  {product.type}
                </span>
              </div>

              <p className="text-text-muted text-sm">
                Works best with clear, well-lit photos — keep the subject
                centered.
              </p>

              {familyMembers.length > 0 && (
                <PresetFamilySelector
                  members={familyMembers}
                  currentProductId={product.id}
                />
              )}

              <div className="border-cream-100/10 border-t pt-6">
                <h2 className="text-cream-50 text-lg font-semibold">Controls</h2>
                <div className="border-cream-100/10 bg-charcoal-850 mt-4 rounded-2xl border p-6">
                  <ControlPreview fields={product.active_fields} />
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 pt-6">
                {isAuthenticated ? (
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link
                      href={ctaHref}
                      prefetch={false}
                      aria-label={`Try ${product.name}`}
                    >
                      Try this look
                    </Link>
                  </Button>
                ) : (
                  <TeaserFlow
                    productVersionId={product.version_id}
                    presetName={product.name}
                    heroUrl={presetThumbUrl}
                  />
                )}
              </div>

              <RelatedPresets
                product={product}
                isAuthenticated={isAuthenticated}
                favoriteIds={favoriteIds}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
