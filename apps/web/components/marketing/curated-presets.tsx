"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductVideoCard } from "./product-video-card";
import type { PublicProductSummary } from "@/types/catalog";

interface CuratedPresetsProps {
  products: PublicProductSummary[];
}

export function CuratedPresets({ products }: CuratedPresetsProps) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
              Curated presets
            </p>
            <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
              Looks people love
            </h2>
            <p className="text-text-secondary mt-2 max-w-xl">
              Handpicked transformations designed to work beautifully. Hover a
              card to see the preview in motion.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-lime-400 hover:text-lime-300">
            <Link href="/explore">
              View all presets
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-12 text-center">
            <p className="text-text-secondary">
              No presets published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <ProductVideoCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
