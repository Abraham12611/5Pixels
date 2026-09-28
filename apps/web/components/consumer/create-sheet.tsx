"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClockCounterClockwise, Compass } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/sheet";
import { loadStudioDraft } from "@/lib/anonymous-draft";
import { getRecentPresets, type RecentPreset } from "@/lib/search/recents";

/**
 * The five-slot tab bar's center action (04 §3, 20 Q2): Create opens a
 * chooser, not another link to /explore. Contents are intentionally client-
 * sourced — recents live in localStorage, the resumable draft in IndexedDB —
 * so the sheet stays instant and never flashes a skeleton.
 */
export function CreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [recents, setRecents] = useState<RecentPreset[]>([]);
  const [draftSlug, setDraftSlug] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);

  // Refresh recents each time the sheet opens — render-phase adjust (no
  // effect). Safe here: the nav always mounts closed, so this never runs
  // during SSR.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setRecents(getRecentPresets());
      setDraftSlug(null);
    }
  }

  // The draft lives in IndexedDB — async, so it loads in an effect and can
  // appear a tick after open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadStudioDraft().then((draft) => {
      if (!cancelled) setDraftSlug(draft?.slug ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = () => onOpenChange(false);
  const draftPreset = draftSlug
    ? recents.find((r) => r.slug === draftSlug)
    : undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      tier="content"
      title="Create"
      showClose
      bodyClassName="px-5 pb-2"
    >
      <div className="space-y-5">
        {draftSlug && (
          <Link
            href={`/app/create/${draftSlug}?draft=1`}
            onClick={close}
            className="border-lime-500/20 bg-lime-500/10 flex items-center gap-3 rounded-xl border px-3 py-3 transition active:scale-[0.99]"
          >
            <span className="bg-lime-400/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <ClockCounterClockwise
                size={18}
                weight="bold"
                className="text-lime-400"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-cream-50 block truncate text-sm font-semibold">
                Resume your last setup
              </span>
              <span className="text-text-secondary block truncate text-xs">
                {draftPreset
                  ? `${draftPreset.name} — we kept your photo and settings`
                  : "We kept your photo and settings"}
              </span>
            </span>
            <ArrowRight
              size={16}
              weight="bold"
              className="text-lime-400 shrink-0"
            />
          </Link>
        )}

        {recents.length > 0 && (
          <section>
            <h3 className="text-text-secondary mb-2 text-xs font-medium tracking-wide uppercase">
              Recent looks
            </h3>
            <ul className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
              {recents.map((p) => (
                <li key={p.slug} className="w-20 shrink-0">
                  <Link
                    href={`/app/create/${p.slug}`}
                    onClick={close}
                    className="block"
                  >
                    <span className="border-cream-100/10 bg-charcoal-800 block aspect-[4/5] overflow-hidden rounded-lg border">
                      {p.thumbUrl && (
                        <Image
                          src={p.thumbUrl}
                          alt=""
                          width={80}
                          height={100}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      )}
                    </span>
                    <span className="text-text-secondary mt-1.5 block truncate text-xs font-medium">
                      {p.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href="/explore"
          onClick={close}
          className="border-cream-100/10 bg-charcoal-800 hover:bg-charcoal-750 flex items-center gap-3 rounded-xl border px-3 py-3 transition active:scale-[0.99]"
        >
          <span className="bg-cream-100/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <Compass size={18} weight="bold" className="text-cream-50" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-cream-50 block text-sm font-semibold">
              Browse all looks
            </span>
            <span className="text-text-secondary block text-xs">
              Every filter and poster in the catalog
            </span>
          </span>
          <ArrowRight
            size={16}
            weight="bold"
            className="text-text-muted shrink-0"
          />
        </Link>
      </div>
    </Sheet>
  );
}
