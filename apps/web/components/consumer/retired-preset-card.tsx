"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { isImageMimeType } from "@/lib/catalog/media";
import type { PublicProductSummary } from "@/types/catalog";

function publicUrl(bucket: string, key: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;
}

/**
 * A saved preset that is no longer available. Kept visible (rather than
 * silently dropped) with a muted treatment and a path back to discovery.
 */
export function RetiredPresetCard({
  product,
}: {
  product: PublicProductSummary;
}) {
  const still =
    product.public_assets.find(
      (a) => a.role === "poster" && isImageMimeType(a.mime_type)
    ) ??
    product.public_assets.find(
      (a) => a.role === "hero" && isImageMimeType(a.mime_type)
    ) ??
    product.public_assets.find((a) => isImageMimeType(a.mime_type)) ??
    null;

  return (
    <article className="shadow-border relative mb-5 flex break-inside-avoid flex-col overflow-hidden rounded-xl bg-charcoal-850 opacity-70">
      <div
        className="bg-charcoal-800 relative overflow-hidden"
        style={{
          aspectRatio:
            still?.width && still?.height
              ? `${still.width} / ${still.height}`
              : "4 / 5",
        }}
      >
        {still ? (
          <Image
            src={publicUrl(still.bucket, still.storage_key)}
            alt={`Preview for ${product.name}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="media-frame object-cover grayscale"
          />
        ) : (
          <div className="media-frame h-full w-full" aria-hidden />
        )}
        <span className="bg-ink-950/70 text-cream-100 absolute top-2.5 left-2.5 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
          Retired
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-cream-100 truncate text-sm font-semibold">
          {product.name}
        </h3>
        <p className="text-text-muted mt-0.5 text-xs">
          This look is no longer available.
        </p>
        <Link
          href={
            product.category_slug
              ? `/explore?category=${product.category_slug}`
              : "/explore"
          }
          prefetch={false}
          className="text-text-secondary hover:text-lime-400 mt-2.5 inline-flex items-center gap-1 text-[13px] font-medium transition-colors"
        >
          See alternatives
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
    </article>
  );
}
