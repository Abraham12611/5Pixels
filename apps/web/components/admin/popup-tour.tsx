"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Desktop,
  List,
  MonitorPlay,
  Play,
  Square,
  DeviceMobile,
  X,
} from "@phosphor-icons/react";
import {
  POPUP_CATEGORIES,
  POPUP_REGISTRY,
  type PopupEntry,
} from "@/lib/ui-review/registry";
import {
  UiReviewProvider,
  UiReviewViewportProvider,
  type UiReviewViewport,
} from "@/lib/ui-review/context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLAY_INTERVAL_MS = 4000;

/**
 * Admin popup inspector — mounts every overlay in the registry inertly so the
 * whole overlay family can be reviewed in one pass. Prev/Next steps the tour;
 * Play advances on a timer; the viewport toggle forces media-query-forked
 * surfaces into their desktop or mobile presentation.
 */
export function PopupTour() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [touring, setTouring] = useState(false);
  const [viewport, setViewport] = useState<UiReviewViewport>("desktop");
  const [mountKey, setMountKey] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const entry: PopupEntry = POPUP_REGISTRY[index]!;
  const total = POPUP_REGISTRY.length;

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(total - 1, next)));
      setMountKey((k) => k + 1);
    },
    [total]
  );

  const startTour = useCallback(() => {
    setIndex(0);
    setMountKey((k) => k + 1);
    setTouring(true);
  }, []);

  const endTour = useCallback(() => {
    setTouring(false);
    setPlaying(false);
  }, []);

  // Auto-advance while playing; pause on the last entry.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setIndex((i) => {
        if (i >= total - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
      setMountKey((k) => k + 1);
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(t);
  }, [playing, total]);

  // Arrow keys step the tour — skip when typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Escape" && touring) {
        endTour();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, touring, endTour]);

  // Keep the active sidebar row in view.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-entry="${entry.id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [entry.id]);

  const grouped = useMemo(
    () =>
      POPUP_CATEGORIES.map((category) => ({
        category,
        entries: POPUP_REGISTRY.map((e, i) => ({ e, i })).filter(
          ({ e }) => e.category === category
        ),
      })).filter((g) => g.entries.length > 0),
    []
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-cream-50 font-display text-xl font-semibold">
            Popup inspector
          </h1>
          <p className="text-text-secondary mt-1 text-sm">
            Every overlay, mounted with inert fixtures — nothing writes,
            submits, or records analytics. Use ← → to step.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PopupTourJumpMenu
            entries={POPUP_REGISTRY}
            index={index}
            onSelect={go}
          />
          <div className="border-cream-100/10 bg-charcoal-850 flex items-center rounded-lg border p-0.5">
            {(
              [
                ["desktop", "Desktop", Desktop],
                ["mobile", "Mobile", DeviceMobile],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewport(v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewport === v
                    ? "bg-charcoal-800 text-cream-50"
                    : "text-text-muted hover:text-cream-100"
                )}
              >
                <Icon size={14} weight="bold" />
                {label}
              </button>
            ))}
          </div>
          <Button variant="brand" size="sm" onClick={startTour}>
            <MonitorPlay size={14} weight="bold" />
            Start tour
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Sidebar */}
        <div
          ref={listRef}
          className="border-cream-100/10 bg-charcoal-850 hidden w-64 shrink-0 overflow-y-auto rounded-xl border md:block"
        >
          {grouped.map(({ category, entries }) => (
            <div key={category}>
              <p className="text-text-muted sticky top-0 bg-charcoal-850/95 px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">
                {category}
              </p>
              <ul className="px-1.5 pb-2">
                {entries.map(({ e, i }) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      data-entry={e.id}
                      onClick={() => go(i)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
                        i === index
                          ? "bg-lime-500/10 text-lime-300"
                          : "text-text-secondary hover:bg-charcoal-800 hover:text-cream-50"
                      )}
                    >
                      <span className="text-text-muted w-5 shrink-0 text-right text-[11px] tabular-nums">
                        {i + 1}
                      </span>
                      <span className="truncate">{e.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Stage */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-cream-100/10 bg-charcoal-900 relative min-h-[60vh] flex-1 overflow-hidden rounded-2xl border">
            {/* Entry label */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <span className="bg-charcoal-850/90 border-cream-100/10 text-cream-100 rounded-md border px-2 py-1 text-xs font-medium backdrop-blur">
                {index + 1} / {total} — {entry.title}
              </span>
              <span className="bg-charcoal-850/90 border-cream-100/10 text-text-muted hidden rounded-md border px-2 py-1 text-[11px] backdrop-blur sm:inline">
                {entry.category}
              </span>
            </div>

            <div className="flex h-full items-center justify-center p-6 pt-12">
              <UiReviewProvider value={true}>
                <UiReviewViewportProvider value={viewport}>
                  {/* Safety net: any declarative form submit inside a preview
                      surface is cancelled before it can POST. */}
                  <div
                    className="contents"
                    onSubmitCapture={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Fragment key={`${entry.id}-${mountKey}`}>
                      {entry.render()}
                    </Fragment>
                  </div>
                </UiReviewViewportProvider>
              </UiReviewProvider>
            </div>
          </div>

          {entry.note && (
            <p className="text-text-muted mt-3 text-center text-xs">
              {entry.note}
            </p>
          )}
        </div>
      </div>

      {/* Tour control bar — sits above overlays */}
      {touring && (
        <div className="bg-charcoal-850/95 border-cream-100/15 fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border px-2 py-2 shadow-xl backdrop-blur">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous surface"
          >
            <ArrowLeft size={15} weight="bold" />
          </Button>
          <span className="text-cream-50 min-w-16 text-center text-xs font-semibold tabular-nums">
            {index + 1} / {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(index + 1)}
            disabled={index === total - 1}
            aria-label="Next surface"
          >
            <ArrowRight size={15} weight="bold" />
          </Button>
          <span className="bg-cream-100/10 mx-1 h-5 w-px" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause tour" : "Play all"}
          >
            {playing ? (
              <Square size={14} weight="fill" />
            ) : (
              <Play size={14} weight="fill" />
            )}
            <span className="text-xs">{playing ? "Pause" : "Play"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={endTour}
            aria-label="End tour"
          >
            <X size={15} weight="bold" />
          </Button>
        </div>
      )}

      {/* Compact nav when not touring */}
      {!touring && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => go(index - 1)}
            disabled={index === 0}
          >
            <ArrowLeft size={14} weight="bold" />
            Prev
          </Button>
          <span className="text-text-muted text-xs tabular-nums">
            {index + 1} of {total}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => go(index + 1)}
            disabled={index === total - 1}
          >
            Next
            <ArrowRight size={14} weight="bold" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Sidebar entry list rendered for narrow screens — a jump menu. */
export function PopupTourJumpMenu({
  entries,
  index,
  onSelect,
}: {
  entries: PopupEntry[];
  index: number;
  onSelect: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative md:hidden">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((o) => !o)}
      >
        <List size={14} weight="bold" />
        All surfaces
      </Button>
      {open && (
        <div className="bg-charcoal-850 border-cream-100/10 absolute top-full left-0 z-20 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border p-1.5 shadow-xl">
          {entries.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                onSelect(i);
                setOpen(false);
              }}
              className={cn(
                "w-full rounded-lg px-2 py-1.5 text-left text-[13px]",
                i === index ? "text-lime-300" : "text-text-secondary"
              )}
            >
              {i + 1}. {e.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
