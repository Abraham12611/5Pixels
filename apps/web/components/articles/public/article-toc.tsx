"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ArticleTocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Article table of contents (#131). Two renderings of the same data:
 *   ArticleTocRail       — sticky desktop rail with scroll-spy highlighting
 *   ArticleTocDisclosure — compact collapsible <details> for mobile
 * Both navigate by anchor; headings carry scroll-mt so the sticky header
 * never covers the target.
 */
function useActiveHeading(entries: ArticleTocItem[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(
    entries[0]?.id ?? null
  );

  useEffect(() => {
    if (entries.length === 0) return;
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The topmost visible heading wins; when nothing is visible (e.g.
        // scrolled between sections) keep the last known position by picking
        // the last heading above the viewport.
        let next: string | null = null;
        for (const h of headings) {
          if (visible.has(h.id)) {
            next = h.id;
            break;
          }
          const rect = h.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.4) next = h.id;
        }
        if (next) setActiveId(next);
      },
      // Active band just below the sticky header.
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 }
    );
    for (const h of headings) observer.observe(h);
    return () => observer.disconnect();
  }, [entries]);

  return activeId;
}

function TocLink({
  entry,
  active,
  onNavigate,
}: {
  entry: ArticleTocItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={`#${entry.id}`}
      onClick={onNavigate}
      aria-current={active ? "location" : undefined}
      className={cn(
        "block truncate border-l-2 py-1.5 pr-2 pl-3 text-[13px] leading-snug transition-colors",
        entry.level >= 2 && "pl-6",
        entry.level >= 3 && "pl-9",
        active
          ? "border-lime-500 text-cream-50 font-medium"
          : "text-text-secondary hover:text-cream-100 border-transparent"
      )}
    >
      {entry.text}
    </a>
  );
}

export function ArticleTocRail({ entries }: { entries: ArticleTocItem[] }) {
  const activeId = useActiveHeading(entries);
  if (entries.length === 0) return null;
  return (
    <nav aria-label="Article contents" className="text-sm">
      <p className="text-text-muted mb-3 text-[11px] font-semibold tracking-wider uppercase">
        Contents
      </p>
      <div className="max-h-[70vh] space-y-0.5 overflow-y-auto">
        {entries.map((entry) => (
          <TocLink
            key={entry.id}
            entry={entry}
            active={entry.id === activeId}
          />
        ))}
      </div>
    </nav>
  );
}

export function ArticleTocDisclosure({
  entries,
}: {
  entries: ArticleTocItem[];
}) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="border-cream-100/10 bg-charcoal-850 rounded-xl border"
    >
      <summary className="text-cream-100 focus-visible:ring-lime-500/70 flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        On this page
        <CaretDown
          size={16}
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        />
      </summary>
      <nav aria-label="Article contents" className="px-2 pb-3">
        {entries.map((entry) => (
          <TocLink
            key={entry.id}
            entry={entry}
            active={false}
            onNavigate={() => setOpen(false)}
          />
        ))}
      </nav>
    </details>
  );
}
