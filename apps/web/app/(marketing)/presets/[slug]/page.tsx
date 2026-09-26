import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicProductBySlug,
  getUserFavoriteProductIds,
} from "@/lib/db/explore";
import { ProductMedia } from "@/components/consumer/product-media";
import { ProductVideoPlayer } from "@/components/consumer/product-video-player";
import { FavoriteButton } from "@/components/consumer/favorite-button";
import { AuthGateButton } from "@/components/auth/auth-gate";
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
import { isImageMimeType, selectCatalogMediaAsset } from "@/lib/catalog/media";
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
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${heroAsset.bucket}/${heroAsset.storage_key}`
    : undefined;

  return {
    title,
    description,
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
    alternates: {
      canonical: `/presets/${product.slug}`,
    },
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
      offers: {
        "@type": "Offer",
        price: product.credit_cost ?? 0,
        priceCurrency: "USD",
      },
      image: heroAsset
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${heroAsset.bucket}/${heroAsset.storage_key}`
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
  const heroAsset = selectCatalogMediaAsset(product.public_assets, "hero");
  const stillAsset =
    product.public_assets.find((a) => isImageMimeType(a.mime_type)) ?? null;
  const presetThumbUrl = stillAsset
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${stillAsset.bucket}/${stillAsset.storage_key}`
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
    .map(
      (asset) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${asset.bucket}/${asset.storage_key}`
    );
  const ctaHref = `/app/create/${product.slug}`;
  const returnPath = `/presets/${product.slug}`;
  const jsonLd = buildJsonLd(product);
  const costLabel = product.credit_cost
    ? `${product.credit_cost} ${product.credit_cost === 1 ? "credit" : "credits"}`
    : "Free";
  const dockedInfo = `${costLabel} · Each run is unique — results will differ`;

  const mobileCta = isAuthenticated ? (
    <Button asChild className="w-full" variant="brand">
      <Link
        href={ctaHref}
        prefetch={false}
        aria-label={`Use ${product.name} — ${costLabel}`}
      >
        Use this look
      </Link>
    </Button>
  ) : (
    <AuthGateButton
      next={ctaHref}
      preset={{ name: product.name, thumbUrl: presetThumbUrl }}
      label="Use this look"
      className="w-full"
      ariaLabel={`Use ${product.name}`}
      costLabel={product.credit_cost > 0 ? costLabel : null}
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
              <span className="bg-charcoal-800 text-cream-50 rounded-md px-2.5 py-1 text-[13px] font-medium tabular-nums">
                {costLabel}
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
              <div className="bg-charcoal-800 relative aspect-[4/5] overflow-hidden rounded-2xl lg:sticky lg:top-6">
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
                    publicUrl={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${videoAsset.bucket}/${videoAsset.storage_key}`}
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
                <span className="bg-charcoal-800 text-cream-50 rounded-md px-2.5 py-1 text-[13px] font-medium tabular-nums">
                  {costLabel}
                </span>
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
                      aria-label={`Try ${product.name} — ${costLabel}`}
                    >
                      Try this look
                      {product.credit_cost > 0 && (
                        <span className="text-ink-950/60 text-xs font-medium">
                          · {costLabel}
                        </span>
                      )}
                    </Link>
                  </Button>
                ) : (
                  <>
                    <AuthGateButton
                      next={ctaHref}
                      preset={{ name: product.name, thumbUrl: presetThumbUrl }}
                      className="w-full sm:w-auto"
                      ariaLabel={`Try ${product.name}`}
                      costLabel={
                        product.credit_cost > 0 ? costLabel : null
                      }
                    />
                    <p className="text-text-muted text-sm">
                      Already have an account?{" "}
                      <Link
                        href={`/login?next=${encodeURIComponent(ctaHref)}`}
                        className="text-lime-400 hover:underline"
                      >
                        Log in
                      </Link>
                    </p>
                  </>
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
