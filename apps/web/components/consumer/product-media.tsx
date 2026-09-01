import Image from "next/image";
import { cn } from "@/lib/utils";
import type { PublicProductAsset } from "@/types/catalog";
import { isImageMimeType, isVideoMimeType } from "@/lib/catalog/media";

interface ProductMediaProps {
  asset: PublicProductAsset | null;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}

/**
 * Render a catalog media asset as an optimized image or muted looping video.
 *
 * Images use next/image. Videos fall back to the native video element because
 * Next.js Image does not handle motion assets.
 */
export function ProductMedia({
  asset,
  alt,
  className,
  fill,
  priority,
  sizes,
}: ProductMediaProps) {
  if (!asset) {
    return (
      <div
        className={cn(
          "bg-charcoal-800 flex items-center justify-center",
          className
        )}
        aria-label="No preview available"
      />
    );
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${asset.bucket}/${asset.storage_key}`;

  if (isVideoMimeType(asset.mime_type)) {
    return (
      <video
        src={publicUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className={cn("h-full w-full object-cover", className)}
        aria-label={alt}
      />
    );
  }

  if (isImageMimeType(asset.mime_type)) {
    return (
      <Image
        src={publicUrl}
        alt={alt}
        fill={fill}
        width={fill ? undefined : (asset.width ?? 640)}
        height={fill ? undefined : (asset.height ?? 800)}
        className={cn("object-cover", className)}
        priority={priority}
        sizes={sizes}
        unoptimized={asset.mime_type === "image/gif"}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-charcoal-800 flex items-center justify-center",
        className
      )}
      aria-label="Unsupported media"
    />
  );
}
