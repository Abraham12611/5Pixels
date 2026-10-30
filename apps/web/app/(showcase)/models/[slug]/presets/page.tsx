import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightning } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getPublicProducts } from "@/lib/db/explore";
import { MODEL_LINES, resolveModelSection } from "@/lib/marketing/model-lines";
import { ProductCard } from "@/components/consumer/product-card";
import { PresetQuickViewHost } from "@/components/consumer/preset-quick-view";
import { CompactFooter } from "@/components/marketing/compact-footer";

interface ModelPresetsRouteProps {
  params: Promise<{ slug: string }>;
}

function findLine(slug: string) {
  return MODEL_LINES.find((line) => line.slug === slug);
}

export async function generateMetadata({
  params,
}: ModelPresetsRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const line = findLine(slug);
  if (!line) {
    return { title: "Engine not found — 5Pixels" };
  }
  const title = `${line.name} presets — 5Pixels`;
  return {
    title,
    description: `Every 5Pixels preset powered by ${line.name}. ${line.tagline}`,
    openGraph: { title, description: line.tagline, type: "website" },
    twitter: { card: "summary_large_image", title, description: line.tagline },
  };
}

export default async function ModelPresetsPage({
  params,
}: ModelPresetsRouteProps) {
  const { slug } = await params;
  const line = findLine(slug);
  if (!line) notFound();

  const supabase = await createClient();
  const [{ data: userData }, { data: products }] = await Promise.all([
    supabase.auth.getUser(),
    getPublicProducts(undefined, undefined, undefined, undefined, "featured", 1, 96),
  ]);

  const section = resolveModelSection(line, products);
  if (section.products.length === 0) notFound();

  const isAuthenticated = Boolean(userData.user);
  const ctaProduct = section.products.find(
    (p) => p.slug === line.ctaPresetSlug
  );

  return (
    <>
      <PresetQuickViewHost
        isAuthenticated={isAuthenticated}
        returnPath={line.presetsHref}
      >
        <main className="px-4 pt-8 pb-16 sm:px-6 md:pt-12 lg:px-10">
          <Link
            href={line.pageHref}
            prefetch={false}
            className="text-text-secondary hover:text-cream-50 inline-flex items-center gap-1.5 text-xs font-medium transition"
          >
            <ArrowLeft size={13} weight="bold" aria-hidden />
            About {line.name}
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#D1FE17] uppercase sm:text-3xl md:text-4xl">
                {line.name} presets
              </h1>
              <p className="text-text-secondary mt-2 max-w-2xl text-sm leading-relaxed md:text-base">
                {line.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {ctaProduct ? (
                <Link
                  href={`/presets/${ctaProduct.slug}`}
                  className="text-ink-950 inline-flex h-10 items-center gap-2 rounded-lg bg-[#D1FE17] px-4 text-sm font-semibold transition hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
                >
                  <Lightning size={15} weight="fill" aria-hidden />
                  Start generating
                </Link>
              ) : null}
              <Link
                href={line.pageHref}
                prefetch={false}
                className="bg-charcoal-850 border-cream-100/15 text-cream-50 hover:bg-charcoal-800 hover:border-cream-100/30 inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
              >
                Learn about {line.name}
              </Link>
            </div>
          </div>

          {/* Full aspect-natural masonry — unclipped, every preset in the line */}
          <div
            data-explore-masonry=""
            aria-label={`All ${line.name} presets`}
            className="mt-8 columns-2 gap-2 md:mt-10 md:columns-3 lg:columns-4 xl:columns-5 [&>*]:mb-2 [&>*]:break-inside-avoid"
          >
            {section.products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                isAuthenticated={isAuthenticated}
                returnPath={line.presetsHref}
                priority={i < 4}
                variant="grid"
              />
            ))}
          </div>
        </main>
      </PresetQuickViewHost>
      {/* Compact bar only — mirrors the reference's slim footer on grid
          pages; hidden on mobile where the chrome is already minimal. */}
      {!isAuthenticated && <CompactFooter className="max-md:hidden" />}
    </>
  );
}
