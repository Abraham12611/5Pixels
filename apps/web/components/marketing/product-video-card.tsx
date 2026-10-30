"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  isImageMimeType,
  isVideoMimeType,
  publicAssetUrl,
  resolveProductAspectRatio,
  selectCatalogMediaAsset,
} from "@/lib/catalog/media";
import type { PublicProductSummary } from "@/types/catalog";

interface ProductVideoCardProps {
  product: PublicProductSummary;
  className?: string;
  priority?: boolean;
}

function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToReducedMotion(
  callback: (matches: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

export function ProductVideoCard({
  product,
  className,
  priority = false,
}: ProductVideoCardProps) {
  const mediaAsset = selectCatalogMediaAsset(product.public_assets, "card");
  const initialAspect = resolveProductAspectRatio(product, mediaAsset);
  const [naturalAspect, setNaturalAspect] = useState<string | null>(null);
  const aspect = naturalAspect ?? initialAspect;

  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    (callback) => subscribeToReducedMotion(callback),
    getReducedMotion,
    () => false
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.3, rootMargin: "100px" }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const shouldPlay = !prefersReducedMotion && (isHovered || isInView);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) {
      void video.play().catch(() => {
        // Browser autoplay restrictions are best-effort.
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [shouldPlay]);

  return (
    <article
      ref={containerRef}
      style={{ aspectRatio: aspect }}
      className={cn(
        "group/explore-card bg-charcoal-850 relative isolate min-w-0 w-full shrink-0 break-inside-avoid overflow-hidden rounded-xl ring-1 ring-white/8 transition hover:ring-lime-500/40 hover:shadow-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
    >
      <Link
        href={`/presets/${product.slug}`}
        className="bg-charcoal-800 absolute inset-0 block overflow-hidden"
        prefetch={false}
      >
        <div className="relative h-full w-full">
          {mediaAsset && isVideoMimeType(mediaAsset.mime_type) ? (
            <video
              ref={videoRef}
              src={publicAssetUrl(mediaAsset.bucket, mediaAsset.storage_key)}
              loop
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                const { videoWidth, videoHeight } = e.currentTarget;
                if (videoWidth > 0 && videoHeight > 0) {
                  setNaturalAspect(`${videoWidth} / ${videoHeight}`);
                }
              }}
              className={cn(
                "h-full w-full object-cover transition duration-500",
                shouldPlay ? "scale-[1.03]" : "scale-100"
              )}
              aria-label={`Preview for ${product.name}`}
            />
          ) : mediaAsset && isImageMimeType(mediaAsset.mime_type) ? (
            <Image
              src={publicAssetUrl(mediaAsset.bucket, mediaAsset.storage_key)}
              alt={`Preview for ${product.name}`}
              fill
              className="h-full w-full object-cover transition duration-500 group-hover/explore-card:scale-[1.03]"
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized={mediaAsset.mime_type === "image/gif"}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setNaturalAspect(`${naturalWidth} / ${naturalHeight}`);
                }
              }}
            />
          ) : (
            <div className="bg-charcoal-800 flex h-full w-full items-center justify-center" />
          )}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75"
        />
        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between">
          {product.category_name ? (
            <span className="bg-black/35 text-cream-50 rounded-full px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md">
              {product.category_name}
            </span>
          ) : null}
        </div>
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-cream-50 truncate text-xs font-semibold drop-shadow-sm sm:text-sm">
              {product.name}
            </h3>
            {product.short_description && (
              <p className="sr-only">{product.short_description}</p>
            )}
          </div>
          <span className="text-cream-100/75 shrink-0 text-[10px] font-medium tracking-wider uppercase">
            {product.type}
          </span>
        </div>
      </Link>
    </article>
  );
}
