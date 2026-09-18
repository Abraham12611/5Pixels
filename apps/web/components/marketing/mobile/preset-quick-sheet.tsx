"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/dialog";
import type { LandingFeedItem } from "./landing-feed-types";

/**
 * Mobile quick-view sheet: tapping a preset card in the landing feed opens this
 * bottom sheet instead of navigating — preview first, one tap into the studio.
 * Anonymous users can upload before any account prompt; sign-in is deferred to
 * Generate.
 */
export function PresetQuickSheet({
  item,
  onClose,
}: {
  item: LandingFeedItem | null;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(Boolean(item), panelRef);

  if (!item) return null;

  const examples = item.exampleUrls.slice(0, 3);

  return (
    <div
      ref={overlayRef}
      role="presentation"
      className="bg-ink-950/80 animate-overlay-in fixed inset-0 z-50 flex items-end justify-center lg:hidden"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} preview`}
        tabIndex={-1}
        className="border-cream-100/10 bg-charcoal-850 animate-sheet-in max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-x border-t px-5 pb-8 pt-3 outline-none"
      >
        <div
          aria-hidden
          className="bg-charcoal-700 mx-auto mb-4 h-1 w-10 rounded-full"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="text-text-secondary hover:text-cream-50 absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-800 transition-colors"
        >
          <X size={16} weight="bold" />
        </button>

        <div className="flex items-center gap-3">
          {item.thumbUrl ? (
            <span className="media-frame relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={item.thumbUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="font-display text-cream-50 truncate text-xl">
              {item.name}
            </h3>
            {item.shortDescription ? (
              <p className="text-text-secondary mt-0.5 line-clamp-2 text-[13px]">
                {item.shortDescription}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
          {item.categoryName ? (
            <span className="bg-charcoal-800 text-text-secondary rounded-full px-2.5 py-1">
              {item.categoryName}
            </span>
          ) : null}
          <span className="bg-charcoal-800 text-text-secondary rounded-full px-2.5 py-1 capitalize">
            {item.type}
          </span>
          <span className="text-lime-400 bg-lime-400/10 rounded-full px-2.5 py-1">
            {item.creditCost} {item.creditCost === 1 ? "credit" : "credits"}
          </span>
        </div>

        {examples.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {examples.map((url, i) => (
              <span
                key={url}
                className="media-frame relative aspect-[4/5] overflow-hidden rounded-lg"
              >
                <Image
                  src={url}
                  alt={`${item.name} example ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          <Button asChild variant="brand" size="lg" className="w-full">
            <Link href={`/app/create/${item.slug}`}>Upload a photo</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/presets/${item.slug}`}>
              See all examples
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </Button>
          <p className="text-text-muted pt-1 text-center text-[11px]">
            No account needed to preview — sign in only when you generate.
          </p>
        </div>
      </div>
    </div>
  );
}
