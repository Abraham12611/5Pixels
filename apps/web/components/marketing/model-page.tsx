import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CaretDown, Lightning } from "@phosphor-icons/react/dist/ssr";
import { PresetShelf } from "./preset-shelf";
import {
  isImageMimeType,
  publicAssetUrl,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import { cn } from "@/lib/utils";
import type { ModelLine } from "@/lib/marketing/model-lines";
import type { PublicProductSummary } from "@/types/catalog";

function heroImageUrl(products: PublicProductSummary[], slug: string) {
  const product = products.find((p) => p.slug === slug);
  const asset = product
    ? selectCatalogMediaAsset(product.public_assets, "hero")
    : null;
  return asset && isImageMimeType(asset.mime_type)
    ? publicAssetUrl(asset.bucket, asset.storage_key)
    : null;
}

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload one photo",
    body: "A clear photo of your subject — that's the only input the engine needs.",
  },
  {
    step: "02",
    title: "Tune the controls",
    body: "A few schema-driven sliders per preset. No prompts, no guesswork.",
  },
  {
    step: "03",
    title: "Get the result",
    body: "Generation runs in seconds. Save it, share it, or try a sibling preset.",
  },
];

export function ModelPage({
  line,
  products,
  otherLines,
  isAuthenticated,
}: {
  line: ModelLine;
  products: PublicProductSummary[];
  /** Other model lines for the "more engines" rail. */
  otherLines: { name: string; tagline: string; pageHref: string }[];
  isAuthenticated: boolean;
}) {
  const heroSlug = line.page.heroPresetSlug ?? line.ctaPresetSlug;
  const hero = heroImageUrl(products, heroSlug);
  const ctaProduct = products.find((p) => p.slug === line.ctaPresetSlug);
  const showcase = products.slice(0, 6);

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="px-4 pt-8 sm:px-6 md:pt-14 lg:px-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-lime-400 text-[11px] font-bold tracking-[0.2em] uppercase">
              5Pixels engine
            </p>
            <h1 className="text-cream-50 mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {line.name}
            </h1>
            <p className="text-cream-100/90 mt-3 text-lg font-medium md:text-xl">
              {line.tagline}
            </p>
            <p className="text-text-secondary mt-4 max-w-xl text-sm leading-relaxed md:text-base">
              {line.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {ctaProduct ? (
                <Link
                  href={`/presets/${ctaProduct.slug}`}
                  className="bg-lime-400 text-ink-950 hover:bg-lime-300 focus-visible:outline-lime-300 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <Lightning size={15} weight="fill" aria-hidden />
                  Try {line.name}
                </Link>
              ) : null}
              <Link
                href={line.presetsHref}
                prefetch={false}
                className="border-cream-100/20 text-cream-50 hover:border-lime-500/50 hover:text-lime-400 focus-visible:outline-lime-400 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                All {line.name} presets
                <ArrowRight size={14} weight="bold" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="bg-charcoal-850 border-cream-100/10 relative aspect-[4/3] overflow-hidden rounded-2xl border">
            {hero ? (
              <Image
                src={hero}
                alt={`${line.name} showcase`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="from-charcoal-800 to-ink-950 h-full w-full bg-gradient-to-br" />
            )}
          </div>
        </div>
      </section>

      {/* Showcase strip — same clipped-rail feel as the landing carousel */}
      <section aria-label="Showcase" className="pt-8 md:pt-12">
        <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 sm:px-6 md:gap-4 lg:px-10">
          {showcase.map((product) => {
            const asset = selectCatalogMediaAsset(
              product.public_assets,
              "card"
            );
            const url =
              asset && isImageMimeType(asset.mime_type)
                ? publicAssetUrl(asset.bucket, asset.storage_key)
                : null;
            return (
              <Link
                key={product.id}
                href={`/presets/${product.slug}`}
                prefetch={false}
                className="bg-charcoal-850 border-cream-100/10 hover:border-lime-500/40 focus-visible:outline-lime-400 relative aspect-[4/5] w-36 shrink-0 overflow-hidden rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-44 md:w-52"
              >
                {url ? (
                  <Image
                    src={url}
                    alt={`${product.name} preview`}
                    fill
                    sizes="(max-width: 640px) 144px, (max-width: 768px) 176px, 208px"
                    className="object-cover"
                  />
                ) : (
                  <div className="from-charcoal-800 to-ink-950 h-full w-full bg-gradient-to-br" />
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Feature blocks — alternating media/copy */}
      <section className="px-4 pt-12 sm:px-6 md:pt-16 lg:px-10">
        <div className="flex flex-col gap-10 md:gap-14">
          {line.page.features.map((feature, i) => {
            const url = heroImageUrl(products, feature.presetSlug);
            const featureProduct = products.find(
              (p) => p.slug === feature.presetSlug
            );
            return (
              <div
                key={feature.title}
                className={cn(
                  "grid items-center gap-6 md:grid-cols-2 md:gap-10",
                  i % 2 === 1 && "md:[&>*:first-child]:order-2"
                )}
              >
                <div className="bg-charcoal-850 border-cream-100/10 relative aspect-[4/3] overflow-hidden rounded-2xl border">
                  {url ? (
                    <Image
                      src={url}
                      alt={`${feature.title} — example`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="from-charcoal-800 to-ink-950 h-full w-full bg-gradient-to-br" />
                  )}
                </div>
                <div>
                  <h2 className="text-cream-50 text-xl font-bold tracking-tight md:text-2xl">
                    {feature.title}
                  </h2>
                  <p className="text-text-secondary mt-3 max-w-lg text-sm leading-relaxed md:text-base">
                    {feature.body}
                  </p>
                  {featureProduct ? (
                    <Link
                      href={`/presets/${featureProduct.slug}`}
                      prefetch={false}
                      className="text-lime-400 hover:text-lime-300 mt-4 inline-flex items-center gap-1.5 text-sm font-semibold"
                    >
                      Try {featureProduct.name}
                      <ArrowRight size={14} weight="bold" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pt-12 sm:px-6 md:pt-16 lg:px-10">
        <h2 className="text-cream-50 text-xl font-bold tracking-tight md:text-2xl">
          How it works
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 md:mt-6 md:gap-4">
          {HOW_IT_WORKS.map((step) => (
            <div
              key={step.step}
              className="bg-charcoal-850 border-cream-100/10 rounded-xl border p-4 md:p-5"
            >
              <span className="text-lime-400 text-xs font-bold tracking-wider">
                {step.step}
              </span>
              <p className="text-cream-50 mt-2 font-semibold">{step.title}</p>
              <p className="text-text-secondary mt-1 text-sm">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Presets for this engine */}
      <PresetShelf
        id={`${line.slug}-presets`}
        title={`${line.name} presets`}
        tagline="Every preset in this collection runs on this engine."
        products={products}
        viewAllHref={line.presetsHref}
        viewAllLabel={`View all ${line.name} presets`}
        isAuthenticated={isAuthenticated}
        clipHeight="max-h-[64rem]"
      />

      {/* FAQ */}
      {line.page.faq.length > 0 ? (
        <section className="px-4 pt-12 sm:px-6 md:pt-16 lg:px-10">
          <h2 className="text-cream-50 text-xl font-bold tracking-tight md:text-2xl">
            {line.name} FAQ
          </h2>
          <div className="mt-5 flex max-w-3xl flex-col gap-3 md:mt-6">
            {line.page.faq.map((item) => (
              <details
                key={item.q}
                className="group bg-charcoal-850 border-cream-100/10 open:border-lime-500/30 rounded-xl border"
              >
                <summary className="text-cream-50 flex cursor-pointer items-center justify-between gap-4 p-4 font-semibold marker:hidden md:p-5 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <CaretDown
                    size={16}
                    weight="bold"
                    aria-hidden
                    className="text-text-muted shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="text-text-secondary px-4 pb-4 text-sm leading-relaxed md:px-5 md:pb-5">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* Other engines */}
      {otherLines.length > 0 ? (
        <section className="px-4 pt-12 sm:px-6 md:pt-16 lg:px-10">
          <h2 className="text-cream-50 text-xl font-bold tracking-tight md:text-2xl">
            More engines
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:mt-6 lg:grid-cols-3 md:gap-4">
            {otherLines.map((other) => (
              <Link
                key={other.pageHref}
                href={other.pageHref}
                prefetch={false}
                className="group bg-charcoal-850 border-cream-100/10 hover:border-lime-500/40 focus-visible:outline-lime-400 flex items-center justify-between gap-3 rounded-xl border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 md:p-5"
              >
                <div className="min-w-0">
                  <p className="text-cream-50 group-hover:text-lime-400 truncate font-semibold transition">
                    {other.name}
                  </p>
                  <p className="text-text-muted mt-0.5 truncate text-xs">
                    {other.tagline}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  weight="bold"
                  aria-hidden
                  className="text-text-muted group-hover:text-lime-400 shrink-0 transition"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
