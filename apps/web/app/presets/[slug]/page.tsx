import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicProductBySlug,
  getUserFavoriteProductIds,
} from "@/lib/db/explore";
import { ProductMedia } from "@/components/consumer/product-media";
import { FavoriteButton } from "@/components/consumer/favorite-button";
import { ControlPreview } from "@/components/consumer/control-preview";
import { selectCatalogMediaAsset } from "@/lib/catalog/media";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function PresetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
  const ctaHref = `/app/create/${product.slug}`;
  const returnPath = `/presets/${product.slug}`;

  return (
    <main className="flex flex-1 flex-col">
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
        <div className="order-2 lg:order-1">
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
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              {product.category_name && (
                <p className="text-sm font-medium text-lime-400">
                  {product.category_name}
                </p>
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
            />
          </div>

          <p className="text-text-secondary text-lg">
            {product.short_description || product.long_description}
          </p>

          {product.long_description && product.short_description && (
            <p className="text-text-secondary">{product.long_description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-charcoal-800 text-cream-50 rounded-full px-3 py-1 text-sm font-medium">
              {product.credit_cost || "Free"}
              {product.credit_cost ? " credits" : ""}
            </span>
            {product.version_number ? (
              <span className="bg-charcoal-800 text-text-muted rounded-full px-3 py-1 text-sm">
                Version {product.version_number}
              </span>
            ) : null}
          </div>

          <div className="border-cream-100/10 border-t pt-6">
            <h2 className="text-cream-50 text-lg font-semibold">Controls</h2>
            <div className="border-cream-100/10 bg-charcoal-850 mt-4 rounded-2xl border p-6">
              <ControlPreview fields={product.active_fields} />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6">
            <Button asChild className="w-full sm:w-auto">
              <Link
                href={ctaHref}
                prefetch={false}
                aria-label={
                  isAuthenticated
                    ? `Create with ${product.name}`
                    : `Sign in to create with ${product.name}`
                }
              >
                {isAuthenticated
                  ? "Create with this look"
                  : "Sign in to create"}
              </Link>
            </Button>
            {!isAuthenticated && (
              <p className="text-text-muted text-sm">
                Already have an account?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(ctaHref)}`}
                  className="text-lime-400 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
