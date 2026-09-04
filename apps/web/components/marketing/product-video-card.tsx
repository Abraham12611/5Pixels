"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { selectCatalogMediaAsset } from "@/lib/catalog/media";
import { isVideoMimeType, isImageMimeType } from "@/lib/catalog/media";
import type { PublicProductSummary } from "@/types/catalog";

interface ProductVideoCardProps {
  product: PublicProductSummary;
  className?: string;
  priority?: boolean;
}

function buildPublicUrl(bucket: string, storageKey: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${storageKey}`;
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
      className={cn(
        "group border-cream-100/10 bg-charcoal-850 relative flex flex-col overflow-hidden rounded-2xl border transition hover:border-lime-500/30 hover:shadow-lg",
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
        className="bg-charcoal-800 relative block aspect-[4/5] overflow-hidden"
        prefetch={false}
      >
        <div className="relative h-full w-full">
          {mediaAsset && isVideoMimeType(mediaAsset.mime_type) ? (
            <video
              ref={videoRef}
              src={buildPublicUrl(mediaAsset.bucket, mediaAsset.storage_key)}
              loop
              muted
              playsInline
              preload="metadata"
              className={cn(
                "h-full w-full object-cover transition duration-500",
                shouldPlay ? "scale-105" : "scale-100"
              )}
              aria-label={`Preview for ${product.name}`}
            />
          ) : mediaAsset && isImageMimeType(mediaAsset.mime_type) ? (
            <Image
              src={buildPublicUrl(mediaAsset.bucket, mediaAsset.storage_key)}
              alt={`Preview for ${product.name}`}
              fill
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={mediaAsset.mime_type === "image/gif"}
            />
          ) : (
            <div className="bg-charcoal-800 flex h-full w-full items-center justify-center" />
          )}
        </div>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {product.category_name ? (
            <span className="bg-ink-950/70 text-cream-50 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              {product.category_name}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-cream-50 font-semibold">
              <Link
                href={`/presets/${product.slug}`}
                className="hover:text-lime-400 focus:outline-none"
                prefetch={false}
              >
                {product.name}
              </Link>
            </h3>
            <span className="bg-charcoal-700 text-cream-100 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
              {product.credit_cost || "Free"}
              {product.credit_cost ? " cr" : ""}
            </span>
          </div>
          <p className="text-text-secondary mt-1 line-clamp-2 text-sm">
            {product.short_description}
          </p>
        </div>
        <div className="text-text-muted mt-3 flex items-center gap-2 text-xs">
          <span className="capitalize">{product.type}</span>
        </div>
      </div>
    </article>
  );
}
