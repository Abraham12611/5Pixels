"use client";

import Link from "next/link";
import { ArrowUpRight, ImageBroken, Lightning } from "@phosphor-icons/react";
import { trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";
import type { PresetCardData } from "@/lib/articles/preset-card";

/**
 * Shared read-only preset card — rendered identically in the editor, the
 * staff preview and (in #131) the public article reader. It only consumes
 * PresetCardData, which is built exclusively from public catalog rows, so
 * no code path can render private recipe/version data.
 */

const TYPE_LABEL: Record<PresetCardData["type"], string> = {
  filter: "Filter",
  poster: "Poster",
};

interface PresetCardProps {
  /** null = the referenced preset is no longer public → safe fallback. */
  preset: PresetCardData | null;
  variant?: "card" | "compact";
  /** True when the block pins a version that is no longer public — readers
   * see the current version; we just note it. */
  pinnedVersionStale?: boolean;
  /** Extra analytics context (e.g. articleId) merged into the click event. */
  analyticsProps?: Record<string, unknown>;
  className?: string;
}

function PresetMedia({
  preset,
  className,
}: {
  preset: PresetCardData;
  className?: string;
}) {
  if (preset.videoUrl) {
    return (
      <video
        src={preset.videoUrl}
        poster={preset.imageUrl ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        aria-label={`Preview for ${preset.name}`}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  if (preset.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote public storage URL
      <img
        src={preset.imageUrl}
        alt={`Preview for ${preset.name}`}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "bg-charcoal-800 flex h-full w-full items-center justify-center",
        className
      )}
      aria-hidden="true"
    >
      <ImageBroken size={22} className="text-text-muted" />
    </span>
  );
}

function PresetUnavailable({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border bg-charcoal-850/60 flex items-center gap-3 rounded-xl border border-dashed px-4 py-3.5",
        className
      )}
      role="note"
      aria-label="Preset no longer available"
    >
      <span className="bg-charcoal-800 flex size-10 shrink-0 items-center justify-center rounded-lg">
        <ImageBroken size={18} className="text-text-muted" />
      </span>
      <div className="min-w-0">
        <p className="text-cream-100 text-sm font-medium">
          This preset is no longer available
        </p>
        <p className="text-text-muted mt-0.5 text-xs">
          The look it linked to has been retired.
        </p>
      </div>
    </div>
  );
}

export function ArticlePresetCard({
  preset,
  variant = "card",
  pinnedVersionStale = false,
  analyticsProps,
  className,
}: PresetCardProps) {
  if (!preset) return <PresetUnavailable className={className} />;

  const onCtaClick = () =>
    trackEvent({
      event: "article_preset_click",
      props: {
        preset_id: preset.productId,
        slug: preset.slug,
        ...analyticsProps,
      },
    });

  if (variant === "compact") {
    return (
      <Link
        href={preset.href}
        prefetch={false}
        onClick={onCtaClick}
        className={cn(
          "border-border bg-charcoal-850 hover:border-lime-400/40 group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400",
          className
        )}
      >
        <span className="bg-charcoal-800 relative size-11 shrink-0 overflow-hidden rounded-lg">
          <PresetMedia preset={preset} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-cream-50 block truncate text-sm font-semibold">
            {preset.name}
          </span>
          <span className="text-text-muted text-xs">
            {TYPE_LABEL[preset.type]} · {preset.creditCost} credits
          </span>
        </span>
        <span className="text-text-secondary group-hover:text-lime-300 inline-flex shrink-0 items-center gap-1 text-xs font-medium">
          Try this look
          <ArrowUpRight size={13} />
        </span>
      </Link>
    );
  }

  return (
    <figure
      className={cn(
        "border-border bg-charcoal-850 overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="bg-charcoal-800 relative aspect-[16/9] overflow-hidden">
        <PresetMedia preset={preset} />
        <span className="bg-ink-950/70 text-cream-50 absolute top-2.5 left-2.5 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
          {TYPE_LABEL[preset.type]}
        </span>
      </div>
      <figcaption className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-cream-50 truncate text-sm font-semibold">
            {preset.name}
          </p>
          {preset.shortDescription && (
            <p className="text-text-secondary mt-0.5 line-clamp-2 text-[13px]">
              {preset.shortDescription}
            </p>
          )}
          <p className="text-text-muted mt-1.5 text-xs">
            {preset.creditCost} credits
            {preset.categoryName ? ` · ${preset.categoryName}` : ""}
            {pinnedVersionStale ? " · Shows the current version" : ""}
          </p>
        </div>
        <Link
          href={preset.href}
          prefetch={false}
          onClick={onCtaClick}
          className="text-ink-950 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-lime-400 px-3.5 py-2 text-[13px] font-semibold transition-colors hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
        >
          <Lightning size={14} weight="fill" />
          Try this look
        </Link>
      </figcaption>
    </figure>
  );
}
