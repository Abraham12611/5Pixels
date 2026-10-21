import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicProductBySlug,
  getUserFavoriteProductIds,
} from "@/lib/db/explore";
import { getPresetFamilyRail } from "@/lib/catalog/family";
import { presetIndexPolicy } from "@/lib/catalog/discovery";
import { buildPresetView } from "@/lib/catalog/preset-view";
import { PresetLightbox } from "@/components/consumer/preset-lightbox";
import { publicAssetUrl, selectCatalogMediaAsset } from "@/lib/catalog/media";

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

  const [{ data: familyMembers }, view] = await Promise.all([
    getPresetFamilyRail(product),
    buildPresetView(product),
  ]);
  const jsonLd = buildJsonLd(product);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd}
        />
      )}
      <PresetLightbox
        initial={view}
        familyMembers={familyMembers}
        isAuthenticated={isAuthenticated}
        favoriteIds={favoriteIds}
      />
    </>
  );
}
