import { cn } from "@/lib/utils";
import type { TeaserVariant } from "@/lib/teaser/variant";

export type { TeaserVariant };

/**
 * Result-stage frame for the teaser: a blurred reference render + dark scrim
 * + overlay slot. The image shown is the preset's *public* marketing asset —
 * already visible on the preset page — so no real asset URL ever reaches the
 * client pre-unlock; the blur is presentation, not access control (07 §4 S8).
 */
export function BlurredResultStage({
  imageUrl,
  alt,
  variant,
  children,
  className,
}: {
  imageUrl: string;
  alt: string;
  variant: TeaserVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-ink-950",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${imageUrl})`,
          filter: `blur(${variant.blurPx}px) saturate(1.2) brightness(0.8)`,
          transform: `scale(${variant.zoom}) translate(${variant.cropX - 7}%, ${variant.cropY - 7}%)`,
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-ink-950/55" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        {children}
      </div>
      <span className="sr-only">{alt}</span>
    </div>
  );
}
