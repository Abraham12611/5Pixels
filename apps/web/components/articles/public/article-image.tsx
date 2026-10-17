"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ImageViewer = dynamic(() =>
  import("@/components/consumer/mobile/image-viewer").then(
    (m) => m.ImageViewer
  )
);

/**
 * Article inline image with a tap-to-zoom full-screen viewer (#131).
 * The viewer is code-split so anonymous readers only pay for it on demand.
 * Plain <img> — article media lives on the public Storage host with explicit
 * dimensions to avoid layout shift.
 */
export function ArticleImage({
  src,
  alt,
  caption,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <figure className={cn("my-6", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `View ${alt} full size` : "View image full size"}
        className="focus-visible:ring-lime-500/70 block w-full cursor-zoom-in overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL with explicit dims */}
        <img
          src={src}
          alt={alt}
          width={width ?? undefined}
          height={height ?? undefined}
          loading="lazy"
          decoding="async"
          className="bg-charcoal-850 h-auto w-full object-cover"
        />
      </button>
      {caption ? (
        <figcaption className="text-text-muted mt-2 text-center text-sm">
          {caption}
        </figcaption>
      ) : null}
      <ImageViewer
        open={open}
        onOpenChange={setOpen}
        src={src}
        alt={alt}
        caption={caption}
      />
    </figure>
  );
}
