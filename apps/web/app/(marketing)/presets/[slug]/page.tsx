import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicProductBySlug,
  getPublicProductEditorial,
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
import { TeaserLauncher } from "@/components/consumer/teaser-launcher";
import { ControlPreview } from "@/components/consumer/control-preview";
import { ExampleGallery } from "@/components/consumer/example-gallery";
import { RelatedPresets } from "@/components/consumer/related-presets";
import { RecentPresetRecorder } from "@/components/consumer/recent-preset-recorder";
import { PresetPromptCard } from "@/components/consumer/preset-prompt-card";
import { PresetShareButton } from "@/components/consumer/preset-share-button";
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
import { X } from "@phosphor-icons/react/dist/ssr";

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
  const [{ data: familyMembers }, editorial] = await Promise.all([
    getPresetFamilyRail(product),
    getPublicProductEditorial(product.id),
  ]);
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
  const ctaHref = `/app/create/${product.slug}`;
  const returnPath = `/presets/${product.slug}`;
  const jsonLd = buildJsonLd(product);
  const dockedInfo = "Each run is unique — results will differ";

  // Console prompt card: the approved public recipe when one exists, else
  // the preset description — matching the admin's optional-recipe contract.
  const description =
    product.short_description || product.long_description || null;
  const recipeText = editorial?.publicPromptRecipe ?? null;
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

      {/*
        Lightbox composition (#246-style detail view): the artwork fills the
        stage while a fixed-width console carries everything else. The page
        never scrolls on desktop — the console scrolls internally — and the
        hero is blurred behind the whole surface as ambient backdrop.
      */}
      <main className="relative flex flex-1 flex-col">
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

        <div className="flex flex-1 flex-col md:grid md:h-[calc(100dvh-4rem)] md:grid-cols-[1fr_23rem] md:overflow-hidden">
          {/* ============ Image stage ============ */}
          <div className="relative flex h-[46dvh] shrink-0 items-center justify-center p-3 md:h-auto md:min-h-0 md:p-6">
            <div className="bg-charcoal-800 relative h-full w-full overflow-hidden rounded-2xl">
              <ProductMedia
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

              {familyMembers.length > 0 && (
                <PresetFamilySelector
                  members={familyMembers}
                  currentProductId={product.id}
                />
              )}

              {videoAsset && (
                <ProductVideoPlayer
                  publicUrl={publicAssetUrl(
                    videoAsset.bucket,
                    videoAsset.storage_key
                  )}
                  posterUrl={presetThumbUrl ?? undefined}
                  label={`${product.name} preview`}
                />
              )}

              <ExampleGallery publicAssets={product.public_assets} />

              <p className="text-text-muted text-xs">
                Works best with clear, well-lit photos — keep the subject
                centered.
              </p>

              <RelatedPresets
                product={product}
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
