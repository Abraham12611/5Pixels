"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Images, Lightning } from "@phosphor-icons/react";
import type { PublicProductSummary } from "@/types/catalog";
import { selectCatalogMediaAsset } from "@/lib/catalog/media";

function mediaUrl(
  asset: { bucket: string; storage_key: string; width: number | null; height: number | null } | null
): string | null {
  if (!asset) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${asset.bucket}/${asset.storage_key}`;
}

function useIntervalToggler(count: number, intervalMs = 5000) {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (count <= 1) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [count, intervalMs]);

  return { index, setIndex };
}

interface HeroCarouselProps {
  products: PublicProductSummary[];
}

export function HeroCarousel({ products }: HeroCarouselProps) {
  const { index, setIndex } = useIntervalToggler(
    products.length,
    5000
  );

  const goto = useCallback(
    (i: number) => {
      setIndex(((i % products.length) + products.length) % products.length);
    },
    [products.length, setIndex]
  );

  if (products.length === 0) return null;

  const active = products[index]!;

  return (
    <section className="relative mx-auto max-w-3xl px-4 py-10 text-center sm:py-16">
      <p className="text-lime-400 mb-3 text-xs font-semibold tracking-[0.25em] uppercase">
        {products.length > 1 ? "Preset spotlight" : "Start creating"}
      </p>

      <div className="bg-charcoal-900 border-cream-100/10 relative overflow-hidden rounded-3xl border p-3 sm:p-4">
        <div className="bg-charcoal-800 relative aspect-square overflow-hidden rounded-2xl">
          {mediaUrl(selectCatalogMediaAsset(active.public_assets, "card")) ? (
            <Image
              src={mediaUrl(selectCatalogMediaAsset(active.public_assets, "card"))!}
              alt={active.name}
              fill
              className="object-cover transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-10 text-text-secondary text-sm">
              <Images size={48} weight="fill" className="opacity-40" />
            </div>
          )}

          <Link
            href={`/presets/${active.slug}`}
            className="bg-charcoal-950/80 text-cream-100 hover:bg-charcoal-900 absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 backdrop-blur transition sm:inset-x-4 sm:bottom-4 sm:px-5"
          >
            <div className="min-w-0 text-left">
              <p className="text-cream-50 truncate text-sm font-semibold sm:text-base">
                {active.name}
              </p>
              {active.short_description ? (
                <p className="text-text-secondary truncate text-xs sm:text-sm">
                  {active.short_description}
                </p>
              ) : null}
            </div>
            <span className="bg-lime-400 text-ink-950 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold sm:text-sm">
              <Lightning size={14} weight="fill" />
              Try it
            </span>
          </Link>
        </div>
      </div>

      {products.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {products.map((product, i) => (
            <button
              key={product.id}
              type="button"
              onClick={() => goto(i)}
              aria-label={`Slide ${i + 1}: ${product.name}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "bg-lime-400 w-6"
                  : "bg-charcoal-700 hover:bg-charcoal-600 w-3"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
