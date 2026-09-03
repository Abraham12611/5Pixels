"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductVideoCard } from "./product-video-card";
import type { PublicProductSummary } from "@/types/catalog";

interface CollectionSpotlightProps {
  title: string;
  eyebrow: string;
  description: string;
  products: PublicProductSummary[];
  exploreHref: string;
}

export function CollectionSpotlight({
  title,
  eyebrow,
  description,
  products,
  exploreHref,
}: CollectionSpotlightProps) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-lime-400 text-sm font-semibold uppercase tracking-wider">
              {eyebrow}
            </p>
            <h2 className="text-cream-50 mt-2 text-3xl font-bold sm:text-4xl">
              {title}
            </h2>
            <p className="text-text-secondary mt-2 max-w-xl">{description}</p>
          </div>
          <Button asChild variant="ghost" className="text-lime-400 hover:text-lime-300 shrink-0">
            <Link href={exploreHref}>
              Explore all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="border-cream-100/10 bg-charcoal-850 rounded-2xl border p-10 text-center">
            <p className="text-text-secondary">
              No {eyebrow.toLowerCase()} presets yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((product, index) => (
              <ProductVideoCard
                key={product.id}
                product={product}
                priority={index < 3}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
