"use client";

import Link from "next/link";
import { ArrowLeft, TextT } from "@phosphor-icons/react";
import { ProductMedia } from "@/components/consumer/product-media";
import { isVideoMimeType, publicAssetUrl } from "@/lib/catalog/media";
import { useMediaQuery } from "@/lib/ui/use-media-query";
import type { PublicProductAsset } from "@/types/catalog";

/**
 * Full-bleed 4:5 preview for the mobile preset detail composition
 * (25_MOBILE_WEB_POLISH/07 §3): muted looping video when the asset is motion,
 * swapped for a still under prefers-reduced-motion; bottom gradient, a
 * floating back affordance, and — for Posters — the deterministic-text
 * annotation.
 */
export function PresetDetailHero({
  asset,
  stillAsset,
  name,
  isPoster,
  backHref = "/explore",
}: {
  /** The hero asset — may be video. */
  asset: PublicProductAsset | null;
  /** Image fallback shown under reduced motion when `asset` is video. */
  stillAsset: PublicProductAsset | null;
  name: string;
  isPoster: boolean;
  backHref?: string;
}) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden">
      {asset && isVideoMimeType(asset.mime_type) && !reducedMotion ? (
        <video
          src={publicAssetUrl(asset.bucket, asset.storage_key)}
          poster={
            stillAsset
              ? publicAssetUrl(stillAsset.bucket, stillAsset.storage_key)
              : undefined
          }
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <ProductMedia
          asset={stillAsset ?? asset}
          alt={name}
          className="absolute inset-0"
          fill
          priority
          sizes="100vw"
        />
      )}

      {/* Bottom gradient into the page */}
      <div
        aria-hidden
        className="from-ink-950 via-ink-950/30 pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t to-transparent"
      />

      <Link
        href={backHref}
        aria-label="Back to Explore"
        className="bg-ink-950/60 text-cream-50 hover:bg-ink-950/80 focus-visible:ring-lime-500/70 absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft size={20} weight="bold" />
      </Link>

      {isPoster && (
        <div className="pointer-events-none absolute inset-x-8 bottom-16 flex flex-col items-center gap-1.5">
          <span className="border-cream-50/50 text-cream-50 flex items-center gap-1.5 rounded-lg border border-dashed bg-ink-950/50 px-3 py-1.5 text-[12px] font-medium backdrop-blur-sm">
            <TextT size={14} weight="bold" />
            Your text appears here
          </span>
        </div>
      )}
    </div>
  );
}
