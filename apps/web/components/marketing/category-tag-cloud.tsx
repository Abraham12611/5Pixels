"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";

interface CategoryTagCloudProps {
  categories: { slug: string; name: string }[];
}

export function CategoryTagCloud({ categories }: CategoryTagCloudProps) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-cream-50 text-3xl font-bold sm:text-4xl">
          Explore more directions
        </h2>
        <p className="text-text-secondary mt-3 max-w-2xl mx-auto">
          Jump into a category and find the right look faster.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/explore?category=${category.slug}`}
              onClick={() =>
                trackEvent({
                  event: "category_chip_click",
                  props: { category: category.slug },
                })
              }
              className="border-cream-100/10 bg-charcoal-800 text-cream-50 hover:border-lime-500/30 hover:text-lime-400 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition"
            >
              {category.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ))}
          <Link
            href="/explore"
            onClick={() =>
              trackEvent({
                event: "view_all_presets_click",
                props: { location: "tag_cloud" },
              })
            }
            className="border-lime-500/30 bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
